// 렌즈 대분류 - 현장 계산기.
// 장비를 고르고 조건을 확인할 때 쓰는 것들. 설계용 공식은 lens-design.js 에 있다.

import { depthRange, pixelGrid, fovRect, focusDepthView } from '../core/diagram.js';
import { LAMBDA_UM } from '../core/units.js';
import {
  sensorSize,
  limitingMagnification,
  depthOfField,
  airyDiameterUm,
  effectiveFNumber,
  opticalWarnings,
  nearestStandard,
  SENSOR_INPUTS,
  SHARED_OUTPUTS,
  derive,
  layoutDiagrams,
} from './shared.js';

export const lensCalculators = [
  {
    id: 'lens-select',
    category: 'lens',
    name: '렌즈 선정',
    en: 'Lens Selection',
    summary: '센서 · FOV · 작동거리 중 둘을 알 때 나머지 하나를 구합니다',
    tags: ['초점거리', 'FOV', 'WD', '배율', 'focal length', 'field of view'],
    related: ['dof', 'resolution'],
    modes: [
      {
        id: 'f',
        name: '초점거리 계산',
        en: 'Focal Length',
        formula: [
          '배율 (W) = 센서 크기 (W) / FOV (W)',
          '배율 (H) = 센서 크기 (H) / FOV (H)',
          '배율 = 둘 중 작은 쪽 — 그 축이 제약축입니다',
          '초점거리 = WD × 배율 / (1 + 배율)',
        ],
        inputs: [
          ...SENSOR_INPUTS,
          { key: 'fovW', label: 'FOV (W)', en: 'Field of View (W)', unit: 'mm', default: 120, min: 0.01 },
          { key: 'fovH', label: 'FOV (H)', en: 'Field of View (H)', unit: 'mm', default: 90, min: 0.01 },
          { key: 'wd', label: 'WD', en: 'Working Distance', unit: 'mm', profile: 'workingDistance', min: 1 },
          { key: 'imageCircle', label: '이미지 서클', en: 'Image Circle', unit: 'mm', default: 0, min: 0, optional: true },
        ],
        outputs: [
          { key: 'f', label: '필요 초점거리', en: 'Focal Length', unit: 'mm', digits: 2, primary: true },
          { key: 'actualFovW', label: '실제 FOV (W)', en: 'Actual Field of View (W)', unit: 'mm', digits: 1 },
          { key: 'actualFovH', label: '실제 FOV (H)', en: 'Actual Field of View (H)', unit: 'mm', digits: 1 },
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
        diagram(v, o) {
          return layoutDiagrams(v, o, { targetW: v.fovW, targetH: v.fovH });
        },
        warn(v, o) {
          const warns = opticalWarnings(o.m, v.fNumber, v.pixelUm, v.imageCircle, o._sensor.diag);
          const std = nearestStandard(o.f, o._sensor, v.wd);
          if (std.fovW) {
            warns.push({
              level: 'info',
              text: o._axis + '축이 제약입니다. 가장 가까운 표준 렌즈 ' + std.f + ' mm 사용 시 실제 FOV 는 ' +
                std.fovW.toFixed(1) + ' × ' + std.fovH.toFixed(1) + ' mm 입니다.',
            });
          }
          return warns;
        },
      },
      {
        id: 'fov',
        name: 'FOV 계산',
        en: 'Field of View',
        formula: [
          '배율 = 초점거리 / (WD − 초점거리)',
          'FOV (W) = 센서 크기 (W) / 배율',
          'FOV (H) = 센서 크기 (H) / 배율',
        ],
        inputs: [
          ...SENSOR_INPUTS,
          { key: 'f', label: '초점거리', en: 'Focal Length', unit: 'mm', profile: 'focalLength', min: 1 },
          { key: 'wd', label: 'WD', en: 'Working Distance', unit: 'mm', profile: 'workingDistance', min: 1 },
          { key: 'imageCircle', label: '이미지 서클', en: 'Image Circle', unit: 'mm', default: 0, min: 0, optional: true },
        ],
        outputs: [
          { key: 'fovW', label: 'FOV (W)', en: 'Field of View (W)', unit: 'mm', digits: 1, primary: true },
          { key: 'fovH', label: 'FOV (H)', en: 'Field of View (H)', unit: 'mm', digits: 1, primary: true },
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
        diagram(v, o) {
          // 이 모드는 시야가 결과이므로 겹쳐 그릴 대상 사각형이 없다.
          return v.wd > v.f ? layoutDiagrams(v, o) : [];
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
        name: 'WD 계산',
        en: 'Working Distance',
        formula: [
          '배율 (W) = 센서 크기 (W) / FOV (W)',
          '배율 (H) = 센서 크기 (H) / FOV (H)',
          '배율 = 둘 중 작은 쪽 — 그 축이 제약축입니다',
          'WD = 초점거리 × (1 + 배율) / 배율',
        ],
        inputs: [
          ...SENSOR_INPUTS,
          { key: 'f', label: '초점거리', en: 'Focal Length', unit: 'mm', profile: 'focalLength', min: 1 },
          { key: 'fovW', label: 'FOV (W)', en: 'Field of View (W)', unit: 'mm', default: 120, min: 0.01 },
          { key: 'fovH', label: 'FOV (H)', en: 'Field of View (H)', unit: 'mm', default: 90, min: 0.01 },
          { key: 'imageCircle', label: '이미지 서클', en: 'Image Circle', unit: 'mm', default: 0, min: 0, optional: true },
        ],
        outputs: [
          { key: 'wd', label: '필요 WD', en: 'Required Working Distance', unit: 'mm', digits: 1, primary: true },
          { key: 'actualFovW', label: '실제 FOV (W)', en: 'Actual Field of View (W)', unit: 'mm', digits: 1 },
          { key: 'actualFovH', label: '실제 FOV (H)', en: 'Actual Field of View (H)', unit: 'mm', digits: 1 },
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
        diagram(v, o) {
          return layoutDiagrams(v, o, { targetW: v.fovW, targetH: v.fovH });
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
    summary: '배율과 F수로 초점이 맞는 깊이 범위를 구합니다',
    tags: ['DOF', '심도', '착란원', 'depth of field', 'CoC', '초점심도'],
    related: ['lens-select', 'resolution'],
    formula: [
      'CoC = 센서 픽셀 크기 × 착란원 배수',
      'DOF = 2 × F수 × CoC × (1 + 배율) / 배율²',
    ],
    inputs: [
      { key: 'm', label: '배율', en: 'Magnification', unit: '×', default: 0.192, min: 0.0001, step: 0.001 },
      { key: 'fNumber', label: 'F수', en: 'F-number', unit: '', profile: 'fNumber', min: 0.7, step: 0.1 },
      { key: 'pixelUm', label: '센서 픽셀 크기', en: 'Pixel Pitch', unit: 'µm', profile: 'pixelSize',
        min: 0.1, step: 0.1, hint: '카메라 스펙시트의 픽셀 피치. 대상 위 분해능과 다릅니다' },
      { key: 'cocMult', label: 'CoC 배수', en: 'CoC ×Pixel', unit: '', default: 2, min: 0.5, step: 0.5,
        hint: 'CoC 를 센서 픽셀 크기의 몇 배로 볼지' },
    ],
    outputs: [
      { key: 'dof', label: 'DOF', en: 'Depth of Field', unit: 'mm', digits: 3, primary: true },
      { key: 'nearHalf', label: '전방 ½', en: 'Near', unit: 'mm', digits: 3 },
      { key: 'farHalf', label: '후방 ½', en: 'Far', unit: 'mm', digits: 3 },
      { key: 'coc', label: 'CoC', en: 'Circle of Confusion', unit: 'µm', digits: 2 },
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
    diagram(v, o) {
      return [depthRange({ dof: o.dof, nearHalf: o.nearHalf, farHalf: o.farHalf })];
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
    name: '분해능 · 검출 한계',
    en: 'Spatial Resolution',
    summary: 'FOV 와 화소수로 픽셀 하나가 대상에서 몇 µm 인지, 검출 가능한 최소 결함이 얼마인지 구합니다',
    tags: ['분해능', '해상도', 'µm/px', '검출', '나이퀴스트', 'resolution', 'nyquist', 'pixel pitch'],
    related: ['lens-select', 'dof'],
    formula: [
      '대상 분해능 (W) = FOV (W) × 1000 / 화소수 (W)',
      '대상 분해능 (H) = FOV (H) × 1000 / 화소수 (H)',
      '검출 한계 = 둘 중 나쁜 쪽 분해능 × 결함 판정 픽셀수',
      '나이퀴스트 한계 = 둘 중 나쁜 쪽 분해능 × 2',
    ],
    inputs: [
      { key: 'fovW', label: 'FOV (W)', en: 'Field of View (W)', unit: 'mm', default: 120, min: 0.01 },
      { key: 'fovH', label: 'FOV (H)', en: 'Field of View (H)', unit: 'mm', default: 90, min: 0.01 },
      { key: 'wpx', label: '화소수 (W)', en: 'Width', unit: 'px', profile: 'sensorWpx', min: 1, step: 1 },
      { key: 'hpx', label: '화소수 (H)', en: 'Height', unit: 'px', profile: 'sensorHpx', min: 1, step: 1 },
      { key: 'minPixels', label: '결함 판정 픽셀수', en: 'Pixels on Defect', unit: 'px', default: 3, min: 1, step: 1,
        hint: '결함 하나를 몇 픽셀로 잡아야 판정할지' },
    ],
    outputs: [
      { key: 'umPerPxW', label: '대상 분해능 (W)', en: 'Spatial Resolution (W)', unit: 'µm/px', digits: 2, primary: true },
      { key: 'umPerPxH', label: '대상 분해능 (H)', en: 'Spatial Resolution (H)', unit: 'µm/px', digits: 2, primary: true },
      { key: 'detectLimit', label: '검출 한계', en: 'Detection Limit', unit: 'µm', digits: 1 },
      { key: 'nyquist', label: '나이퀴스트 한계', en: 'Nyquist Limit', unit: 'µm', digits: 1 },
      { key: 'aspectSensor', label: '화소 종횡비', en: 'Sensor Aspect', unit: '', digits: 3 },
      { key: 'aspectFov', label: 'FOV 종횡비', en: 'FOV Aspect Ratio', unit: '', digits: 3 },
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
    diagram(v, o) {
      return [
        fovRect(v.fovW, v.fovH),
        pixelGrid({
          // 두 축 중 나쁜 쪽이 실제 검출 성능을 결정한다.
          umPerPx: Math.max(o.umPerPxW, o.umPerPxH),
          minPixels: v.minPixels,
          detectLimit: o.detectLimit,
        }),
      ];
    },
    warn(v, o) {
      const warns = [];
      const skew = Math.abs(o.umPerPxW - o.umPerPxH) / Math.max(o.umPerPxW, o.umPerPxH);
      if (skew > 0.02) {
        warns.push({
          level: 'warn',
          text: '분해능 (W) 와 (H) 가 ' + (skew * 100).toFixed(1) +
            ' % 어긋납니다. FOV 종횡비와 화소 종횡비가 달라 한 축에 여백이 생긴다는 뜻입니다.',
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

  {
    id: 'focus-depth',
    category: 'lens',
    name: '초점심도',
    en: 'Depth of Focus',
    summary: '센서가 앞뒤로 얼마나 벗어나도 초점이 유지되는지 — 마운트·플랜지 조정 여유입니다',
    tags: ['초점심도', 'depth of focus', '플랜지', '마운트', '조립 공차', '센서측'],
    related: ['dof', 'aperture'],
    formula: [
      '유효 F수 = F수 × (1 + 배율)',
      'CoC = 센서 픽셀 크기 × 착란원 배수',
      '초점심도 = 2 × 유효 F수 × CoC',
      'DOF = 초점심도 / 배율²',
    ],
    inputs: [
      { key: 'm', label: '배율', en: 'Magnification', unit: '×', default: 0.192, min: 0.0001, step: 0.001 },
      { key: 'fNumber', label: 'F수', en: 'F-number', unit: '', profile: 'fNumber', min: 0.7, step: 0.1,
        hint: '렌즈 조리개값' },
      { key: 'pixelUm', label: '센서 픽셀 크기', en: 'Pixel Pitch', unit: 'µm', profile: 'pixelSize',
        min: 0.1, step: 0.1, hint: '카메라 스펙시트의 픽셀 피치' },
      { key: 'cocMult', label: 'CoC 배수', en: 'CoC ×Pixel', unit: '', default: 2, min: 0.5, step: 0.5,
        hint: 'CoC 를 센서 픽셀 크기의 몇 배로 볼지' },
    ],
    outputs: [
      { key: 'focusDepth', label: '초점심도', en: 'Depth of Focus', unit: 'µm', digits: 1, primary: true },
      { key: 'halfDepth', label: '편측 여유', en: 'Half', unit: 'µm', digits: 1 },
      { key: 'effectiveN', label: '유효 F수', en: 'Effective F-number', unit: '', digits: 2 },
      { key: 'coc', label: 'CoC', en: 'Circle of Confusion', unit: 'µm', digits: 2 },
      { key: 'dof', label: '대응 DOF', en: 'Depth of Field', unit: 'mm', digits: 3 },
    ],
    compute(v) {
      const coc = v.pixelUm * v.cocMult;
      const { dof, focusDepthUm } = depthOfField(v.m, v.fNumber, coc);
      return {
        focusDepth: focusDepthUm,
        halfDepth: focusDepthUm / 2,
        effectiveN: effectiveFNumber(v.fNumber, v.m),
        coc,
        dof,
      };
    },
    diagram(v, o) {
      return [
        focusDepthView({
          focusDepth: o.focusDepth,
          halfDepth: o.halfDepth,
          coc: o.coc,
          effectiveN: o.effectiveN,
        }),
      ];
    },
    warn(v, o) {
      const warns = [];
      if (o.focusDepth < 20) {
        warns.push({
          level: 'warn',
          text: `초점심도가 ${o.focusDepth.toFixed(1)} µm 로 매우 얕습니다. 마운트 공차와 온도 변화만으로도 초점이 벗어날 수 있습니다.`,
        });
      }
      warns.push({
        level: 'info',
        text: '센서측 값입니다. 대상이 앞뒤로 움직일 때 허용되는 범위는 피사계심도를 보세요.',
      });
      return warns;
    },
  },

  {
    id: 'aperture',
    category: 'lens',
    name: '유효 F수 · 회절 한계',
    en: 'Effective F-number',
    summary: '조리개를 조일수록 심도는 깊어지지만 회절로 해상력이 떨어집니다. 그 경계를 찾습니다',
    tags: ['F수', '유효 F수', '회절', '에어리', 'airy', 'diffraction', 'f-number', '조리개', 'NA'],
    related: ['dof', 'resolution'],
    formula: [
      '유효 F수 = F수 × (1 + 배율)',
      '에어리 지름 = 2.44 × 파장 × 유효 F수',
      '회절 차단 주파수 = 1 / (파장 × 유효 F수)',
      'NA = 1 / (2 × 유효 F수)',
    ],
    inputs: [
      { key: 'fNumber', label: 'F수', en: 'F-number', unit: '', profile: 'fNumber', min: 0.7, step: 0.1,
        hint: '렌즈에 표시된 조리개값' },
      { key: 'm', label: '배율', en: 'Magnification', unit: '×', default: 0.192, min: 0, step: 0.001 },
      { key: 'pixelUm', label: '센서 픽셀 크기', en: 'Pixel Pitch', unit: 'µm', profile: 'pixelSize',
        min: 0.1, step: 0.1 },
      { key: 'lambdaNm', label: '파장', en: 'Wavelength', unit: 'nm', default: LAMBDA_UM * 1000, min: 200, step: 10,
        hint: '가시광 백색광은 550 nm 로 봅니다' },
    ],
    outputs: [
      { key: 'effectiveN', label: '유효 F수', en: 'Effective F-number', unit: '', digits: 2, primary: true },
      { key: 'airy', label: '에어리 지름', en: 'Airy Disk', unit: 'µm', digits: 2, primary: true },
      { key: 'airyPerPixel', label: '픽셀 대비', en: 'Airy / Pixel', unit: '×', digits: 2 },
      { key: 'cutoff', label: '회절 차단 주파수', en: 'Cutoff', unit: 'lp/mm', digits: 0 },
      { key: 'na', label: 'NA (상측)', en: 'Image-side NA', unit: '', digits: 4 },
      { key: 'lightLoss', label: '광량 손실', en: 'Light Loss', unit: 'stop', digits: 2 },
    ],
    compute(v) {
      const lambdaUm = v.lambdaNm / 1000;
      const effectiveN = effectiveFNumber(v.fNumber, v.m);
      const airy = airyDiameterUm(v.fNumber, v.m, lambdaUm);
      return {
        effectiveN,
        airy,
        airyPerPixel: airy / v.pixelUm,
        // 비간섭 결상의 차단 주파수. λ 를 mm 로 환산해 lp/mm 로 낸다.
        cutoff: 1 / ((lambdaUm / 1000) * effectiveN),
        na: 1 / (2 * effectiveN),
        // 유효 F수가 커진 만큼 어두워진다. 스톱은 밑이 2 인 로그.
        lightLoss: 2 * Math.log2(1 + v.m),
      };
    },
    warn(v, o) {
      const warns = [];
      if (o.airyPerPixel > 1) {
        warns.push({
          level: 'warn',
          text: `에어리 지름이 픽셀의 ${o.airyPerPixel.toFixed(2)} 배입니다. 조리개를 더 조여도 해상력만 떨어집니다.`,
        });
      } else if (o.airyPerPixel < 0.5) {
        warns.push({
          level: 'info',
          text: `에어리 지름이 픽셀의 ${o.airyPerPixel.toFixed(2)} 배입니다. 회절 여유가 있으니 심도가 부족하면 더 조여도 됩니다.`,
        });
      }
      if (o.lightLoss > 0.5) {
        warns.push({
          level: 'info',
          text: `배율 때문에 ${o.lightLoss.toFixed(2)} 스톱 어두워집니다. 노출이나 조명을 그만큼 보정해야 합니다.`,
        });
      }
      return warns;
    },
  },
];
