// 카메라 · 센서 대분류.
// 렌즈가 정해진 뒤, 카메라를 어떻게 돌릴 수 있는지를 다룬다 —
// 얼마나 빠르게 찍을 수 있고, 얼마나 흔들리며, 데이터가 얼마나 나오는지.

import { motionBlurView, rollingShutterView, fovRect } from '../core/diagram.js';

// 센서 포맷은 옛 비디콘 관례를 따라 대각(mm) ≈ 16 × 인치 로 잡는다.
// 실제 규격 대각은 이 근사와 조금씩 달라 표를 그대로 둔다.
const SENSOR_FORMATS = [
  { name: '1/4"', diag: 4.0 },
  { name: '1/3"', diag: 6.0 },
  { name: '1/2.5"', diag: 7.18 },
  { name: '1/2"', diag: 8.0 },
  { name: '1/1.8"', diag: 8.93 },
  { name: '2/3"', diag: 11.0 },
  { name: '1"', diag: 16.0 },
  { name: '4/3"', diag: 22.5 },
  { name: 'APS-C', diag: 28.3 },
  { name: '35mm 풀프레임', diag: 43.3 },
];

// 이 센서를 담을 수 있는 가장 작은 표준 포맷.
function fittingFormat(diag) {
  return SENSOR_FORMATS.find((f) => f.diag >= diag - 1e-9) || null;
}

const bytesPerFrame = (wpx, hpx, bitDepth) => (wpx * hpx * bitDepth) / 8;

