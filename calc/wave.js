// 파동 · 재료 대분류.
// 빛이 매질 경계를 지날 때 생기는 굴절·반사·회절을 다룬다.
// 유리를 통해 들여다보는 검사에서는 평행판 계산이 특히 자주 쓰인다.

import { degToRad, radToDeg, LAMBDA_UM } from '../core/units.js';
import { refractionView, plateShiftView } from '../core/diagram.js';

// 수직 입사에서의 프레넬 반사율.
const normalReflectance = (n1, n2) => ((n1 - n2) / (n1 + n2)) ** 2;

// 비편광 빛의 반사율. s 편광과 p 편광의 평균이다.
function fresnel(n1, n2, theta1Deg) {
  const t1 = degToRad(theta1Deg);
  const sinT2 = (n1 * Math.sin(t1)) / n2;
  if (Math.abs(sinT2) > 1) return { reflectance: 1, theta2: null, total: true };
  const t2 = Math.asin(sinT2);
  const cos1 = Math.cos(t1);
  const cos2 = Math.cos(t2);
  const rs = ((n1 * cos1 - n2 * cos2) / (n1 * cos1 + n2 * cos2)) ** 2;
  const rp = ((n1 * cos2 - n2 * cos1) / (n1 * cos2 + n2 * cos1)) ** 2;
  return { reflectance: (rs + rp) / 2, theta2: radToDeg(t2), total: false, rs, rp };
}

const GLASS_HINT = '공기 1.0, 물 1.333, 유리 1.52, 아크릴 1.49';

