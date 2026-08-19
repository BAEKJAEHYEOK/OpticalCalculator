// 단위 변환 및 숫자 포맷 유틸.
// 계산 모듈은 mm / µm / degree 를 기본 단위로 사용한다.

export const UM_PER_MM = 1000;

export const mmToUm = (mm) => mm * UM_PER_MM;
export const umToMm = (um) => um / UM_PER_MM;
export const inchToMm = (inch) => inch * 25.4;
export const mmToInch = (mm) => mm / 25.4;
export const degToRad = (deg) => (deg * Math.PI) / 180;
export const radToDeg = (rad) => (rad * 180) / Math.PI;

// 가시광 기준 파장(µm). 회절 계산 기본값.
export const LAMBDA_UM = 0.55;

// 표준 산업용 렌즈 초점거리(mm).
export const STANDARD_FOCAL_LENGTHS = [6, 8, 12, 16, 25, 35, 50, 75, 100];

// 화면 출력용 반올림. JS 부동소수 잔재를 제거한다.
export function round(value, digits = 2) {
  if (!Number.isFinite(value)) return null;
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

// 값의 크기에 따라 자릿수를 자동 조절한다. 0.0001 과 12000 을 같은 규칙으로 찍으면 읽히지 않는다.
export function format(value, digits) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  let d = digits;
  if (d === undefined) {
    const abs = Math.abs(value);
    if (abs === 0) d = 0;
    else if (abs < 0.01) d = 4;
    else if (abs < 1) d = 3;
    else if (abs < 100) d = 2;
    else d = 1;
  }
  return round(value, d).toLocaleString('ko-KR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: d,
  });
}