export const cameraCalculators = [
  {
    id: 'sensor-format',
    category: 'camera',
    name: '센서 규격',
    en: 'Sensor Format',
    summary: '화소수와 픽셀 피치로 센서 크기·대각·포맷을 구합니다. 반대로 포맷에서 피치도 구합니다',
    tags: ['센서', '포맷', '대각', '종횡비', 'sensor', 'format', 'diagonal', '인치', '픽셀 피치'],
    related: ['image-circle', 'lens-select'],
    modes: [
      {
        id: 'size',
        name: '센서 크기 계산',
        en: 'Sensor Size',
        formula: '센서 크기 = 화소수 × 픽셀 피치,   대각 = √(가로² + 세로²)',
        inputs: [
          { key: 'wpx', label: '가로 화소수', en: 'Width', unit: 'px', profile: 'sensorWpx', min: 1, step: 1 },
          { key: 'hpx', label: '세로 화소수', en: 'Height', unit: 'px', profile: 'sensorHpx', min: 1, step: 1 },
          { key: 'pixelUm', label: '센서 픽셀 크기', en: 'Pixel Pitch', unit: 'µm', profile: 'pixelSize',
            min: 0.1, step: 0.1, hint: '카메라 스펙시트의 픽셀 피치' },
        ],
        outputs: [
          { key: 'w', label: '센서 가로', en: 'Width', unit: 'mm', digits: 3, primary: true },
          { key: 'h', label: '센서 세로', en: 'Height', unit: 'mm', digits: 3, primary: true },
          { key: 'diag', label: '대각', en: 'Diagonal', unit: 'mm', digits: 3 },
          { key: 'megapixel', label: '화소수', en: 'Resolution', unit: 'MP', digits: 2 },
          { key: 'aspect', label: '종횡비', en: 'Aspect Ratio', unit: '', digits: 3 },
          { key: 'area', label: '수광 면적', en: 'Active Area', unit: 'mm²', digits: 1 },
        ],
        compute(v) {
          const w = (v.wpx * v.pixelUm) / 1000;
          const h = (v.hpx * v.pixelUm) / 1000;
          const diag = Math.hypot(w, h);
          return {
            w,
            h,
            diag,
            megapixel: (v.wpx * v.hpx) / 1e6,
            aspect: v.wpx / v.hpx,
            area: w * h,
            _format: fittingFormat(diag),
          };
        },
        diagram(v, o) {
          return [fovRect(o.w, o.h, { note: `대각 ${o.diag.toFixed(2)} mm · ${o.megapixel.toFixed(2)} MP` })];
        },
        warn(v, o) {
          const warns = [];
          if (o._format) {
            warns.push({
              level: 'info',
              text: `${o._format.name} 포맷(대각 ${o._format.diag} mm)에 들어갑니다. 렌즈는 이 포맷 이상을 지원하는 것으로 고르세요.`,
            });
          } else {
            warns.push({
              level: 'warn',
              text: `대각 ${o.diag.toFixed(2)} mm 로 35mm 풀프레임보다 큽니다. 대형 포맷 전용 렌즈가 필요합니다.`,
            });
          }
          return warns;
        },
      },
      {
        id: 'pitch',
        name: '픽셀 피치 계산',
        en: 'Pixel Pitch',
        formula: '픽셀 피치 = 대각(mm) × 1000 / √(가로화소² + 세로화소²)',
        inputs: [
          { key: 'diag', label: '센서 대각', en: 'Diagonal', unit: 'mm', default: 11, min: 0.1, step: 0.01,
            hint: '2/3" = 11 mm, 1" = 16 mm' },
          { key: 'wpx', label: '가로 화소수', en: 'Width', unit: 'px', profile: 'sensorWpx', min: 1, step: 1 },
          { key: 'hpx', label: '세로 화소수', en: 'Height', unit: 'px', profile: 'sensorHpx', min: 1, step: 1 },
        ],
        outputs: [
          { key: 'pixelUm', label: '센서 픽셀 크기', en: 'Pixel Pitch', unit: 'µm', digits: 3, primary: true },
          { key: 'w', label: '센서 가로', en: 'Width', unit: 'mm', digits: 3 },
          { key: 'h', label: '센서 세로', en: 'Height', unit: 'mm', digits: 3 },
          { key: 'megapixel', label: '화소수', en: 'Resolution', unit: 'MP', digits: 2 },
        ],
        compute(v) {
          const pixelUm = (v.diag * 1000) / Math.hypot(v.wpx, v.hpx);
          return {
            pixelUm,
            w: (v.wpx * pixelUm) / 1000,
            h: (v.hpx * pixelUm) / 1000,
            megapixel: (v.wpx * v.hpx) / 1e6,
          };
        },
        warn(v, o) {
          if (o.pixelUm < 1.5) {
            return [{
              level: 'warn',
              text: `픽셀 피치가 ${o.pixelUm.toFixed(2)} µm 로 매우 작습니다. 회절 한계에 쉽게 걸리므로 조리개를 조이기 어렵습니다.`,
            }];
          }
          return [];
        },
      },
    ],
  },

  {
    id: 'data-rate',
    category: 'camera',
    name: '데이터 레이트 · 대역폭',
    en: 'Data Rate',
    summary: '프레임레이트에서 나오는 데이터양과, 인터페이스가 감당 가능한 최대 프레임레이트를 구합니다',
    tags: ['데이터', '대역폭', 'bandwidth', 'GigE', 'CoaXPress', 'USB3', 'fps', '전송', 'data rate'],
    related: ['binning-roi', 'sensor-format'],
    modes: [
      {
        id: 'rate',
        name: '데이터 레이트 계산',
        en: 'Data Rate',
        formula: '데이터 레이트 = 가로 × 세로 × 비트깊이 × fps / 8',
        inputs: [
          { key: 'wpx', label: '가로 화소수', en: 'Width', unit: 'px', profile: 'sensorWpx', min: 1, step: 1 },
          { key: 'hpx', label: '세로 화소수', en: 'Height', unit: 'px', profile: 'sensorHpx', min: 1, step: 1 },
          { key: 'bitDepth', label: '비트 깊이', en: 'Bit Depth', unit: 'bit', default: 8, min: 1, step: 1,
            hint: '모노 8bit 이 기본. 12bit 이면 1.5배' },
          { key: 'fps', label: '프레임레이트', en: 'Frame Rate', unit: 'fps', default: 30, min: 0.01, step: 1 },
          { key: 'linkMBs', label: '인터페이스 대역폭', en: 'Link Bandwidth', unit: 'MB/s', default: 115, min: 1, step: 1,
            hint: 'GigE 115, USB3 350, 10GigE 1150, CXP-12 1200' },
        ],
        outputs: [
          { key: 'dataRate', label: '데이터 레이트', en: 'Data Rate', unit: 'MB/s', digits: 1, primary: true },
          { key: 'usage', label: '대역폭 사용률', en: 'Link Usage', unit: '%', digits: 1, primary: true },
          { key: 'frameMB', label: '프레임당 용량', en: 'Per Frame', unit: 'MB', digits: 3 },
          { key: 'pixelRate', label: '픽셀 레이트', en: 'Pixel Rate', unit: 'Mpx/s', digits: 1 },
          { key: 'maxFps', label: '이 링크의 최대 fps', en: 'Max Frame Rate', unit: 'fps', digits: 1 },
          { key: 'hourGB', label: '1시간 저장 용량', en: 'Per Hour', unit: 'GB', digits: 1 },
        ],
        compute(v) {
          const frameBytes = bytesPerFrame(v.wpx, v.hpx, v.bitDepth);
          const dataRate = (frameBytes * v.fps) / 1e6;
          return {
            dataRate,
            usage: (dataRate / v.linkMBs) * 100,
            frameMB: frameBytes / 1e6,
            pixelRate: (v.wpx * v.hpx * v.fps) / 1e6,
            maxFps: (v.linkMBs * 1e6) / frameBytes,
            hourGB: (dataRate * 3600) / 1000,
          };
        },
        warn(v, o) {
          if (o.usage > 100) {
            return [{
              level: 'danger',
              text: `대역폭을 ${o.usage.toFixed(0)} % 요구합니다. 이 링크로는 ${o.maxFps.toFixed(1)} fps 까지만 나옵니다.`,
            }];
          }
          if (o.usage > 80) {
            return [{
              level: 'warn',
              text: `사용률이 ${o.usage.toFixed(0)} % 입니다. 여유가 적어 패킷 손실이나 프레임 드랍이 나기 쉬운 구간입니다.`,
            }];
          }
          return [{ level: 'info', text: `사용률 ${o.usage.toFixed(0)} % 로 여유가 있습니다.` }];
        },
      },
      {
        id: 'fps',
        name: '최대 fps 계산',
        en: 'Max Frame Rate',
        formula: '최대 fps = 대역폭 / (가로 × 세로 × 비트깊이 / 8)',
        inputs: [
          { key: 'wpx', label: '가로 화소수', en: 'Width', unit: 'px', profile: 'sensorWpx', min: 1, step: 1 },
          { key: 'hpx', label: '세로 화소수', en: 'Height', unit: 'px', profile: 'sensorHpx', min: 1, step: 1 },
          { key: 'bitDepth', label: '비트 깊이', en: 'Bit Depth', unit: 'bit', default: 8, min: 1, step: 1 },
          { key: 'linkMBs', label: '인터페이스 대역폭', en: 'Link Bandwidth', unit: 'MB/s', default: 115, min: 1, step: 1,
            hint: 'GigE 115, USB3 350, 10GigE 1150, CXP-12 1200' },
        ],
        outputs: [
          { key: 'maxFps', label: '최대 프레임레이트', en: 'Max Frame Rate', unit: 'fps', digits: 2, primary: true },
          { key: 'framePeriod', label: '프레임 주기', en: 'Frame Period', unit: 'ms', digits: 2, primary: true },
          { key: 'frameMB', label: '프레임당 용량', en: 'Per Frame', unit: 'MB', digits: 3 },
          { key: 'transferMs', label: '프레임 전송 시간', en: 'Transfer Time', unit: 'ms', digits: 2 },
        ],
        compute(v) {
          const frameBytes = bytesPerFrame(v.wpx, v.hpx, v.bitDepth);
          const maxFps = (v.linkMBs * 1e6) / frameBytes;
          return {
            maxFps,
            framePeriod: 1000 / maxFps,
            frameMB: frameBytes / 1e6,
            transferMs: frameBytes / v.linkMBs / 1000,
          };
        },
        warn() {
          return [{
            level: 'info',
            text: '링크 대역폭만 따진 값입니다. 센서 자체의 리드아웃 한계가 더 낮으면 그쪽이 실제 상한이 됩니다.',
          }];
        },
      },
    ],
  },

  {
    id: 'motion-blur',
    category: 'camera',
    name: '모션 블러',
    en: 'Motion Blur',
    summary: '이송 중 촬영할 때 상이 몇 픽셀 번지는지, 허용 범위에 들려면 노출을 얼마로 줄여야 하는지 구합니다',
    tags: ['모션 블러', 'motion blur', '노출', '이송', '컨베이어', '흔들림', 'exposure'],
    related: ['exposure-gain', 'line-rate'],
    modes: [
      {
        id: 'blur',
        name: '블러량 계산',
        en: 'Blur Amount',
        formula: '이동거리(µm) = 이송속도(mm/s) × 노출시간(µs) / 1000,   블러 = 이동거리 / 분해능',
        inputs: [
          { key: 'speed', label: '이송 속도', en: 'Speed', unit: 'mm/s', default: 100, min: 0, step: 1 },
          { key: 'exposureUs', label: '노출 시간', en: 'Exposure', unit: 'µs', default: 500, min: 0.1, step: 10 },
          { key: 'umPerPx', label: '대상 분해능', en: 'Spatial Resolution', unit: 'µm/px', default: 23.44, min: 0.01,
            hint: '렌즈 대분류의 분해능 계산기 결과' },
          { key: 'allowPx', label: '허용 블러', en: 'Allowed Blur', unit: 'px', default: 1, min: 0.1, step: 0.1 },
        ],
        outputs: [
          { key: 'blurPx', label: '블러', en: 'Blur', unit: 'px', digits: 2, primary: true },
          { key: 'blurUm', label: '이동 거리', en: 'Travel', unit: 'µm', digits: 1, primary: true },
          { key: 'maxExposureUs', label: '허용 최대 노출', en: 'Max Exposure', unit: 'µs', digits: 1 },
          { key: 'margin', label: '허용 대비', en: 'Ratio', unit: '×', digits: 2 },
        ],
        compute(v) {
          const blurUm = (v.speed * v.exposureUs) / 1000;
          const blurPx = blurUm / v.umPerPx;
          return {
            blurPx,
            blurUm,
            maxExposureUs: v.speed > 0 ? (v.allowPx * v.umPerPx * 1000) / v.speed : null,
            margin: blurPx / v.allowPx,
          };
        },
        diagram(v, o) {
          return [
            motionBlurView({
              blurPx: o.blurPx,
              blurUm: o.blurUm,
              umPerPx: v.umPerPx,
              exposureUs: v.exposureUs,
            }),
          ];
        },
        warn(v, o) {
          if (v.speed === 0) {
            return [{ level: 'info', text: '이송 속도가 0 이라 블러가 없습니다. 정지 촬영 조건입니다.' }];
          }
          if (o.blurPx > v.allowPx) {
            return [{
              level: 'warn',
              text: `블러 ${o.blurPx.toFixed(2)} px 가 허용 ${v.allowPx} px 를 넘습니다. 노출을 ${o.maxExposureUs.toFixed(0)} µs 이하로 줄이거나 조명을 밝혀야 합니다.`,
            }];
          }
          return [{ level: 'info', text: `허용 범위 안입니다. 노출을 ${o.maxExposureUs.toFixed(0)} µs 까지는 늘릴 수 있습니다.` }];
        },
      },
      {
        id: 'exposure',
        name: '허용 노출 계산',
        en: 'Max Exposure',
        formula: '최대 노출(µs) = 허용 블러(px) × 분해능(µm/px) × 1000 / 이송속도(mm/s)',
        inputs: [
          { key: 'speed', label: '이송 속도', en: 'Speed', unit: 'mm/s', default: 100, min: 0.01, step: 1 },
          { key: 'umPerPx', label: '대상 분해능', en: 'Spatial Resolution', unit: 'µm/px', default: 23.44, min: 0.01 },
          { key: 'allowPx', label: '허용 블러', en: 'Allowed Blur', unit: 'px', default: 1, min: 0.1, step: 0.1 },
        ],
        outputs: [
          { key: 'maxExposureUs', label: '최대 노출 시간', en: 'Max Exposure', unit: 'µs', digits: 1, primary: true },
          { key: 'maxExposureMs', label: '최대 노출 시간', en: 'Max Exposure', unit: 'ms', digits: 3 },
          { key: 'travelPerMs', label: '1 ms 당 이동', en: 'Travel per ms', unit: 'µm', digits: 1 },
          { key: 'impliedFps', label: '노출만 고려한 fps 상한', en: 'Exposure-limited', unit: 'fps', digits: 0 },
        ],
        compute(v) {
          const maxExposureUs = (v.allowPx * v.umPerPx * 1000) / v.speed;
          return {
            maxExposureUs,
            maxExposureMs: maxExposureUs / 1000,
            travelPerMs: v.speed,
            impliedFps: 1e6 / maxExposureUs,
          };
        },
        warn(v, o) {
          if (o.maxExposureUs < 50) {
            return [{
              level: 'warn',
              text: `허용 노출이 ${o.maxExposureUs.toFixed(1)} µs 로 매우 짧습니다. 스트로브 조명이나 더 밝은 조명이 필요합니다.`,
            }];
          }
          return [];
        },
      },
    ],
  },

  {
    id: 'line-rate',
    category: 'camera',
    name: '라인스캔 라인레이트',
    en: 'Line Rate',
    summary: '라인스캔 카메라의 필요 라인레이트와 그때 쓸 수 있는 최대 노출 시간을 구합니다',
    tags: ['라인스캔', 'line scan', '라인레이트', 'line rate', '인코더', 'TDI', '이송'],
    related: ['motion-blur', 'data-rate'],
    formula: '라인레이트 = 이송속도(mm/s) × 1000 / 이송방향 분해능(µm),   라인 주기 = 1 / 라인레이트',
    inputs: [
      { key: 'speed', label: '이송 속도', en: 'Speed', unit: 'mm/s', default: 200, min: 0.01, step: 1 },
      { key: 'umPerLine', label: '이송방향 분해능', en: 'Resolution', unit: 'µm/line', default: 20, min: 0.01, step: 0.1,
        hint: '한 라인이 담당하는 이송방향 길이' },
      { key: 'widthPx', label: '라인 화소수', en: 'Line Width', unit: 'px', default: 8192, min: 1, step: 1 },
      { key: 'bitDepth', label: '비트 깊이', en: 'Bit Depth', unit: 'bit', default: 8, min: 1, step: 1 },
    ],
    outputs: [
      { key: 'lineRate', label: '필요 라인레이트', en: 'Line Rate', unit: 'lines/s', digits: 0, primary: true },
      { key: 'lineRateKHz', label: '필요 라인레이트', en: 'Line Rate', unit: 'kHz', digits: 2, primary: true },
      { key: 'linePeriodUs', label: '라인 주기', en: 'Line Period', unit: 'µs', digits: 2 },
      { key: 'maxExposureUs', label: '최대 노출 시간', en: 'Max Exposure', unit: 'µs', digits: 2 },
      { key: 'dataRate', label: '데이터 레이트', en: 'Data Rate', unit: 'MB/s', digits: 1 },
      { key: 'scanWidth', label: '스캔 폭', en: 'Scan Width', unit: 'mm', digits: 1 },
    ],
    compute(v) {
      const lineRate = (v.speed * 1000) / v.umPerLine;
      return {
        lineRate,
        lineRateKHz: lineRate / 1000,
        linePeriodUs: 1e6 / lineRate,
        // 노출은 다음 라인이 시작되기 전에 끝나야 하므로 라인 주기가 상한이다.
        maxExposureUs: 1e6 / lineRate,
        dataRate: (v.widthPx * (v.bitDepth / 8) * lineRate) / 1e6,
        scanWidth: (v.widthPx * v.umPerLine) / 1000,
      };
    },
    warn(v, o) {
      const warns = [];
      if (o.lineRateKHz > 100) {
        warns.push({
          level: 'warn',
          text: `${o.lineRateKHz.toFixed(1)} kHz 는 일반 라인스캔 카메라의 상한을 넘습니다. 이송을 늦추거나 TDI 를 검토하세요.`,
        });
      }
      if (o.maxExposureUs < 20) {
        warns.push({
          level: 'warn',
          text: `노출 시간이 ${o.maxExposureUs.toFixed(1)} µs 밖에 안 됩니다. 라인스캔용 고휘도 조명이 필요합니다.`,
        });
      }
      warns.push({
        level: 'info',
        text: '정사각 픽셀로 찍으려면 이송방향 분해능을 가로 분해능과 같게 맞춰야 합니다.',
      });
      return warns;
    },
  },

  {
    id: 'binning-roi',
    category: 'camera',
    name: '비닝 · ROI',
    en: 'Binning & ROI',
    summary: '비닝과 관심영역으로 속도를 얼마나 올릴 수 있는지, 분해능은 얼마나 잃는지 구합니다',
    tags: ['비닝', 'binning', 'ROI', '관심영역', '부분 읽기', '감도', 'fps 증가'],
    related: ['data-rate', 'sensor-format'],
    formula: '출력 화소 = ROI / 비닝,   fps ∝ 원래 행수 / 출력 행수,   감도 ∝ 비닝²',
    inputs: [
      { key: 'wpx', label: '가로 화소수', en: 'Width', unit: 'px', profile: 'sensorWpx', min: 1, step: 1 },
      { key: 'hpx', label: '세로 화소수', en: 'Height', unit: 'px', profile: 'sensorHpx', min: 1, step: 1 },
      { key: 'roiH', label: 'ROI 세로', en: 'ROI Height', unit: 'px', default: 1024, min: 1, step: 1,
        hint: '읽어들일 행 수. 전체를 쓰면 세로 화소수와 같게' },
      { key: 'bin', label: '비닝', en: 'Binning', unit: '×', default: 1, min: 1, step: 1,
        hint: '2 면 2×2 를 한 픽셀로 합칩니다' },
      { key: 'baseFps', label: '전체 읽기 fps', en: 'Full-frame fps', unit: 'fps', default: 30, min: 0.01, step: 1 },
      { key: 'pixelUm', label: '센서 픽셀 크기', en: 'Pixel Pitch', unit: 'µm', profile: 'pixelSize', min: 0.1, step: 0.1 },
    ],
    outputs: [
      { key: 'outW', label: '출력 가로', en: 'Output Width', unit: 'px', digits: 0, primary: true },
      { key: 'outH', label: '출력 세로', en: 'Output Height', unit: 'px', digits: 0, primary: true },
      { key: 'newFps', label: '예상 fps', en: 'Expected fps', unit: 'fps', digits: 1 },
      { key: 'speedUp', label: '속도 배수', en: 'Speed-up', unit: '×', digits: 2 },
      { key: 'sensitivity', label: '감도 배수', en: 'Sensitivity', unit: '×', digits: 0 },
      { key: 'effectivePitch', label: '실효 픽셀 크기', en: 'Effective Pitch', unit: 'µm', digits: 2 },
    ],
    compute(v) {
      const outW = Math.floor(v.wpx / v.bin);
      const outH = Math.floor(Math.min(v.roiH, v.hpx) / v.bin);
      // 대부분의 센서는 행 단위로 읽으므로 프레임레이트는 행 수에 반비례한다.
      const rows = Math.min(v.roiH, v.hpx) / v.bin;
      const speedUp = v.hpx / rows;
      return {
        outW,
        outH,
        newFps: v.baseFps * speedUp,
        speedUp,
        sensitivity: v.bin * v.bin,
        effectivePitch: v.pixelUm * v.bin,
      };
    },
    warn(v, o) {
      const warns = [];
      if (v.roiH > v.hpx) {
        warns.push({ level: 'warn', text: 'ROI 세로가 센서 세로보다 큽니다. 센서 크기로 잘라 계산했습니다.' });
      }
      if (v.bin > 1) {
        warns.push({
          level: 'info',
          text: `비닝 ${v.bin} 배로 감도가 ${o.sensitivity} 배 올라가지만, 실효 픽셀이 ${o.effectivePitch.toFixed(2)} µm 로 커져 분해능은 ${v.bin} 배 나빠집니다.`,
        });
      }
      warns.push({
        level: 'info',
        text: 'fps 는 행 수에 반비례한다고 보고 계산한 근사입니다. 실제 상한은 카메라 스펙시트를 확인하세요.',
      });
      return warns;
    },
  },

  {
    id: 'rolling-shutter',
    category: 'camera',
    name: '롤링 셔터 왜곡',
    en: 'Rolling Shutter',
    summary: '롤링 셔터로 움직이는 대상을 찍을 때 상이 얼마나 기우는지 구합니다',
    tags: ['롤링 셔터', 'rolling shutter', '글로벌 셔터', '왜곡', 'skew', '리드아웃', 'readout'],
    related: ['motion-blur', 'data-rate'],
    formula: '기울기 이동량 = 이송속도 × 리드아웃 시간,   기울기 각도 = atan(이동량 / 세로 길이)',
    inputs: [
      { key: 'readoutUs', label: '프레임 리드아웃 시간', en: 'Readout Time', unit: 'µs', default: 10000, min: 1, step: 100,
        hint: '첫 행부터 마지막 행까지 걸리는 시간' },
      { key: 'speed', label: '이송 속도', en: 'Speed', unit: 'mm/s', default: 100, min: 0, step: 1 },
      { key: 'umPerPx', label: '대상 분해능', en: 'Spatial Resolution', unit: 'µm/px', default: 23.44, min: 0.01 },
      { key: 'rows', label: '세로 화소수', en: 'Rows', unit: 'px', profile: 'sensorHpx', min: 1, step: 1 },
    ],
    outputs: [
      { key: 'shiftPx', label: '상하 어긋남', en: 'Skew Shift', unit: 'px', digits: 2, primary: true },
      { key: 'skewDeg', label: '기울기 각도', en: 'Skew Angle', unit: '°', digits: 3, primary: true },
      { key: 'shiftUm', label: '상하 어긋남', en: 'Skew Shift', unit: 'µm', digits: 1 },
      { key: 'lineTimeUs', label: '행당 시간', en: 'Line Time', unit: 'µs', digits: 3 },
    ],
    compute(v) {
      const shiftUm = (v.speed * v.readoutUs) / 1000;
      const shiftPx = shiftUm / v.umPerPx;
      return {
        shiftPx,
        // 세로 rows 픽셀을 지나는 동안 가로로 shiftPx 밀린 만큼이 기울기다.
        skewDeg: (Math.atan(shiftPx / v.rows) * 180) / Math.PI,
        shiftUm,
        lineTimeUs: v.readoutUs / v.rows,
      };
    },
    diagram(v, o) {
      return [
        rollingShutterView({
          shiftPx: o.shiftPx,
          skewDeg: o.skewDeg,
          readoutUs: v.readoutUs,
          rows: v.rows,
        }),
      ];
    },
    warn(v, o) {
      if (v.speed === 0) {
        return [{ level: 'info', text: '정지 상태에서는 롤링 셔터 왜곡이 없습니다.' }];
      }
      if (o.shiftPx > 1) {
        return [{
          level: 'warn',
          text: `${o.shiftPx.toFixed(2)} px 어긋납니다. 치수 측정에는 쓰기 어려우니 글로벌 셔터 카메라나 스트로브 조명을 검토하세요.`,
        }];
      }
      return [{ level: 'info', text: `어긋남이 ${o.shiftPx.toFixed(2)} px 로 1 픽셀 미만입니다.` }];
    },
  },

  {
    id: 'dynamic-range',
    category: 'camera',
    name: '다이나믹 레인지 · SNR',
    en: 'Dynamic Range',
    summary: '포화 전자수와 읽기 잡음으로 계조 범위와 최대 신호대잡음비를 구합니다',
    tags: ['다이나믹 레인지', 'dynamic range', 'SNR', '잡음', 'noise', '포화', 'full well', '비트 깊이'],
    related: ['exposure-gain', 'sensor-format'],
    formula: 'DR(dB) = 20 × log₁₀(포화 전자수 / 읽기 잡음),   최대 SNR(dB) = 10 × log₁₀(포화 전자수)',
    inputs: [
      { key: 'fullWell', label: '포화 전자수', en: 'Full Well', unit: 'e⁻', default: 10500, min: 1, step: 100,
        hint: '스펙시트의 Full Well Capacity / Saturation Capacity' },
      { key: 'readNoise', label: '읽기 잡음', en: 'Read Noise', unit: 'e⁻', default: 2.4, min: 0.01, step: 0.1 },
      { key: 'bitDepth', label: '비트 깊이', en: 'Bit Depth', unit: 'bit', default: 12, min: 1, step: 1 },
    ],
    outputs: [
      { key: 'drDb', label: '다이나믹 레인지', en: 'Dynamic Range', unit: 'dB', digits: 1, primary: true },
      { key: 'maxSnrDb', label: '최대 SNR', en: 'Max SNR', unit: 'dB', digits: 1, primary: true },
      { key: 'drRatio', label: '계조 비율', en: 'Ratio', unit: ': 1', digits: 0 },
      { key: 'neededBits', label: '필요 비트 깊이', en: 'Bits Needed', unit: 'bit', digits: 2 },
      { key: 'levelsPerAdu', label: 'ADU 당 전자수', en: 'e⁻ / ADU', digits: 2 },
      { key: 'drStops', label: '노출 단계', en: 'Stops', unit: 'stop', digits: 1 },
    ],
    compute(v) {
      const drRatio = v.fullWell / v.readNoise;
      return {
        drDb: 20 * Math.log10(drRatio),
        // 포화 근처에서는 샷 잡음이 지배하므로 SNR 은 전자수의 제곱근이다.
        maxSnrDb: 10 * Math.log10(v.fullWell),
        drRatio,
        neededBits: Math.log2(drRatio),
        levelsPerAdu: v.fullWell / (2 ** v.bitDepth - 1),
        drStops: Math.log2(drRatio),
      };
    },
    warn(v, o) {
      const warns = [];
      if (v.bitDepth < o.neededBits) {
        warns.push({
          level: 'warn',
          text: `센서는 ${o.neededBits.toFixed(1)} bit 만큼의 계조를 내는데 ${v.bitDepth} bit 로 읽고 있습니다. 어두운 쪽 정보가 버려집니다.`,
        });
      } else if (v.bitDepth > o.neededBits + 2) {
        warns.push({
          level: 'info',
          text: `${v.bitDepth} bit 는 센서 성능(${o.neededBits.toFixed(1)} bit)보다 여유가 많습니다. 낮춰서 대역폭을 아낄 수 있습니다.`,
        });
      }
      if (o.levelsPerAdu < 1) {
        warns.push({
          level: 'info',
          text: `ADU 하나가 ${o.levelsPerAdu.toFixed(2)} 전자에 해당합니다. 양자화가 잡음보다 촘촘한 상태입니다.`,
        });
      }
      return warns;
    },
  },

  {
    id: 'exposure-gain',
    category: 'camera',
    name: '노출 · 게인 트레이드오프',
    en: 'Exposure & Gain',
    summary: '노출을 줄이려면 게인이나 조명을 얼마나 올려야 하고 SNR 은 얼마나 나빠지는지 구합니다',
    tags: ['노출', '게인', 'gain', 'exposure', 'SNR', '조명', '밝기', 'dB', '스톱'],
    related: ['motion-blur', 'dynamic-range'],
    formula: '보정 배수 = 기준 노출 / 목표 노출,   게인(dB) = 20 × log₁₀(배수),   SNR 저하(dB) = 10 × log₁₀(배수)',
    inputs: [
      { key: 'baseUs', label: '기준 노출 시간', en: 'Base Exposure', unit: 'µs', default: 1000, min: 0.1, step: 10,
        hint: '지금 쓰고 있는 노출' },
      { key: 'targetUs', label: '목표 노출 시간', en: 'Target Exposure', unit: 'µs', default: 250, min: 0.1, step: 10,
        hint: '모션 블러 때문에 줄여야 하는 노출' },
    ],
    outputs: [
      { key: 'factor', label: '보정 배수', en: 'Compensation', unit: '×', digits: 2, primary: true },
      { key: 'gainDb', label: '필요 게인', en: 'Gain', unit: 'dB', digits: 2, primary: true },
      { key: 'stops', label: '노출 단계', en: 'Stops', unit: 'stop', digits: 2 },
      { key: 'snrLossDb', label: 'SNR 저하', en: 'SNR Loss', unit: 'dB', digits: 2 },
      { key: 'snrRatio', label: 'SNR 비율', en: 'SNR Ratio', unit: '×', digits: 3 },
      { key: 'lightFactor', label: '조명으로 보정 시', en: 'Light Increase', unit: '×', digits: 2 },
    ],
    compute(v) {
      const factor = v.baseUs / v.targetUs;
      return {
        factor,
        gainDb: 20 * Math.log10(factor),
        stops: Math.log2(factor),
        // 샷 잡음이 지배하면 SNR 은 신호의 제곱근에 비례한다.
        snrLossDb: 10 * Math.log10(factor),
        snrRatio: 1 / Math.sqrt(factor),
        lightFactor: factor,
      };
    },
    warn(v, o) {
      const warns = [];
      if (o.factor <= 1) {
        warns.push({ level: 'info', text: '목표 노출이 기준보다 길거나 같아 보정이 필요 없습니다.' });
        return warns;
      }
      if (o.gainDb > 12) {
        warns.push({
          level: 'warn',
          text: `게인 ${o.gainDb.toFixed(1)} dB 는 잡음이 눈에 띄게 늘어나는 구간입니다. 게인 대신 조명을 ${o.lightFactor.toFixed(1)} 배 밝히는 쪽이 화질에 유리합니다.`,
        });
      }
      warns.push({
        level: 'info',
        text: `게인으로 보정하면 SNR 이 ${o.snrLossDb.toFixed(1)} dB 떨어집니다. 조명으로 보정하면 SNR 은 유지됩니다.`,
      });
      return warns;
    },
  },
];