export const waveCalculators = [
  {
    id: 'snell',
    category: 'wave',
    name: '스넬 법칙 · 굴절',
    en: "Snell's Law",
    summary: '매질이 바뀔 때 빛이 얼마나 꺾이고 얼마나 반사되는지 구합니다',
    tags: ['스넬', 'snell', '굴절', 'refraction', '굴절률', '프레넬', 'fresnel', '반사율', '입사각'],
    related: ['critical-angle', 'plane-plate'],
    formula: [
      '입사 매질 굴절률 × sin(입사각) = 투과 매질 굴절률 × sin(굴절각)',
      '반사율은 프레넬 식의 s 편광·p 편광 평균',
      '수직 입사 반사율 = ( (굴절률₁ − 굴절률₂) / (굴절률₁ + 굴절률₂) )²',
    ],
    inputs: [
      { key: 'n1', label: '입사 매질 굴절률', en: 'Index 1', unit: '', default: 1.0, min: 1, step: 0.001, hint: GLASS_HINT },
      { key: 'n2', label: '투과 매질 굴절률', en: 'Index 2', unit: '', default: 1.52, min: 1, step: 0.001 },
      { key: 'theta1', label: '입사각', en: 'Incidence', unit: '°', default: 30, min: 0, max: 89.9, step: 1,
        hint: '경계면 법선에서 잰 각도' },
    ],
    outputs: [
      { key: 'theta2', label: '굴절각', en: 'Refraction', unit: '°', digits: 3, primary: true },
      { key: 'reflectancePct', label: '반사율', en: 'Reflectance', unit: '%', digits: 2, primary: true },
      { key: 'transmittancePct', label: '투과율', en: 'Transmittance', unit: '%', digits: 2 },
      { key: 'normalPct', label: '수직 입사 반사율', en: 'At Normal', unit: '%', digits: 2 },
      { key: 'deviation', label: '광선 꺾임각', en: 'Deviation', unit: '°', digits: 3 },
    ],
    compute(v) {
      const f = fresnel(v.n1, v.n2, v.theta1);
      return {
        theta2: f.theta2,
        reflectancePct: f.reflectance * 100,
        transmittancePct: (1 - f.reflectance) * 100,
        normalPct: normalReflectance(v.n1, v.n2) * 100,
        deviation: f.theta2 === null ? null : Math.abs(v.theta1 - f.theta2),
        _total: f.total,
        _reflectance: f.reflectance,
      };
    },
    diagram(v, o) {
      return [
        refractionView({
          n1: v.n1,
          n2: v.n2,
          theta1: v.theta1,
          theta2: o.theta2 ?? 0,
          reflectance: o._reflectance,
          total: o._total,
        }),
      ];
    },
    warn(v, o) {
      const warns = [];
      if (o._total) {
        warns.push({
          level: 'danger',
          text: '전반사가 일어나 빛이 넘어가지 못합니다. 입사각이 임계각을 넘었습니다.',
        });
        return warns;
      }
      if (o.reflectancePct > 20) {
        warns.push({
          level: 'warn',
          text: `반사율이 ${o.reflectancePct.toFixed(1)} % 입니다. 이 각도에서는 반사광이 강해 검사 화면에 번들거림으로 나타나기 쉽습니다.`,
        });
      }
      warns.push({
        level: 'info',
        text: `수직으로 입사시키면 반사율이 ${o.normalPct.toFixed(2)} % 로 떨어집니다. 유리 검사에서 반사를 줄이려면 각도를 세우거나 반사방지 코팅을 씁니다.`,
      });
      return warns;
    },
  },

  {
    id: 'critical-angle',
    category: 'wave',
    name: '임계각 · 전반사',
    en: 'Critical Angle',
    summary: '전반사가 시작되는 각도와, 반사가 사라지는 브루스터각을 구합니다',
    tags: ['임계각', 'critical angle', '전반사', 'TIR', '브루스터', 'brewster', '편광', '도광판'],
    related: ['snell', 'plane-plate'],
    formula: [
      '임계각 = asin( 투과 매질 굴절률 / 입사 매질 굴절률 )',
      '브루스터각 = atan( 투과 매질 굴절률 / 입사 매질 굴절률 )',
      '임계각은 굴절률이 큰 쪽에서 작은 쪽으로 나갈 때만 존재합니다',
    ],
    inputs: [
      { key: 'n1', label: '입사 매질 굴절률', en: 'Index 1', unit: '', default: 1.52, min: 1, step: 0.001, hint: GLASS_HINT },
      { key: 'n2', label: '투과 매질 굴절률', en: 'Index 2', unit: '', default: 1.0, min: 1, step: 0.001 },
    ],
    outputs: [
      { key: 'critical', label: '임계각', en: 'Critical Angle', unit: '°', digits: 3, primary: true },
      { key: 'brewster', label: '브루스터각', en: 'Brewster Angle', unit: '°', digits: 3, primary: true },
      { key: 'normalPct', label: '수직 입사 반사율', en: 'At Normal', unit: '%', digits: 3 },
      { key: 'ratio', label: '굴절률 비', en: 'Index Ratio', unit: '', digits: 4 },
    ],
    compute(v) {
      const ratio = v.n2 / v.n1;
      return {
        // 임계각은 굴절률이 큰 쪽에서 작은 쪽으로 나갈 때만 존재한다.
        critical: ratio <= 1 ? radToDeg(Math.asin(ratio)) : null,
        brewster: radToDeg(Math.atan(ratio)),
        normalPct: normalReflectance(v.n1, v.n2) * 100,
        ratio,
      };
    },
    warn(v, o) {
      const warns = [];
      if (o.critical === null) {
        warns.push({
          level: 'info',
          text: '투과 매질의 굴절률이 더 커서 전반사가 일어나지 않습니다. 임계각은 굴절률이 큰 쪽에서 작은 쪽으로 나갈 때만 존재합니다.',
        });
      } else {
        warns.push({
          level: 'info',
          text: `입사각이 ${o.critical.toFixed(2)}° 를 넘으면 빛이 전부 되돌아옵니다. 유리 내부 결함을 도광 조명으로 볼 때 쓰는 원리입니다.`,
        });
      }
      warns.push({
        level: 'info',
        text: `브루스터각 ${o.brewster.toFixed(2)}° 로 비추고 편광판을 쓰면 표면 반사를 거의 없앨 수 있습니다.`,
      });
      return warns;
    },
  },

  {
    id: 'plane-plate',
    category: 'wave',
    name: '평행판 통과',
    en: 'Plane Parallel Plate',
    summary: '유리를 통해 들여다볼 때 초점이 얼마나 밀리고 상이 얼마나 어긋나는지 구합니다',
    tags: ['평행판', 'plate', '유리', 'glass', '초점 이동', '두께', '측면 변위', '커버 글라스', '윈도우'],
    related: ['snell', 'dof'],
    formula: [
      '초점 이동 = 유리 두께 × (1 − 1 / 굴절률)',
      '내부 굴절각 = asin( sin(입사각) / 굴절률 )',
      '측면 변위 = 유리 두께 × sin(입사각 − 내부 굴절각) / cos(내부 굴절각)',
      '유리 내 광로 = 유리 두께 / cos(내부 굴절각)',
    ],
    inputs: [
      { key: 'thickness', label: '유리 두께', en: 'Thickness', unit: 'mm', default: 3, min: 0, step: 0.1 },
      { key: 'n', label: '굴절률', en: 'Index', unit: '', default: 1.52, min: 1, step: 0.001, hint: GLASS_HINT },
      { key: 'theta1', label: '입사각', en: 'Incidence', unit: '°', default: 0, min: 0, max: 89.9, step: 1,
        hint: '수직으로 보면 0' },
      { key: 'dofMm', label: '피사계심도', en: 'DOF', unit: 'mm', default: 3.26, min: 0.001, step: 0.01,
        hint: '초점 이동이 이 안에 들어오는지 확인용' },
    ],
    outputs: [
      { key: 'focusShift', label: '초점 이동', en: 'Focus Shift', unit: 'mm', digits: 4, primary: true },
      { key: 'lateralShift', label: '측면 변위', en: 'Lateral Shift', unit: 'mm', digits: 4, primary: true },
      { key: 'theta2', label: '내부 굴절각', en: 'Internal Angle', unit: '°', digits: 3 },
      { key: 'pathLength', label: '유리 내 광로', en: 'Path in Glass', unit: 'mm', digits: 3 },
      { key: 'surfaceLossPct', label: '양면 반사 손실', en: 'Surface Loss', unit: '%', digits: 2 },
      { key: 'dofRatio', label: '심도 대비 초점 이동', en: 'vs DOF', unit: '%', digits: 1 },
    ],
    compute(v) {
      const t1 = degToRad(v.theta1);
      const t2 = Math.asin(Math.sin(t1) / v.n);
      const r = normalReflectance(1, v.n);
      return {
        // 유리를 넣으면 상이 뒤로 밀린다. 수직 입사에서 두께 × (1 − 1/n) 이다.
        focusShift: v.thickness * (1 - 1 / v.n),
        lateralShift: (v.thickness * Math.sin(t1 - t2)) / Math.cos(t2),
        theta2: radToDeg(t2),
        pathLength: v.thickness / Math.cos(t2),
        // 앞뒤 두 면에서 각각 반사된다.
        surfaceLossPct: (1 - (1 - r) ** 2) * 100,
        dofRatio: (v.thickness * (1 - 1 / v.n) / v.dofMm) * 100,
      };
    },
    diagram(v, o) {
      return [
        plateShiftView({
          thickness: v.thickness,
          focusShift: o.focusShift,
          lateralShift: o.lateralShift,
          theta1: v.theta1,
        }),
      ];
    },
    warn(v, o) {
      const warns = [];
      if (v.thickness === 0) {
        return [{ level: 'info', text: '두께가 0 이라 이동이 없습니다.' }];
      }
      if (o.dofRatio > 100) {
        warns.push({
          level: 'warn',
          text: `초점 이동 ${o.focusShift.toFixed(3)} mm 가 피사계심도 ${v.dofMm} mm 를 넘습니다. 유리 너머에 초점을 맞추려면 렌즈를 그만큼 다시 조정해야 합니다.`,
        });
      } else {
        warns.push({
          level: 'info',
          text: `초점 이동이 심도의 ${o.dofRatio.toFixed(0)} % 입니다. 심도 안에 들어오므로 재조정 없이 볼 수 있습니다.`,
        });
      }
      if (v.theta1 > 0) {
        warns.push({
          level: 'info',
          text: `비스듬히 보면 상이 ${o.lateralShift.toFixed(4)} mm 옆으로 어긋납니다. 치수를 재는 검사라면 이 값이 그대로 오차가 됩니다.`,
        });
      }
      warns.push({
        level: 'info',
        text: `앞뒤 두 면에서 ${o.surfaceLossPct.toFixed(1)} % 를 잃습니다. 반사광이 검사 화면에 겹쳐 보이는 원인이기도 합니다.`,
      });
      return warns;
    },
  },

  {
    id: 'grating',
    category: 'wave',
    name: '회절격자',
    en: 'Diffraction Grating',
    summary: '격자 주기와 파장으로 각 차수의 회절각과 최대 차수를 구합니다',
    tags: ['회절', 'diffraction', '격자', 'grating', '차수', 'order', '파장', '분광', 'lines/mm'],
    related: ['aperture', 'snell'],
    formula: [
      '격자 주기 = 1000 / 격자 밀도(lines/mm)',
      '격자 주기 × ( sin(회절각) − sin(입사각) ) = 차수 × 파장',
      '최대 차수 = 격자 주기 × (1 − sin(입사각)) / 파장',
      '각분산 = 차수 / (격자 주기 × cos(회절각))',
    ],
    inputs: [
      { key: 'linesPerMm', label: '격자 밀도', en: 'Groove Density', unit: 'lines/mm', default: 600, min: 0.001, step: 10 },
      { key: 'lambdaNm', label: '파장', en: 'Wavelength', unit: 'nm', default: LAMBDA_UM * 1000, min: 1, step: 10 },
      { key: 'order', label: '차수', en: 'Order', unit: '', default: 1, min: 0, step: 1 },
      { key: 'incidenceDeg', label: '입사각', en: 'Incidence', unit: '°', default: 0, min: -89, max: 89, step: 1 },
    ],
    outputs: [
      { key: 'diffractionDeg', label: '회절각', en: 'Diffraction Angle', unit: '°', digits: 3, primary: true },
      { key: 'maxOrder', label: '최대 차수', en: 'Max Order', unit: '', digits: 0, primary: true },
      { key: 'periodUm', label: '격자 주기', en: 'Period', unit: 'µm', digits: 4 },
      { key: 'periodRatio', label: '주기 / 파장', en: 'Period / λ', unit: '×', digits: 3 },
      { key: 'dispersion', label: '각분산', en: 'Angular Dispersion', unit: '°/nm', digits: 5 },
    ],
    compute(v) {
      const periodUm = 1000 / v.linesPerMm;
      const lambdaUm = v.lambdaNm / 1000;
      const sinI = Math.sin(degToRad(v.incidenceDeg));
      const sinM = (v.order * lambdaUm) / periodUm + sinI;
      const theta = Math.abs(sinM) <= 1 ? radToDeg(Math.asin(sinM)) : null;
      // 각분산 dθ/dλ = m / (d cos θ)
      const dispersion =
        theta === null
          ? null
          : radToDeg(v.order / (periodUm * Math.cos(degToRad(theta)))) / 1000;
      return {
        diffractionDeg: theta,
        maxOrder: Math.floor((periodUm * (1 - sinI)) / lambdaUm),
        periodUm,
        periodRatio: periodUm / lambdaUm,
        dispersion,
        _evanescent: theta === null,
      };
    },
    warn(v, o) {
      const warns = [];
      if (o._evanescent) {
        warns.push({
          level: 'danger',
          text: `${v.order} 차는 이 조건에서 나타나지 않습니다. 최대 ${o.maxOrder} 차까지만 존재합니다.`,
        });
        return warns;
      }
      if (o.periodRatio < 1) {
        warns.push({
          level: 'info',
          text: '격자 주기가 파장보다 짧아 0 차 외에는 거의 나오지 않습니다.',
        });
      }
      if (v.order === 0) {
        warns.push({ level: 'info', text: '0 차는 회절되지 않고 그대로 지나가는 성분입니다.' });
      }
      return warns;
    },
  },
];
