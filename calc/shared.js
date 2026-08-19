// 렌즈 계산기들이 공유하는 순수 함수와 입출력 조각.
// UI 를 참조하지 않으므로 verify.html 에서 단독으로 검증할 수 있다.

import { LAMBDA_UM, STANDARD_FOCAL_LENGTHS } from '../core/units.js';
import { fovRect, opticalLayout } from '../core/diagram.js';

// 센서 물리 크기(mm). 포맷 프리셋(1/2", 2/3" 등)보다 픽셀 기반 계산이 정확하다.
export const sensorSize = (wpx, hpx, pixelUm) => ({
  w: (wpx * pixelUm) / 1000,
  h: (hpx * pixelUm) / 1000,
  diag: (Math.hypot(wpx, hpx) * pixelUm) / 1000,
});

// 대상을 가로·세로 모두 담으려면 두 축의 요구 배율 중 작은 쪽을 써야 한다.
// 큰 쪽을 쓰면 반대 축이 시야를 벗어난다.
export function limitingMagnification(sensor, fovW, fovH) {
  const mW = sensor.w / fovW;
  const mH = sensor.h / fovH;
  return mW <= mH ? { m: mW, axis: '가로' } : { m: mH, axis: '세로' };
}

// 유효 F수(작동 F수). 근접 촬영에서는 배율만큼 어두워지고 회절도 그만큼 커진다.
export const effectiveFNumber = (fNumber, m) => fNumber * (1 + m);

// 회절 한계 스팟(에어리 디스크) 지름. 픽셀보다 커지면 조리개를 과하게 조인 것이다.
export const airyDiameterUm = (fNumber, m, lambdaUm = LAMBDA_UM) =>
  2.44 * lambdaUm * effectiveFNumber(fNumber, m);

// 피사계심도. 허용착란원 c 는 픽셀 크기의 배수로 잡는 것이 머신비전 관례다.
//
// 센서측 초점심도와 물체측 피사계심도는 배율의 제곱으로 이어져 있다.
//   초점심도 = 2 × 유효F수 × c,   피사계심도 = 초점심도 / m²
// 한쪽만 고쳐 두 값이 어긋나지 않도록 하나의 식에서 함께 유도한다.
export function depthOfField(m, fNumber, cocUm) {
  if (!(m > 0)) return { dof: null, focusDepthUm: null };
  const focusDepthUm = 2 * effectiveFNumber(fNumber, m) * cocUm;
  return { dof: focusDepthUm / (m * m) / 1000, focusDepthUm };
}

export function opticalWarnings(m, fNumber, pixelUm, imageCircle, sensorDiag) {
  const warns = [];
  const airy = airyDiameterUm(fNumber, m);
  if (airy > pixelUm) {
    warns.push({
      level: 'warn',
      text: '회절 한계 스팟 ' + airy.toFixed(2) + ' µm 가 센서 픽셀 ' + pixelUm +
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
export function nearestStandard(f, sensor, wd) {
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
export const SENSOR_INPUTS = [
  { key: 'wpx', label: '가로 화소수', en: 'Width', unit: 'px', profile: 'sensorWpx', min: 1, step: 1 },
  { key: 'hpx', label: '세로 화소수', en: 'Height', unit: 'px', profile: 'sensorHpx', min: 1, step: 1 },
  { key: 'pixelUm', label: '센서 픽셀 크기', en: 'Pixel Pitch', unit: 'µm', profile: 'pixelSize',
    min: 0.1, step: 0.1, hint: '카메라 스펙시트의 픽셀 피치. 대상 위 분해능과 다릅니다' },
  { key: 'fNumber', label: 'F수', en: 'F-number', unit: '', profile: 'fNumber', min: 0.7, step: 0.1,
    hint: '렌즈 조리개값' },
];

export const SHARED_OUTPUTS = [
  { key: 'm', label: '배율', en: 'Magnification', unit: '×', digits: 4 },
  { key: 'umPerPx', label: '대상 분해능', en: 'Spatial Resolution', unit: 'µm/px', digits: 2 },
  { key: 'dof', label: '피사계심도', en: 'DOF', unit: 'mm', digits: 2 },
  { key: 'sensorW', label: '센서 가로', en: 'Sensor W', unit: 'mm', digits: 2 },
  { key: 'sensorH', label: '센서 세로', en: 'Sensor H', unit: 'mm', digits: 2 },
  { key: 'airy', label: '회절 스팟', en: 'Airy Disk', unit: 'µm', digits: 2 },
];

// 배율이 정해진 뒤의 공통 파생값. 세 모드가 같은 지표를 보여줘야 서로 비교가 된다.
export function derive(m, sensor, pixelUm, fNumber) {
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

// 세 모드가 같은 도해를 쓴다. 배율이 정해지면 그릴 내용은 동일하기 때문이다.
// 실제 시야와 검사 대상을 겹쳐 그려 어느 축이 제약이고 여백이 어디 남는지 보인다.
export function layoutDiagrams(v, o, { targetW, targetH } = {}) {
  return [
    opticalLayout({
      wd: o.wd ?? v.wd,
      f: o.f ?? v.f,
      fovH: o.actualFovH ?? o.fovH,
      sensorH: o.sensorH,
      m: o.m,
    }),
    fovRect(o.actualFovW ?? o.fovW, o.actualFovH ?? o.fovH, {
      targetW,
      targetH,
      axis: o._axis,
    }),
  ];
}
