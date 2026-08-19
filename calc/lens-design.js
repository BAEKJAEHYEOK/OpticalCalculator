// 렌즈 대분류 - 설계·구성 계산기.
// 렌즈 자체를 다루는 공식들. 현장에서 장비를 고를 때 쓰는 것은 lens.js 에 있다.

import { imageCircleView, thinLensView } from '../core/diagram.js';
import { sensorSize, effectiveFNumber } from './shared.js';

export const lensDesignCalculators = [
  {
    id: 'thin-lens',
    category: 'lens',
    name: '박막렌즈 결상',
    en: 'Thin Lens',
    summary: '물체거리와 초점거리로 상이 어디에 얼마나 크게 맺히는지 구합니다',
    tags: ['결상', '박막렌즈', 'thin lens', '실상', '허상', '물체거리', '상거리', '뉴턴'],
    related: ['lens-select', 'lens-combination'],
    modes: [
      {
        id: 'image',
        name: '상거리 계산',
        en: 'Image Distance',
        formula: [
          '1 / 초점거리 = 1 / 물체거리 + 1 / 상거리',
          '상거리 = 물체거리 × 초점거리 / (물체거리 − 초점거리)',
          '배율 = 상거리 / 물체거리',
        ],
        inputs: [
          { key: 'f', label: '초점거리', en: 'Focal Length', unit: 'mm', default: 50, min: 0.1, step: 0.1 },
          { key: 'a', label: '물체거리', en: 'Object Distance', unit: 'mm', default: 300, min: 0.1,
            hint: '렌즈 주점에서 대상까지' },
        ],
        outputs: [
          { key: 'b', label: '상거리', en: 'Image Distance', unit: 'mm', digits: 2, primary: true },
          { key: 'm', label: '배율', en: 'Magnification', unit: '×', digits: 4, primary: true },
          { key: 'invA', label: '1 / 물체거리', en: '1/a', unit: '1/mm', digits: 5 },
          { key: 'invB', label: '1 / 상거리', en: '1/b', unit: '1/mm', digits: 5 },
        ],
        compute(v) {
          // a = f 이면 광선이 평행하게 나가 상이 맺히지 않는다(분모 0).
          const b = (v.a * v.f) / (v.a - v.f);
          return { b, m: b / v.a, invA: 1 / v.a, invB: 1 / b, _virtual: v.a < v.f };
        },
        diagram(v, o) {
          if (!Number.isFinite(o.b)) return [];
          return [thinLensView({ f: v.f, a: v.a, b: o.b, m: o.m, virtual: o._virtual })];
        },
        warn(v, o) {
          if (Math.abs(v.a - v.f) < 1e-9) {
            return [{
              level: 'danger',
              text: '물체거리가 초점거리와 같습니다. 광선이 평행하게 나가 상이 맺히지 않습니다.',
            }];
          }
          if (o._virtual) {
            return [{
              level: 'info',
              text: '물체거리가 초점거리보다 짧아 허상이 맺힙니다. 상거리가 음수인 것은 상이 대상과 같은 쪽에 있다는 뜻이며, 돋보기로 쓰는 조건입니다.',
            }];
          }
          const warns = [];
          if (o.m > 1) {
            warns.push({ level: 'info', text: `배율 ${o.m.toFixed(2)} 배로 확대 결상입니다. 상거리가 물체거리보다 깁니다.` });
          }
          return warns;
        },
      },
      {
        id: 'focal',
        name: '초점거리 계산',
        en: 'Focal Length',
        formula: [
          '초점거리 = 물체거리 × 상거리 / (물체거리 + 상거리)',
          '배율 = 상거리 / 물체거리',
        ],
        inputs: [
          { key: 'a', label: '물체거리', en: 'Object Distance', unit: 'mm', default: 300, min: 0.1 },
          { key: 'b', label: '상거리', en: 'Image Distance', unit: 'mm', default: 60, min: 0.1 },
        ],
        outputs: [
          { key: 'f', label: '초점거리', en: 'Focal Length', unit: 'mm', digits: 2, primary: true },
          { key: 'm', label: '배율', en: 'Magnification', unit: '×', digits: 4 },
          { key: 'total', label: '전체 길이', en: 'Object to Image', unit: 'mm', digits: 1 },
        ],
        compute(v) {
          return { f: (v.a * v.b) / (v.a + v.b), m: v.b / v.a, total: v.a + v.b };
        },
        diagram(v, o) {
          return [thinLensView({ f: o.f, a: v.a, b: v.b, m: o.m, virtual: false })];
        },
        warn(v, o) {
          // 유한 거리 결상에서 물체~상 최소 길이는 4f 다. 등배일 때 그 값에 닿는다.
          if (v.a + v.b < 4 * o.f - 1e-6) {
            return [{ level: 'warn', text: '물체~상 거리가 4f 보다 짧습니다. 실제로는 성립하지 않는 조합입니다.' }];
          }
          if (Math.abs(o.m - 1) < 0.02) {
            return [{ level: 'info', text: '등배(1:1) 조건입니다. 이때 물체~상 거리가 4f 로 최소가 됩니다.' }];
          }
          return [];
        },
      },
    ],
  },

  {
    id: 'image-circle',
    category: 'lens',
    name: '이미지 서클 · 비네팅',
    en: 'Image Circle',
    summary: '렌즈가 만드는 상의 원이 센서 모서리까지 덮는지 확인합니다',
    tags: ['이미지 서클', 'image circle', '비네팅', 'vignetting', '대각', '센서 포맷', '커버'],
    related: ['lens-select', 'aperture'],
    formula: [
      '센서 대각 = √(센서 가로² + 센서 세로²)',
      '여유 = 이미지 서클 지름 − 센서 대각',
      '이미지 서클이 센서 대각보다 커야 모서리까지 덮습니다',
    ],
    inputs: [
      { key: 'wpx', label: '가로 화소수', en: 'Width', unit: 'px', profile: 'sensorWpx', min: 1, step: 1 },
      { key: 'hpx', label: '세로 화소수', en: 'Height', unit: 'px', profile: 'sensorHpx', min: 1, step: 1 },
      { key: 'pixelUm', label: '센서 픽셀 크기', en: 'Pixel Pitch', unit: 'µm', profile: 'pixelSize',
        min: 0.1, step: 0.1 },
      { key: 'circleDia', label: '이미지 서클 지름', en: 'Image Circle', unit: 'mm', default: 35, min: 0.1, step: 0.1,
        hint: '렌즈 스펙시트의 Image Circle 값' },
    ],
    outputs: [
      { key: 'diag', label: '센서 대각', en: 'Sensor Diagonal', unit: 'mm', digits: 2, primary: true },
      { key: 'margin', label: '여유', en: 'Margin', unit: 'mm', digits: 2, primary: true },
      { key: 'marginPct', label: '여유율', en: 'Margin', unit: '%', digits: 1 },
      { key: 'sensorW', label: '센서 가로', en: 'Sensor W', unit: 'mm', digits: 2 },
      { key: 'sensorH', label: '센서 세로', en: 'Sensor H', unit: 'mm', digits: 2 },
      { key: 'maxDiag', label: '지원 가능 최대 대각', en: 'Max Diagonal', unit: 'mm', digits: 2 },
    ],
    compute(v) {
      const sensor = sensorSize(v.wpx, v.hpx, v.pixelUm);
      return {
        diag: sensor.diag,
        margin: v.circleDia - sensor.diag,
        marginPct: ((v.circleDia - sensor.diag) / sensor.diag) * 100,
        sensorW: sensor.w,
        sensorH: sensor.h,
        maxDiag: v.circleDia,
        _sensor: sensor,
      };
    },
    diagram(v, o) {
      return [
        imageCircleView({
          circleDia: v.circleDia,
          sensorW: o.sensorW,
          sensorH: o.sensorH,
          diag: o.diag,
        }),
      ];
    },
    warn(v, o) {
      if (o.margin < 0) {
        return [{
          level: 'danger',
          text: `이미지 서클이 센서 대각보다 ${Math.abs(o.margin).toFixed(2)} mm 작습니다. 모서리가 어두워지거나 잘립니다.`,
        }];
      }
      if (o.marginPct < 5) {
        return [{
          level: 'warn',
          text: `여유가 ${o.marginPct.toFixed(1)} % 뿐입니다. 스펙상 덮더라도 모서리 해상력과 밝기가 떨어지는 구간입니다.`,
        }];
      }
      return [{ level: 'info', text: `여유 ${o.marginPct.toFixed(1)} % 로 센서를 덮습니다.` }];
    },
  },

  {
    id: 'extension-tube',
    category: 'lens',
    name: '익스텐션 튜브',
    en: 'Extension Tube',
    summary: '접사링을 끼웠을 때 배율이 얼마나 오르고 작동거리와 밝기가 어떻게 변하는지 구합니다',
    tags: ['익스텐션', '접사링', 'extension tube', '접사', '매크로', '배율 증가', '광량'],
    related: ['thin-lens', 'aperture'],
    formula: [
      '추가 배율 = 튜브 길이 / 렌즈 초점거리',
      '총 배율 = 원래 배율 + 추가 배율',
      '상거리 = 렌즈 초점거리 × (1 + 총 배율)',
      '물체거리 = 렌즈 초점거리 × (1 + 총 배율) / 총 배율',
      '광량 손실(스톱) = 2 × log₂(1 + 총 배율)',
    ],
    inputs: [
      { key: 'f', label: '렌즈 초점거리', en: 'Focal Length', unit: 'mm', profile: 'focalLength', min: 1, step: 0.1 },
      { key: 'tube', label: '튜브 길이', en: 'Tube Length', unit: 'mm', default: 10, min: 0, step: 0.5,
        hint: '끼워 넣는 접사링의 두께 합' },
      { key: 'baseM', label: '원래 배율', en: 'Base Magnification', unit: '×', default: 0, min: 0, step: 0.01,
        hint: '무한원 초점이면 0' },
      { key: 'fNumber', label: 'F수', en: 'F-number', unit: '', profile: 'fNumber', min: 0.7, step: 0.1 },
    ],
    outputs: [
      { key: 'addedM', label: '추가 배율', en: 'Added Magnification', unit: '×', digits: 4, primary: true },
      { key: 'totalM', label: '총 배율', en: 'Total Magnification', unit: '×', digits: 4, primary: true },
      { key: 'objectDist', label: '물체거리', en: 'Object Distance', unit: 'mm', digits: 1 },
      { key: 'imageDist', label: '상거리', en: 'Image Distance', unit: 'mm', digits: 1 },
      { key: 'effectiveN', label: '유효 F수', en: 'Effective F-number', unit: '', digits: 2 },
      { key: 'lightLoss', label: '광량 손실', en: 'Light Loss', unit: 'stop', digits: 2 },
    ],
    compute(v) {
      const addedM = v.tube / v.f;
      const totalM = v.baseM + addedM;
      return {
        addedM,
        totalM,
        // 배율이 0 이면 무한원이라 물체거리가 정의되지 않는다.
        objectDist: totalM > 0 ? (v.f * (1 + totalM)) / totalM : null,
        imageDist: v.f * (1 + totalM),
        effectiveN: effectiveFNumber(v.fNumber, totalM),
        lightLoss: 2 * Math.log2(1 + totalM),
      };
    },
    warn(v, o) {
      const warns = [];
      if (v.tube === 0) {
        warns.push({ level: 'info', text: '튜브 길이가 0 이라 원래 배율 그대로입니다.' });
        return warns;
      }
      if (o.lightLoss > 1) {
        warns.push({
          level: 'warn',
          text: `${o.lightLoss.toFixed(2)} 스톱 어두워집니다. 노출 시간이나 조명을 그만큼 늘려야 같은 밝기가 나옵니다.`,
        });
      }
      if (o.objectDist !== null && o.objectDist < v.f * 2) {
        warns.push({
          level: 'warn',
          text: `물체거리가 ${o.objectDist.toFixed(1)} mm 까지 짧아집니다. 렌즈 앞단이 대상에 닿거나 조명 넣을 공간이 없을 수 있습니다.`,
        });
      }
      return warns;
    },
  },

  {
    id: 'lens-combination',
    category: 'lens',
    name: '두 렌즈 조합',
    en: 'Two-Lens Combination',
    summary: '렌즈 두 장을 간격을 두고 놓았을 때의 합성 초점거리와 후초점거리를 구합니다',
    tags: ['조합', 'combination', '합성 초점거리', '후초점거리', 'BFD', '클로즈업 렌즈', '굴절력', '디옵터', 'diopter'],
    related: ['thin-lens', 'lens-maker'],
    formula: [
      '1 / 합성 초점거리 = 1 / 첫 렌즈 초점거리 + 1 / 둘째 렌즈 초점거리 − 렌즈 간격 / (첫 렌즈 초점거리 × 둘째 렌즈 초점거리)',
      '후초점거리 = 합성 초점거리 × (첫 렌즈 초점거리 − 렌즈 간격) / 첫 렌즈 초점거리',
    ],
    inputs: [
      { key: 'f1', label: '첫 렌즈 초점거리', en: 'Focal Length 1', unit: 'mm', default: 100, step: 0.1,
        hint: '오목렌즈는 음수로 넣습니다' },
      { key: 'f2', label: '둘째 렌즈 초점거리', en: 'Focal Length 2', unit: 'mm', default: 200, step: 0.1 },
      { key: 'd', label: '렌즈 간격', en: 'Separation', unit: 'mm', default: 0, min: 0, step: 0.1 },
    ],
    outputs: [
      { key: 'f', label: '합성 초점거리', en: 'Combined Focal Length', unit: 'mm', digits: 2, primary: true },
      { key: 'bfd', label: '후초점거리', en: 'Back Focal Distance', unit: 'mm', digits: 2, primary: true },
      { key: 'power', label: '합성 굴절력', en: 'Optical Power', unit: 'diopter', digits: 4 },
      { key: 'power1', label: '첫 렌즈 굴절력', en: 'Power 1', unit: 'diopter', digits: 4 },
      { key: 'power2', label: '둘째 렌즈 굴절력', en: 'Power 2', unit: 'diopter', digits: 4 },
    ],
    compute(v) {
      // 굴절력은 1/m 단위(디옵터)이므로 mm 를 m 로 환산해 계산한다.
      const p1 = 1000 / v.f1;
      const p2 = 1000 / v.f2;
      const power = p1 + p2 - (v.d / 1000) * p1 * p2;
      const f = 1000 / power;
      return {
        f,
        bfd: (f * (v.f1 - v.d)) / v.f1,
        power,
        power1: p1,
        power2: p2,
      };
    },
    warn(v, o) {
      const warns = [];
      if (Math.abs(o.power) < 1e-9 || !Number.isFinite(o.f)) {
        warns.push({
          level: 'warn',
          text: '합성 굴절력이 0 입니다. 무초점(afocal) 조합이라 평행광이 평행광으로 나갑니다. 간격이 f₁ + f₂ 인 망원경 배치입니다.',
        });
        return warns;
      }
      if (o.f < 0) {
        warns.push({ level: 'info', text: '합성 초점거리가 음수입니다. 전체가 오목렌즈처럼 발산합니다.' });
      }
      if (o.bfd < 0) {
        warns.push({
          level: 'warn',
          text: '후초점거리가 음수입니다. 초점이 둘째 렌즈보다 앞쪽에 맺혀 센서를 놓을 수 없습니다.',
        });
      }
      if (v.d === 0) {
        warns.push({ level: 'info', text: '간격 0 은 두 렌즈를 밀착시킨 조건입니다. 굴절력이 단순히 더해집니다.' });
      }
      return warns;
    },
  },

  {
    id: 'lens-maker',
    category: 'lens',
    name: '렌즈메이커 공식',
    en: "Lensmaker's Equation",
    summary: '유리의 굴절률과 양면 곡률반경으로 초점거리를 구합니다',
    tags: ['렌즈메이커', 'lensmaker', '곡률반경', '굴절률', 'curvature', 'index', '두께', '디옵터', 'diopter', 'BK7'],
    related: ['lens-combination', 'thin-lens'],
    formula: [
      '1 / 초점거리 = (굴절률 − 1) × ( 1 / 앞면 곡률반경 − 1 / 뒷면 곡률반경 + 두께항 )',
      '두께항 = (굴절률 − 1) × 중심 두께 / (굴절률 × 앞면 곡률반경 × 뒷면 곡률반경)',
      '중심 두께가 0 이면 두께항이 사라져 박막렌즈 식이 됩니다',
    ],
    inputs: [
      { key: 'n', label: '굴절률', en: 'Refractive Index', unit: '', default: 1.5168, min: 1.001, step: 0.001,
        hint: 'B270 유리 1.523, BK7 1.5168' },
      { key: 'r1', label: '앞면 곡률반경', en: 'Radius 1', unit: 'mm', default: 51.5, step: 0.1,
        hint: '볼록은 양수, 오목은 음수. 평면은 0' },
      { key: 'r2', label: '뒷면 곡률반경', en: 'Radius 2', unit: 'mm', default: -51.5, step: 0.1 },
      { key: 'thickness', label: '중심 두께', en: 'Center Thickness', unit: 'mm', default: 0, min: 0, step: 0.1,
        hint: '0 이면 박막렌즈로 계산합니다' },
    ],
    outputs: [
      { key: 'f', label: '초점거리', en: 'Focal Length', unit: 'mm', digits: 2, primary: true },
      { key: 'power', label: '굴절력', en: 'Optical Power', unit: 'diopter', digits: 4 },
      { key: 'thinF', label: '박막 근사 초점거리', en: 'Thin Lens f', unit: 'mm', digits: 2 },
      { key: 'thicknessEffect', label: '두께에 의한 차이', en: 'Difference', unit: 'mm', digits: 3 },
    ],
    compute(v) {
      // 평면은 곡률반경이 무한대다. 0 을 입력받아 1/R = 0 으로 처리한다.
      const c1 = v.r1 === 0 ? 0 : 1 / v.r1;
      const c2 = v.r2 === 0 ? 0 : 1 / v.r2;
      const thin = 1 / ((v.n - 1) * (c1 - c2));
      const thickTerm = ((v.n - 1) * v.thickness * c1 * c2) / v.n;
      const f = 1 / ((v.n - 1) * (c1 - c2 + thickTerm));
      return {
        f,
        power: 1000 / f,
        thinF: thin,
        thicknessEffect: f - thin,
      };
    },
    warn(v, o) {
      const warns = [];
      if (!Number.isFinite(o.f)) {
        warns.push({
          level: 'danger',
          text: '양면 곡률이 같아 굴절력이 0 입니다. 초점이 맺히지 않는 평행판입니다.',
        });
        return warns;
      }
      if (o.f < 0) {
        warns.push({ level: 'info', text: '초점거리가 음수입니다. 빛을 발산시키는 오목렌즈입니다.' });
      }
      if (v.thickness > 0 && Math.abs(o.thicknessEffect) > Math.abs(o.thinF) * 0.02) {
        warns.push({
          level: 'info',
          text: `두께 ${v.thickness} mm 때문에 박막 근사와 ${o.thicknessEffect.toFixed(2)} mm 차이가 납니다. 박막 근사를 쓰기 어려운 두께입니다.`,
        });
      }
      return warns;
    },
  },
];
