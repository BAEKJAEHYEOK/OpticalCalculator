// 렌즈 대분류 계산기.
// 모든 compute 는 순수 함수 — UI 를 참조하지 않으므로 단독 검증이 가능하다.

import { LAMBDA_UM, STANDARD_FOCAL_LENGTHS } from '../core/units.js';

// 센서 물리 크기(mm). 포맷 프리셋(1/2", 2/3" 등)보다 픽셀 기반 계산이 정확하다.
const sensorSize = (wpx, hpx, pixelUm) => ({
  w: (wpx * pixelUm) / 1000,
  h: (hpx * pixelUm) / 1000,
  diag: (Math.hypot(wpx, hpx) * pixelUm) / 1000,
});

// 대상을 가로·세로 모두 담으려면 두 축의 요구 배율 중 작은 쪽을 써야 한다.
// 큰 쪽을 쓰면 반대 축이 시야를 벗어난다.
function limitingMagnification(sensor, fovW, fovH) {
  const mW = sensor.w / fovW;
  const mH = sensor.h / fovH;
  return mW <= mH ? { m: mW, axis: '가로' } : { m: mH, axis: '세로' };
}

// 피사계심도. 허용착란원 c 는 픽셀 크기의 배수로 잡는 것이 머신비전 관례다.
function depthOfField(m, fNumber, cocUm) {
  if (!(m > 0)) return { dof: null, focusDepthUm: null };
  const dofUm = (2 * fNumber * cocUm * (1 + m)) / (m * m);
  return { dof: dofUm / 1000, focusDepthUm: 2 * fNumber * cocUm };
}

// 회절 한계 스팟(에어리 디스크) 지름. 픽셀보다 커지면 조리개를 과하게 조인 것이다.
const airyDiameterUm = (fNumber, m) => 2.44 * LAMBDA_UM * fNumber * (1 + m);

function opticalWarnings(m, fNumber, pixelUm, imageCircle, sensorDiag) {
  const warns = [];
  const airy = airyDiameterUm(fNumber, m);
  if (airy > pixelUm) {
    warns.push({
      level: 'warn',
      text: '회절 한계 스팟 ' + airy.toFixed(2) + ' µm 가 픽셀 ' + pixelUm +
        ' µm 보다 큽니다. F수를 낮추지 않으면 해상력이 픽셀이 아니라 회절에 묶입니다.',
    });
  }
  if (imageCircle > 0 && sensorDiag && imageCircle < sensorDiag) {
    warns.push({
      level: 'danger',
      text: '렌즈 이미지 서클 ' + imageCircle + ' mm 가 센서 대각 ' + sensorDiag.toFixed(2) +
        ' mm 보다 작습니다. 모서리 비네팅이 발생합니다.',
    });
  }
  return warns;
}

// 계산된 초점거리에 가장 가까운 표준 렌즈를 고르고, 그 렌즈를 실제로 썼을 때를 역산한다.
function nearestStandard(f, sensor, wd) {
  const pick = STANDARD_FOCAL_LENGTHS.reduce(
    (best, cur) => (Math.abs(cur - f) < Math.abs(best - f) ? cur : best),
    STANDARD_FOCAL_LENGTHS[0]
  );
  if (wd <= pick) return { f: pick, fovW: null, fovH: null };
  const m = pick / (wd - pick);
  return { f: pick, fovW: sensor.w / m, fovH: sensor.h / m };
}

// en 은 화면에 국문 라벨과 함께 표시되는 통용 영문 용어다.
// 렌즈 스펙시트가 전부 영문이라 대조하며 쓰려면 둘 다 보여야 한다.
const SENSOR_INPUTS = [
  { key: 'wpx', label: '가로 화소수', en: 'Width', unit: 'px', profile: 'sensorWpx', min: 1, step: 1 },
  { key: 'hpx', label: '세로 화소수', en: 'Height', unit: 'px', profile: 'sensorHpx', min: 1, step: 1 },
  { key: 'pixelUm', label: '픽셀 크기', en: 'Pixel Size', unit: 'µm', profile: 'pixelSize', min: 0.1, step: 0.1 },
  { key: 'fNumber', label: 'F수', en: 'F-number', unit: '', profile: 'fNumber', min: 0.7, step: 0.1 },
];

