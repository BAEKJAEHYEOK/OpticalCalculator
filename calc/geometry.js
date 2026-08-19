// 기하 · 정렬 대분류.
// 화면의 픽셀을 실제 치수로 옮길 때 생기는 각도와 오차를 다룬다.

import { degToRad, radToDeg } from '../core/units.js';
import { angleOfViewView } from '../core/diagram.js';
import { sensorSize } from './shared.js';

export const geometryCalculators = [
  {
    id: 'angle-of-view',
    category: 'geometry',
    name: '화각',
    en: 'Angle of View',
    summary: '초점거리와 센서 크기로 화각을 구하고, 그 거리에서의 시야를 함께 냅니다',
    tags: ['화각', 'AOV', 'FOV', 'angle of view', '시야각', '수평', '수직', '대각'],
    related: ['lens-select', 'perspective-error'],
    formula: '화각 = 2 · atan(시야 / (2 · 작동거리)),   무한원 기준 = 2 · atan(센서 / 2f)',
    inputs: [
      { key: 'wpx', label: '가로 화소수', en: 'Width', unit: 'px', profile: 'sensorWpx', min: 1, step: 1 },
      { key: 'hpx', label: '세로 화소수', en: 'Height', unit: 'px', profile: 'sensorHpx', min: 1, step: 1 },
      { key: 'pixelUm', label: '센서 픽셀 크기', en: 'Pixel Pitch', unit: 'µm', profile: 'pixelSize', min: 0.1, step: 0.1 },
      { key: 'f', label: '초점거리', en: 'Focal Length', unit: 'mm', profile: 'focalLength', min: 0.1, step: 0.1 },
      { key: 'wd', label: '작동거리', en: 'WD', unit: 'mm', profile: 'workingDistance', min: 1, step: 1 },
    ],
    outputs: [
      { key: 'aovH', label: '수평 화각', en: 'Horizontal', unit: '°', digits: 2, primary: true },
      { key: 'aovV', label: '수직 화각', en: 'Vertical', unit: '°', digits: 2, primary: true },
      { key: 'aovD', label: '대각 화각', en: 'Diagonal', unit: '°', digits: 2 },
      { key: 'fovW', label: '시야 가로', en: 'FOV W', unit: 'mm', digits: 1 },
      { key: 'fovH', label: '시야 세로', en: 'FOV H', unit: 'mm', digits: 1 },
      { key: 'aovInf', label: '무한원 기준 수평 화각', en: 'At Infinity', unit: '°', digits: 2 },
    ],
    compute(v) {
      const sensor = sensorSize(v.wpx, v.hpx, v.pixelUm);
      // 시야는 렌즈 선정 계산기와 같은 방식으로 정확히 구하고,
      // 화각은 그 시야가 작동거리에서 이루는 각으로 낸다. 두 계산기가 어긋나지 않는다.
      const m = v.f / (v.wd - v.f);
      const fovW = sensor.w / m;
      const fovH = sensor.h / m;
      const angle = (size) => 2 * radToDeg(Math.atan(size / 2 / v.wd));
      return {
        aovH: angle(fovW),
        aovV: angle(fovH),
        aovD: angle(Math.hypot(fovW, fovH)),
        fovW,
        fovH,
        // 카탈로그에 실리는 값은 무한원 초점 기준이라 근접 촬영에서는 이보다 좁아진다.
        aovInf: 2 * radToDeg(Math.atan(sensor.w / 2 / v.f)),
        _sensor: sensor,
      };
    },
    diagram(v, o) {
      if (!(o.fovW > 0) || !Number.isFinite(o.fovW)) return [];
      return [angleOfViewView({ aovDeg: o.aovH, wd: v.wd, fovW: o.fovW, f: v.f })];
    },
    warn(v, o) {
      if (v.wd <= v.f) {
        return [{ level: 'danger', text: '작동거리가 초점거리보다 짧거나 같습니다. 결상되지 않는 조건입니다.' }];
      }
      const gap = Math.abs(o.aovH - o.aovInf);
      if (gap > 1) {
        return [{
          level: 'info',
          text: `카탈로그의 무한원 기준 화각 ${o.aovInf.toFixed(2)}° 와 ${gap.toFixed(2)}° 차이가 납니다. 근접 촬영일수록 실제 화각이 좁아집니다.`,
        }];
      }
      return [];
    },
  },

  {
    id: 'pixel-calibration',
    category: 'geometry',
    name: '픽셀 ↔ mm 캘리브레이션',
    en: 'Pixel Calibration',
    summary: '기준 물체의 실측값과 픽셀수로 축척을 정하고, 측정 픽셀을 실제 치수로 바꿉니다',
    tags: ['캘리브레이션', 'calibration', '축척', 'scale', '픽셀', 'mm', '측정', '환산'],
    related: ['resolution', 'perspective-error'],
    formula: '축척(mm/px) = 기준 실측(mm) / 기준 픽셀수,   측정값 = 측정 픽셀 × 축척',
    inputs: [
      { key: 'refMm', label: '기준 물체 실측', en: 'Reference Length', unit: 'mm', default: 50, min: 0.001, step: 0.01,
        hint: '캘리브레이션 타깃의 알려진 치수' },
      { key: 'refPx', label: '기준 물체 픽셀수', en: 'Reference Pixels', unit: 'px', default: 2133, min: 0.001, step: 1 },
      { key: 'measuredPx', label: '측정 픽셀수', en: 'Measured Pixels', unit: 'px', default: 100, min: 0, step: 1 },
      { key: 'edgeErrorPx', label: '에지 검출 오차', en: 'Edge Error', unit: 'px', default: 0.5, min: 0, step: 0.1,
        hint: '한쪽 에지의 검출 불확실성' },
    ],
    outputs: [
      { key: 'measuredMm', label: '측정값', en: 'Measured', unit: 'mm', digits: 4, primary: true },
      { key: 'scaleMm', label: '축척', en: 'Scale', unit: 'mm/px', digits: 6, primary: true },
      { key: 'scaleUm', label: '축척', en: 'Scale', unit: 'µm/px', digits: 3 },
      { key: 'pxPerMm', label: '1 mm 당 픽셀', en: 'Pixels per mm', unit: 'px', digits: 2 },
      { key: 'toleranceMm', label: '측정 불확실도', en: 'Uncertainty', unit: 'mm', digits: 4 },
      { key: 'tolerancePct', label: '측정 불확실도', en: 'Uncertainty', unit: '%', digits: 3 },
    ],
    compute(v) {
      const scaleMm = v.refMm / v.refPx;
      const measuredMm = v.measuredPx * scaleMm;
      // 양쪽 에지가 각각 흔들리므로 두 배로 본다.
      const toleranceMm = 2 * v.edgeErrorPx * scaleMm;
      return {
        measuredMm,
        scaleMm,
        scaleUm: scaleMm * 1000,
        pxPerMm: 1 / scaleMm,
        toleranceMm,
        tolerancePct: measuredMm > 0 ? (toleranceMm / measuredMm) * 100 : 0,
      };
    },
    warn(v, o) {
      const warns = [];
      if (v.refPx < 200) {
        warns.push({
          level: 'warn',
          text: `기준 물체가 ${v.refPx} px 밖에 안 됩니다. 기준이 짧으면 축척 오차가 그대로 전체 측정에 실립니다. 시야를 가로지르는 큰 타깃을 쓰세요.`,
        });
      }
      if (o.tolerancePct > 1) {
        warns.push({
          level: 'warn',
          text: `측정 불확실도가 ${o.tolerancePct.toFixed(2)} % 입니다. 대상이 작아 에지 오차 비중이 큽니다.`,
        });
      }
      return warns;
    },
  },

  {
    id: 'perspective-error',
    category: 'geometry',
    name: '원근 오차',
    en: 'Perspective Error',
    summary: '일반 렌즈에서 대상 높이가 달라지면 크기가 얼마나 다르게 찍히는지 구합니다',
    tags: ['원근', 'perspective', '높이', '두께', '측정 오차', '비텔레센트릭', '배율 변화'],
    related: ['telecentric', 'angle-of-view'],
    formula: '크기 변화율 ≈ 높이차 / 작동거리,   측정 오차 = 측정 길이 × 변화율',
    inputs: [
      { key: 'wd', label: '작동거리', en: 'WD', unit: 'mm', profile: 'workingDistance', min: 1, step: 1 },
      { key: 'heightMm', label: '대상 높이차', en: 'Height Difference', unit: 'mm', default: 5, min: 0, step: 0.1,
        hint: '기준면에서 얼마나 높거나 낮은지' },
      { key: 'lengthMm', label: '측정 길이', en: 'Measured Length', unit: 'mm', default: 50, min: 0.01, step: 1 },
      { key: 'umPerPx', label: '대상 분해능', en: 'Spatial Resolution', unit: 'µm/px', default: 23.44, min: 0.01 },
    ],
    outputs: [
      { key: 'errorMm', label: '측정 오차', en: 'Error', unit: 'mm', digits: 4, primary: true },
      { key: 'errorPx', label: '측정 오차', en: 'Error', unit: 'px', digits: 2, primary: true },
      { key: 'scalePct', label: '크기 변화율', en: 'Scale Change', unit: '%', digits: 3 },
      { key: 'allowHeightMm', label: '1 px 오차 허용 높이차', en: 'Allowed Height', unit: 'mm', digits: 3 },
    ],
    compute(v) {
      // 대상이 렌즈에 가까워지면 그만큼 크게 찍힌다. 근축에서는 높이차 / 작동거리 비율이다.
      const ratio = v.heightMm / v.wd;
      const errorMm = v.lengthMm * ratio;
      const onePxMm = v.umPerPx / 1000;
      return {
        errorMm,
        errorPx: errorMm / onePxMm,
        scalePct: ratio * 100,
        allowHeightMm: (onePxMm / v.lengthMm) * v.wd,
      };
    },
    warn(v, o) {
      if (v.heightMm === 0) {
        return [{ level: 'info', text: '높이차가 0 이라 원근 오차가 없습니다.' }];
      }
      if (o.errorPx > 1) {
        return [{
          level: 'warn',
          text: `오차가 ${o.errorPx.toFixed(2)} px 입니다. 높이차를 ${o.allowHeightMm.toFixed(3)} mm 이내로 잡거나, 텔레센트릭 렌즈를 쓰거나, 작동거리를 늘려야 합니다.`,
        }];
      }
      return [{ level: 'info', text: `오차가 ${o.errorPx.toFixed(2)} px 로 1 픽셀 미만입니다.` }];
    },
  },

  {
    id: 'telecentric',
    category: 'geometry',
    name: '텔레센트릭 오차',
    en: 'Telecentricity',
    summary: '텔레센트릭 렌즈의 잔여 각도가 만드는 측정 오차를 구하고 일반 렌즈와 비교합니다',
    tags: ['텔레센트릭', 'telecentric', '텔레센트릭도', '측정', '치수', '정밀'],
    related: ['perspective-error', 'lens-select'],
    formula: '오차 = 2 × 높이차 × tan(텔레센트릭도)',
    inputs: [
      { key: 'telecentricityDeg', label: '텔레센트릭도', en: 'Telecentricity', unit: '°', default: 0.1, min: 0, step: 0.01,
        hint: '렌즈 스펙시트의 Telecentricity. 보통 0.05~0.5°' },
      { key: 'heightMm', label: '대상 높이차', en: 'Height Difference', unit: 'mm', default: 5, min: 0, step: 0.1 },
      { key: 'umPerPx', label: '대상 분해능', en: 'Spatial Resolution', unit: 'µm/px', default: 23.44, min: 0.01 },
      { key: 'wd', label: '비교용 작동거리', en: 'WD for Comparison', unit: 'mm', profile: 'workingDistance', min: 1, step: 1,
        hint: '같은 조건의 일반 렌즈와 비교하기 위한 값' },
      { key: 'lengthMm', label: '측정 길이', en: 'Measured Length', unit: 'mm', default: 50, min: 0.01, step: 1 },
    ],
    outputs: [
      { key: 'errorMm', label: '측정 오차', en: 'Error', unit: 'mm', digits: 5, primary: true },
      { key: 'errorPx', label: '측정 오차', en: 'Error', unit: 'px', digits: 3, primary: true },
      { key: 'normalErrorMm', label: '일반 렌즈였다면', en: 'Standard Lens', unit: 'mm', digits: 4 },
      { key: 'improvement', label: '개선 배수', en: 'Improvement', unit: '×', digits: 1 },
      { key: 'allowHeightMm', label: '1 px 오차 허용 높이차', en: 'Allowed Height', unit: 'mm', digits: 2 },
    ],
    compute(v) {
      const errorMm = 2 * v.heightMm * Math.tan(degToRad(v.telecentricityDeg));
      const normalErrorMm = v.lengthMm * (v.heightMm / v.wd);
      const onePxMm = v.umPerPx / 1000;
      const perMm = 2 * Math.tan(degToRad(v.telecentricityDeg));
      return {
        errorMm,
        errorPx: errorMm / onePxMm,
        normalErrorMm,
        improvement: errorMm > 0 ? normalErrorMm / errorMm : Infinity,
        allowHeightMm: perMm > 0 ? onePxMm / perMm : Infinity,
      };
    },
    warn(v, o) {
      const warns = [];
      if (v.telecentricityDeg === 0) {
        warns.push({ level: 'info', text: '텔레센트릭도가 0 인 이상적인 조건입니다. 실제 렌즈는 0.05° 이상입니다.' });
        return warns;
      }
      warns.push({
        level: 'info',
        text: `같은 조건의 일반 렌즈보다 오차가 ${o.improvement.toFixed(0)} 배 작습니다. 높이차 ${o.allowHeightMm.toFixed(2)} mm 까지는 1 픽셀 이내입니다.`,
      });
      if (o.errorPx > 1) {
        warns.push({
          level: 'warn',
          text: `그래도 오차가 ${o.errorPx.toFixed(2)} px 입니다. 텔레센트릭도가 더 좋은 렌즈가 필요합니다.`,
        });
      }
      return warns;
    },
  },

  {
    id: 'camera-tilt',
    category: 'geometry',
    name: '카메라 경사 오차',
    en: 'Camera Tilt',
    summary: '카메라가 기울어져 설치되면 시야 양끝의 거리와 배율이 달라집니다. 그 차이를 구합니다',
    tags: ['경사', 'tilt', '기울기', '키스톤', 'keystone', '사다리꼴', '설치', '정렬'],
    related: ['perspective-error', 'dof'],
    formula: '양끝 거리차 = 시야 × sin(경사각),   배율차 ≈ 거리차 / 작동거리',
    inputs: [
      { key: 'tiltDeg', label: '경사각', en: 'Tilt Angle', unit: '°', default: 2, min: 0, max: 89, step: 0.1,
        hint: '광축이 대상면 수직에서 벗어난 각도' },
      { key: 'wd', label: '작동거리', en: 'WD', unit: 'mm', profile: 'workingDistance', min: 1, step: 1 },
      { key: 'fovW', label: '시야 가로', en: 'FOV W', unit: 'mm', default: 120, min: 0.01, step: 1 },
      { key: 'umPerPx', label: '대상 분해능', en: 'Spatial Resolution', unit: 'µm/px', default: 23.44, min: 0.01 },
    ],
    outputs: [
      { key: 'wdDiff', label: '양끝 거리차', en: 'WD Difference', unit: 'mm', digits: 2, primary: true },
      { key: 'keystonePx', label: '키스톤 왜곡', en: 'Keystone', unit: 'px', digits: 1, primary: true },
      { key: 'scalePct', label: '양끝 배율차', en: 'Scale Difference', unit: '%', digits: 3 },
      { key: 'nearWd', label: '가까운 쪽 거리', en: 'Near', unit: 'mm', digits: 1 },
      { key: 'farWd', label: '먼 쪽 거리', en: 'Far', unit: 'mm', digits: 1 },
      { key: 'neededDof', label: '필요 피사계심도', en: 'DOF Needed', unit: 'mm', digits: 2 },
    ],
    compute(v) {
      // 시야 양끝이 광축 방향으로 벌어지는 거리차.
      const wdDiff = v.fovW * Math.sin(degToRad(v.tiltDeg));
      const scaleRatio = wdDiff / v.wd;
      return {
        wdDiff,
        keystonePx: (v.fovW * scaleRatio * 1000) / v.umPerPx,
        scalePct: scaleRatio * 100,
        nearWd: v.wd - wdDiff / 2,
        farWd: v.wd + wdDiff / 2,
        // 기울어진 대상면 전체에 초점이 맞으려면 이만큼의 심도가 필요하다.
        neededDof: wdDiff,
      };
    },
    warn(v, o) {
      if (v.tiltDeg === 0) {
        return [{ level: 'info', text: '경사각이 0 이라 왜곡이 없습니다. 이상적인 설치 조건입니다.' }];
      }
      const warns = [{
        level: 'info',
        text: `대상면 전체에 초점이 맞으려면 피사계심도가 ${o.neededDof.toFixed(2)} mm 이상이어야 합니다.`,
      }];
      if (o.keystonePx > 1) {
        warns.push({
          level: 'warn',
          text: `키스톤 왜곡이 ${o.keystonePx.toFixed(1)} px 입니다. 치수 측정에 쓰려면 설치를 다시 잡거나 소프트웨어로 보정해야 합니다.`,
        });
      }
      return warns;
    },
  },
];