const SHARED_OUTPUTS = [
  { key: 'm', label: '배율', en: 'Magnification', unit: '×', digits: 4 },
  { key: 'umPerPx', label: '해상도', en: 'Resolution', unit: 'µm/px', digits: 2 },
  { key: 'dof', label: '피사계심도', en: 'DOF', unit: 'mm', digits: 2 },
  { key: 'sensorW', label: '센서 가로', en: 'Sensor W', unit: 'mm', digits: 2 },
  { key: 'sensorH', label: '센서 세로', en: 'Sensor H', unit: 'mm', digits: 2 },
  { key: 'airy', label: '회절 스팟', en: 'Airy Disk', unit: 'µm', digits: 2 },
];

// 배율이 정해진 뒤의 공통 파생값. 세 모드가 같은 지표를 보여줘야 서로 비교가 된다.
function derive(m, sensor, pixelUm, fNumber) {
  const { dof } = depthOfField(m, fNumber, pixelUm * 2);
  return {
    m,
    umPerPx: pixelUm / m,
    dof,
    sensorW: sensor.w,
    sensorH: sensor.h,
    airy: airyDiameterUm(fNumber, m),
  };
}

export const lensCalculators = [
  {
    id: 'lens-select',
    category: 'lens',
    name: '렌즈 선정',
    en: 'Lens Selection',
    summary: 'Sensor · FOV · WD 중 둘을 알 때 나머지 하나를 구합니다',
    tags: ['초점거리', 'FOV', 'WD', '배율', 'focal length', 'field of view'],
    related: ['dof', 'resolution'],
    modes: [
      {
        id: 'f',
        name: '초점거리 구하기',
        en: 'Focal Length',
        formula: 'f = WD × S / (FOV + S),   m = S / FOV',
        inputs: [
          ...SENSOR_INPUTS,
          { key: 'fovW', label: '시야 가로', en: 'FOV W', unit: 'mm', default: 120, min: 0.01 },
          { key: 'fovH', label: '시야 세로', en: 'FOV H', unit: 'mm', default: 90, min: 0.01 },
          { key: 'wd', label: '작동거리', en: 'WD', unit: 'mm', profile: 'workingDistance', min: 1 },
          { key: 'imageCircle', label: '이미지 서클', en: 'Image Circle', unit: 'mm', default: 0, min: 0, optional: true },
        ],
        outputs: [
          { key: 'f', label: '필요 초점거리', en: 'Focal Length', unit: 'mm', digits: 2, primary: true },
          { key: 'actualFovW', label: '실제 시야 가로', en: 'Actual FOV W', unit: 'mm', digits: 1 },
          { key: 'actualFovH', label: '실제 시야 세로', en: 'Actual FOV H', unit: 'mm', digits: 1 },
          ...SHARED_OUTPUTS,
        ],
        compute(v) {
          const sensor = sensorSize(v.wpx, v.hpx, v.pixelUm);
          const { m, axis } = limitingMagnification(sensor, v.fovW, v.fovH);
          return {
            ...derive(m, sensor, v.pixelUm, v.fNumber),
            f: (v.wd * m) / (1 + m),
            actualFovW: sensor.w / m,
            actualFovH: sensor.h / m,
            _axis: axis,
            _sensor: sensor,
          };
        },
        warn(v, o) {
          const warns = opticalWarnings(o.m, v.fNumber, v.pixelUm, v.imageCircle, o._sensor.diag);
          const std = nearestStandard(o.f, o._sensor, v.wd);
          if (std.fovW) {
            warns.push({
              level: 'info',
              text: o._axis + '축이 제약입니다. 가장 가까운 표준 렌즈 ' + std.f + ' mm 사용 시 실제 시야는 ' +
                std.fovW.toFixed(1) + ' × ' + std.fovH.toFixed(1) + ' mm 입니다.',
            });
          }
          return warns;
        },
      },
      {
        id: 'fov',
        name: '시야 구하기',
        en: 'FOV',
        formula: 'm = f / (WD − f),   FOV = S / m',
        inputs: [
          ...SENSOR_INPUTS,
          { key: 'f', label: '초점거리', en: 'Focal Length', unit: 'mm', profile: 'focalLength', min: 1 },
          { key: 'wd', label: '작동거리', en: 'WD', unit: 'mm', profile: 'workingDistance', min: 1 },
          { key: 'imageCircle', label: '이미지 서클', en: 'Image Circle', unit: 'mm', default: 0, min: 0, optional: true },
        ],
        outputs: [
          { key: 'fovW', label: '시야 가로', en: 'FOV W', unit: 'mm', digits: 1, primary: true },
          { key: 'fovH', label: '시야 세로', en: 'FOV H', unit: 'mm', digits: 1, primary: true },
          ...SHARED_OUTPUTS,
        ],
        compute(v) {
          const sensor = sensorSize(v.wpx, v.hpx, v.pixelUm);
          const m = v.f / (v.wd - v.f);
          return {
            ...derive(m, sensor, v.pixelUm, v.fNumber),
            fovW: sensor.w / m,
            fovH: sensor.h / m,
            _sensor: sensor,
          };
        },
        warn(v, o) {
          if (v.wd <= v.f) {
            return [{
              level: 'danger',
              text: '작동거리가 초점거리보다 짧거나 같습니다. 결상되지 않는 조건입니다.',
            }];
          }
          return opticalWarnings(o.m, v.fNumber, v.pixelUm, v.imageCircle, o._sensor.diag);
        },
      },
      {
        id: 'wd',
        name: '작동거리 구하기',
        en: 'WD',
        formula: 'm = S / FOV,   WD = f × (1 + m) / m',
        inputs: [
          ...SENSOR_INPUTS,
          { key: 'f', label: '초점거리', en: 'Focal Length', unit: 'mm', profile: 'focalLength', min: 1 },
          { key: 'fovW', label: '시야 가로', en: 'FOV W', unit: 'mm', default: 120, min: 0.01 },
          { key: 'fovH', label: '시야 세로', en: 'FOV H', unit: 'mm', default: 90, min: 0.01 },
          { key: 'imageCircle', label: '이미지 서클', en: 'Image Circle', unit: 'mm', default: 0, min: 0, optional: true },
        ],
        outputs: [
          { key: 'wd', label: '필요 작동거리', en: 'WD', unit: 'mm', digits: 1, primary: true },
          { key: 'actualFovW', label: '실제 시야 가로', en: 'Actual FOV W', unit: 'mm', digits: 1 },
          { key: 'actualFovH', label: '실제 시야 세로', en: 'Actual FOV H', unit: 'mm', digits: 1 },
          ...SHARED_OUTPUTS,
        ],
        compute(v) {
          const sensor = sensorSize(v.wpx, v.hpx, v.pixelUm);
          const { m, axis } = limitingMagnification(sensor, v.fovW, v.fovH);
          return {
            ...derive(m, sensor, v.pixelUm, v.fNumber),
            wd: (v.f * (1 + m)) / m,
            actualFovW: sensor.w / m,
            actualFovH: sensor.h / m,
            _axis: axis,
            _sensor: sensor,
          };
        },
        warn(v, o) {
          const warns = opticalWarnings(o.m, v.fNumber, v.pixelUm, v.imageCircle, o._sensor.diag);
          warns.push({ level: 'info', text: o._axis + '축이 제약입니다.' });
          return warns;
        },
      },
    ],
  },

  {
    id: 'dof',
    category: 'lens',
    name: '피사계심도',
    en: 'Depth of Field',
    summary: 'Magnification 과 F-number 로 초점이 맞는 깊이 범위를 구합니다',
    tags: ['DOF', '심도', '착란원', 'depth of field', 'CoC', '초점심도'],
    related: ['lens-select', 'resolution'],
    formula: 'DOF = 2 · N · c · (1 + m) / m²,   c = Pixel Size × 배수',
    inputs: [
      { key: 'm', label: '배율', en: 'Magnification', unit: '×', default: 0.192, min: 0.0001, step: 0.001 },
      { key: 'fNumber', label: 'F수', en: 'F-number', unit: '', profile: 'fNumber', min: 0.7, step: 0.1 },
      { key: 'pixelUm', label: '픽셀 크기', en: 'Pixel Size', unit: 'µm', profile: 'pixelSize', min: 0.1, step: 0.1 },
      { key: 'cocMult', label: '착란원 배수', en: 'CoC ×Pixel', unit: '', default: 2, min: 0.5, step: 0.5 },
    ],
    outputs: [
      { key: 'dof', label: '피사계심도', en: 'DOF', unit: 'mm', digits: 3, primary: true },
      { key: 'nearHalf', label: '전방 ½', en: 'Near', unit: 'mm', digits: 3 },
      { key: 'farHalf', label: '후방 ½', en: 'Far', unit: 'mm', digits: 3 },
      { key: 'coc', label: '허용 착란원', en: 'CoC', unit: 'µm', digits: 2 },
      { key: 'focusDepth', label: '초점심도 (센서측)', en: 'Depth of Focus', unit: 'µm', digits: 2 },
      { key: 'airy', label: '회절 스팟', en: 'Airy Disk', unit: 'µm', digits: 2 },
    ],
    compute(v) {
      const coc = v.pixelUm * v.cocMult;
      const { dof, focusDepthUm } = depthOfField(v.m, v.fNumber, coc);
      return {
        dof,
        // 근축 근사에서 전후는 대칭이다. 저배율에서는 실제로 후방이 더 길다.
        nearHalf: dof / 2,
        farHalf: dof / 2,
        coc,
        focusDepth: focusDepthUm,
        airy: airyDiameterUm(v.fNumber, v.m),
      };
    },
    warn(v, o) {
      const warns = [];
      if (o.airy > o.coc) {
        warns.push({
          level: 'warn',
          text: '회절 스팟 ' + o.airy.toFixed(2) + ' µm 가 허용 착란원 ' + o.coc.toFixed(2) +
            ' µm 를 넘습니다. F수를 더 조여도 심도가 늘지 않고 해상력만 떨어집니다.',
        });
      }
      if (v.m < 0.02) {
        warns.push({
          level: 'info',
          text: '배율이 매우 낮습니다. 이 영역은 근축 근사 오차가 커지므로 참고값으로 쓰세요.',
        });
      }
      return warns;
    },
  },

  {
    id: 'resolution',
    category: 'lens',
    name: '해상도 · 검출 한계',
    en: 'Resolution',
    summary: 'FOV 와 화소수로 픽셀당 실제 치수와 검출 가능한 최소 결함 크기를 구합니다',
    tags: ['해상도', 'µm/px', '검출', '나이퀴스트', 'resolution', 'nyquist'],
    related: ['lens-select', 'dof'],
    formula: 'µm/px = FOV(mm) × 1000 / 화소수,   Detection Limit = µm/px × N',
    inputs: [
      { key: 'fovW', label: '시야 가로', en: 'FOV W', unit: 'mm', default: 120, min: 0.01 },
      { key: 'fovH', label: '시야 세로', en: 'FOV H', unit: 'mm', default: 90, min: 0.01 },
      { key: 'wpx', label: '가로 화소수', en: 'Width', unit: 'px', profile: 'sensorWpx', min: 1, step: 1 },
      { key: 'hpx', label: '세로 화소수', en: 'Height', unit: 'px', profile: 'sensorHpx', min: 1, step: 1 },
      { key: 'minPixels', label: '결함 판정 픽셀수', en: 'Pixels on Defect', unit: 'px', default: 3, min: 1, step: 1 },
    ],
    outputs: [
      { key: 'umPerPxW', label: '가로 해상도', en: 'Resolution W', unit: 'µm/px', digits: 2, primary: true },
      { key: 'umPerPxH', label: '세로 해상도', en: 'Resolution H', unit: 'µm/px', digits: 2, primary: true },
      { key: 'detectLimit', label: '검출 한계', en: 'Detection Limit', unit: 'µm', digits: 1 },
      { key: 'nyquist', label: '나이퀴스트 한계', en: 'Nyquist Limit', unit: 'µm', digits: 1 },
      { key: 'aspectSensor', label: '화소 종횡비', en: 'Sensor Aspect', unit: '', digits: 3 },
      { key: 'aspectFov', label: '시야 종횡비', en: 'FOV Aspect', unit: '', digits: 3 },
    ],
    compute(v) {
      const umPerPxW = (v.fovW * 1000) / v.wpx;
      const umPerPxH = (v.fovH * 1000) / v.hpx;
      const worst = Math.max(umPerPxW, umPerPxH);
      return {
        umPerPxW,
        umPerPxH,
        detectLimit: worst * v.minPixels,
        nyquist: worst * 2,
        aspectSensor: v.wpx / v.hpx,
        aspectFov: v.fovW / v.fovH,
      };
    },
    warn(v, o) {
      const warns = [];
      const skew = Math.abs(o.umPerPxW - o.umPerPxH) / Math.max(o.umPerPxW, o.umPerPxH);
      if (skew > 0.02) {
        warns.push({
          level: 'warn',
          text: '가로·세로 해상도가 ' + (skew * 100).toFixed(1) +
            ' % 어긋납니다. 시야 종횡비와 화소 종횡비가 달라 한 축에 여백이 생긴다는 뜻입니다.',
        });
      }
      if (v.minPixels < 3) {
        warns.push({
          level: 'warn',
          text: '결함 판정 픽셀수가 3 미만입니다. 나이퀴스트 기준상 안정적인 검출을 보장하기 어렵습니다.',
        });
      }
      return warns;
    },
  },
];
