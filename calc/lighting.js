// 조명 대분류.
// 얼마나 밝게 비추고 있는지, 설정을 바꾸면 얼마나 밝아지는지를 다룬다.

import { degToRad, radToDeg } from '../core/units.js';

// 반각 θ 인 원뿔의 입체각. 전구체는 4π sr 이다.
const solidAngle = (halfAngleDeg) => 2 * Math.PI * (1 - Math.cos(degToRad(halfAngleDeg)));

export const lightingCalculators = [
  {
    id: 'illuminance',
    category: 'lighting',
    name: '조도 · 광도 · 광속',
    en: 'Illuminance',
    summary: '광도(cd)와 거리로 대상면 조도(lux)를 구하고, 광속(lm)까지 함께 냅니다',
    tags: ['조도', 'lux', '럭스', '광도', 'candela', 'cd', '광속', 'lumen', 'lm', '입체각', '조명'],
    related: ['inverse-square', 'exposure-balance'],
    modes: [
      {
        id: 'lux',
        name: '조도 계산',
        en: 'Illuminance',
        formula: [
          '조도(lux) = 광도(cd) / 조명 거리(m)²',
          '입체각(sr) = 2π × (1 − cos 반각)',
          '광속(lm) = 광도 × 입체각',
        ],
        inputs: [
          { key: 'intensity', label: '광도', en: 'Luminous Intensity', unit: 'cd', default: 100, min: 0, step: 1,
            hint: '조명 스펙시트의 candela 값' },
          { key: 'distance', label: '조명 거리', en: 'Distance', unit: 'mm', default: 500, min: 1, step: 10 },
          { key: 'halfAngle', label: '조명 반각', en: 'Half Angle', unit: '°', default: 30, min: 0.1, max: 180, step: 1,
            hint: '빔이 퍼지는 각도의 절반' },
        ],
        outputs: [
          { key: 'lux', label: '대상면 조도', en: 'Illuminance', unit: 'lux', digits: 1, primary: true },
          { key: 'flux', label: '광속', en: 'Luminous Flux', unit: 'lm', digits: 1, primary: true },
          { key: 'solidAngle', label: '입체각', en: 'Solid Angle', unit: 'sr', digits: 4 },
          { key: 'beamDia', label: '조사 지름', en: 'Beam Diameter', unit: 'mm', digits: 1 },
          { key: 'beamArea', label: '조사 면적', en: 'Beam Area', unit: 'mm²', digits: 0 },
        ],
        compute(v) {
          const meters = v.distance / 1000;
          const omega = solidAngle(v.halfAngle);
          const beamDia = 2 * v.distance * Math.tan(degToRad(v.halfAngle));
          return {
            lux: v.intensity / (meters * meters),
            flux: v.intensity * omega,
            solidAngle: omega,
            beamDia,
            beamArea: Math.PI * (beamDia / 2) ** 2,
          };
        },
        warn(v, o) {
          const warns = [];
          if (o.lux < 500) {
            warns.push({
              level: 'warn',
              text: `조도 ${o.lux.toFixed(0)} lux 는 고속 촬영에 부족할 수 있습니다. 노출을 길게 잡거나 조명을 가까이 붙이세요.`,
            });
          }
          warns.push({
            level: 'info',
            text: '점광원 근사입니다. 면조명은 가까운 거리에서 이 식보다 완만하게 감소합니다.',
          });
          return warns;
        },
      },
      {
        id: 'intensity',
        name: '필요 광도 계산',
        en: 'Required Intensity',
        formula: [
          '광도(cd) = 목표 조도(lux) × 조명 거리(m)²',
          '광속(lm) = 광도 × 입체각',
        ],
        inputs: [
          { key: 'lux', label: '목표 조도', en: 'Target Illuminance', unit: 'lux', default: 2000, min: 0.1, step: 100 },
          { key: 'distance', label: '조명 거리', en: 'Distance', unit: 'mm', default: 500, min: 1, step: 10 },
          { key: 'halfAngle', label: '조명 반각', en: 'Half Angle', unit: '°', default: 30, min: 0.1, max: 180, step: 1 },
        ],
        outputs: [
          { key: 'intensity', label: '필요 광도', en: 'Required Intensity', unit: 'cd', digits: 1, primary: true },
          { key: 'flux', label: '필요 광속', en: 'Required Flux', unit: 'lm', digits: 1, primary: true },
          { key: 'beamDia', label: '조사 지름', en: 'Beam Diameter', unit: 'mm', digits: 1 },
        ],
        compute(v) {
          const meters = v.distance / 1000;
          const intensity = v.lux * meters * meters;
          return {
            intensity,
            flux: intensity * solidAngle(v.halfAngle),
            beamDia: 2 * v.distance * Math.tan(degToRad(v.halfAngle)),
          };
        },
        warn() {
          return [{
            level: 'info',
            text: '반각이 좁을수록 같은 광속으로 더 밝게 비출 수 있습니다. FOV 보다 조금만 넓게 잡는 것이 효율적입니다.',
          }];
        },
      },
    ],
  },

  {
    id: 'inverse-square',
    category: 'lighting',
    name: '역제곱 법칙',
    en: 'Inverse Square Law',
    summary: '조명 거리를 바꿨을 때 밝기가 얼마나 변하는지 구합니다',
    tags: ['역제곱', 'inverse square', '거리', '조도 변화', '스톱', '조명 위치'],
    related: ['illuminance', 'exposure-balance'],
    formula: [
      '밝기 배수 = (기준 거리 / 새 거리)²',
      '새 조도 = 기준 조도 × 밝기 배수',
      '스톱 변화 = log₂(밝기 배수)',
    ],
    inputs: [
      { key: 'baseLux', label: '기준 조도', en: 'Base Illuminance', unit: 'lux', default: 2000, min: 0.01, step: 100 },
      { key: 'baseDist', label: '기준 거리', en: 'Base Distance', unit: 'mm', default: 300, min: 0.1, step: 10 },
      { key: 'newDist', label: '새 거리', en: 'New Distance', unit: 'mm', default: 450, min: 0.1, step: 10 },
    ],
    outputs: [
      { key: 'newLux', label: '새 조도', en: 'New Illuminance', unit: 'lux', digits: 1, primary: true },
      { key: 'ratio', label: '밝기 배수', en: 'Ratio', unit: '×', digits: 3, primary: true },
      { key: 'stops', label: '노출 단계 변화', en: 'Stops', unit: 'stop', digits: 2 },
      { key: 'compensationUs', label: '노출 보정 배수', en: 'Exposure Factor', unit: '×', digits: 3 },
    ],
    compute(v) {
      const ratio = (v.baseDist / v.newDist) ** 2;
      return {
        newLux: v.baseLux * ratio,
        ratio,
        stops: Math.log2(ratio),
        compensationUs: 1 / ratio,
      };
    },
    warn(v, o) {
      if (Math.abs(o.stops) < 0.01) {
        return [{ level: 'info', text: '거리가 같아 밝기 변화가 없습니다.' }];
      }
      const dir = o.stops < 0 ? '어두워' : '밝아';
      return [{
        level: 'info',
        text: `${Math.abs(o.stops).toFixed(2)} 스톱 ${dir}집니다. 같은 밝기를 유지하려면 노출을 ${o.compensationUs.toFixed(2)} 배로 조정하세요.`,
      }];
    },
  },

  {
    id: 'exposure-balance',
    category: 'lighting',
    name: '노출 조건 비교',
    en: 'Exposure Balance',
    summary: '노출·조리개·조명·게인을 바꿨을 때 최종 밝기가 얼마나 달라지는지 한꺼번에 계산합니다',
    tags: ['노출', '조리개', '게인', '조명', '스톱', 'stop', 'exposure', '밝기 비교', '설정 변경'],
    related: ['inverse-square', 'motion-blur'],
    formula: [
      '노출 기여 = 변경 후 노출 / 변경 전 노출',
      '조리개 기여 = (변경 전 F수 / 변경 후 F수)²',
      '조명 기여 = 변경 후 조도 / 변경 전 조도',
      '게인 기여 = 10 ^ ((변경 후 게인 − 변경 전 게인) / 20)',
      '최종 밝기 배수 = 네 기여를 모두 곱한 값',
      '스톱 = log₂(밝기 배수)',
    ],
    inputs: [
      { key: 'expBefore', label: '노출 — 변경 전', en: 'Exposure Before', unit: 'µs', default: 1000, min: 0.1, step: 10 },
      { key: 'expAfter', label: '노출 — 변경 후', en: 'Exposure After', unit: 'µs', default: 250, min: 0.1, step: 10 },
      { key: 'fBefore', label: 'F수 — 변경 전', en: 'F-number Before', unit: '', default: 5.6, min: 0.7, step: 0.1 },
      { key: 'fAfter', label: 'F수 — 변경 후', en: 'F-number After', unit: '', default: 2.8, min: 0.7, step: 0.1 },
      { key: 'luxBefore', label: '조도 — 변경 전', en: 'Illuminance Before', unit: 'lux', default: 2000, min: 0.01, step: 100 },
      { key: 'luxAfter', label: '조도 — 변경 후', en: 'Illuminance After', unit: 'lux', default: 2000, min: 0.01, step: 100 },
      { key: 'gainBefore', label: '게인 — 변경 전', en: 'Gain Before', unit: 'dB', default: 0, step: 1 },
      { key: 'gainAfter', label: '게인 — 변경 후', en: 'Gain After', unit: 'dB', default: 0, step: 1 },
    ],
    outputs: [
      { key: 'total', label: '최종 밝기 배수', en: 'Total', unit: '×', digits: 3, primary: true },
      { key: 'totalStops', label: '최종 변화', en: 'Total', unit: 'stop', digits: 2, primary: true },
      { key: 'expStops', label: '노출 기여', en: 'Exposure', unit: 'stop', digits: 2 },
      { key: 'apertureStops', label: '조리개 기여', en: 'Aperture', unit: 'stop', digits: 2 },
      { key: 'lightStops', label: '조명 기여', en: 'Lighting', unit: 'stop', digits: 2 },
      { key: 'gainStops', label: '게인 기여', en: 'Gain', unit: 'stop', digits: 2 },
    ],
    compute(v) {
      const expRatio = v.expAfter / v.expBefore;
      // 밝기는 조리개 지름의 제곱, 즉 F수의 제곱에 반비례한다.
      const apertureRatio = (v.fBefore / v.fAfter) ** 2;
      const lightRatio = v.luxAfter / v.luxBefore;
      // dB 는 진폭 기준이라 밝기 배수는 20 으로 나눈 지수다.
      const gainRatio = 10 ** ((v.gainAfter - v.gainBefore) / 20);
      const total = expRatio * apertureRatio * lightRatio * gainRatio;
      return {
        total,
        totalStops: Math.log2(total),
        expStops: Math.log2(expRatio),
        apertureStops: Math.log2(apertureRatio),
        lightStops: Math.log2(lightRatio),
        gainStops: Math.log2(gainRatio),
      };
    },
    warn(v, o) {
      const warns = [];
      if (Math.abs(o.totalStops) < 0.05) {
        warns.push({ level: 'info', text: '변경 전후 밝기가 사실상 같습니다. 서로 상쇄되는 조합입니다.' });
      } else {
        const dir = o.totalStops > 0 ? '밝아' : '어두워';
        warns.push({
          level: 'info',
          text: `전체적으로 ${Math.abs(o.totalStops).toFixed(2)} 스톱 ${dir}집니다.`,
        });
      }
      if (Math.abs(o.gainStops) > 1) {
        warns.push({
          level: 'warn',
          text: '게인으로 메운 몫이 큽니다. 게인은 잡음도 함께 키우므로 조명이나 조리개로 해결할 수 있으면 그쪽이 낫습니다.',
        });
      }
      return warns;
    },
  },

  {
    id: 'strobe',
    category: 'lighting',
    name: '스트로브 듀티',
    en: 'Strobe Duty',
    summary: '펄스 폭과 반복 주파수로 듀티를 구하고, 오버드라이브가 안전한 범위인지 확인합니다',
    tags: ['스트로브', 'strobe', '듀티', 'duty', '펄스', '오버드라이브', 'LED', '발열'],
    related: ['illuminance', 'motion-blur'],
    formula: [
      '듀티 = 펄스 폭(s) × 반복 주파수(Hz)',
      '평균 부하 = 듀티 × 오버드라이브 배수',
      '허용 오버드라이브 = 1 / 듀티',
    ],
    inputs: [
      { key: 'pulseUs', label: '펄스 폭', en: 'Pulse Width', unit: 'µs', default: 200, min: 0.1, step: 10,
        hint: '보통 노출 시간과 같거나 조금 깁니다' },
      { key: 'freqHz', label: '반복 주파수', en: 'Repetition Rate', unit: 'Hz', default: 30, min: 0.01, step: 1,
        hint: '프레임레이트와 같게 잡습니다' },
      { key: 'overdrive', label: '오버드라이브 배수', en: 'Overdrive', unit: '×', default: 5, min: 1, step: 0.5,
        hint: '컨트롤러가 정격의 몇 배 전류를 흘리는지' },
    ],
    outputs: [
      { key: 'dutyPct', label: '듀티', en: 'Duty Cycle', unit: '%', digits: 3, primary: true },
      { key: 'load', label: '평균 부하', en: 'Average Load', unit: '×정격', digits: 3, primary: true },
      { key: 'periodMs', label: '반복 주기', en: 'Period', unit: 'ms', digits: 2 },
      { key: 'peakGain', label: '순간 밝기', en: 'Peak Brightness', unit: '×', digits: 1 },
      { key: 'maxOverdrive', label: '듀티 기준 허용 배수', en: 'Max Overdrive', unit: '×', digits: 1 },
    ],
    compute(v) {
      const duty = (v.pulseUs * 1e-6) * v.freqHz;
      return {
        dutyPct: duty * 100,
        load: duty * v.overdrive,
        periodMs: 1000 / v.freqHz,
        peakGain: v.overdrive,
        // 평균 전력을 정격 이내로 두려면 오버드라이브는 듀티의 역수까지가 한계다.
        maxOverdrive: duty > 0 ? 1 / duty : Infinity,
      };
    },
    warn(v, o) {
      const warns = [];
      if (v.pulseUs * 1e-6 > 1 / v.freqHz) {
        return [{
          level: 'danger',
          text: '펄스 폭이 반복 주기보다 깁니다. 다음 펄스가 시작되기 전에 끝나지 않는 조건입니다.',
        }];
      }
      if (o.load > 1) {
        warns.push({
          level: 'danger',
          text: `평균 부하가 정격의 ${o.load.toFixed(2)} 배입니다. 오버드라이브를 ${o.maxOverdrive.toFixed(1)} 배 이하로 낮추지 않으면 LED 수명이 급격히 줄어듭니다.`,
        });
      } else {
        warns.push({
          level: 'info',
          text: `평균 부하 ${(o.load * 100).toFixed(1)} % 로 정격 이내입니다. 이 듀티에서는 ${o.maxOverdrive.toFixed(1)} 배까지 올릴 수 있습니다.`,
        });
      }
      return warns;
    },
  },

  {
    id: 'light-coverage',
    category: 'lighting',
    name: '조사 영역 · 균일도',
    en: 'Light Coverage',
    summary: '조명이 FOV 를 덮는지, 가장자리가 얼마나 어두워지는지 구합니다',
    tags: ['조사', '균일도', 'coverage', 'uniformity', '조명 크기', 'cos4', '가장자리', '반각'],
    related: ['illuminance', 'inverse-square'],
    formula: [
      '조사 지름 = 발광부 크기 + 2 × 조명 거리 × tan(조명 반각)',
      'FOV 끝 각도 = atan( FOV (W) / 2 / 조명 거리 )',
      '가장자리 조도비 = cos⁴(FOV 끝 각도)',
    ],
    inputs: [
      { key: 'emitterMm', label: '발광부 크기', en: 'Emitter Size', unit: 'mm', default: 50, min: 0, step: 1,
        hint: '링 조명이면 바깥 지름' },
      { key: 'halfAngle', label: '조명 반각', en: 'Half Angle', unit: '°', default: 30, min: 0.1, max: 89, step: 1 },
      { key: 'distance', label: '조명 거리', en: 'Distance', unit: 'mm', default: 300, min: 1, step: 10 },
      { key: 'fovW', label: 'FOV (W)', en: 'Field of View (W)', unit: 'mm', default: 120, min: 0.01, step: 1 },
    ],
    outputs: [
      { key: 'coverage', label: '조사 지름', en: 'Coverage', unit: 'mm', digits: 1, primary: true },
      { key: 'marginPct', label: 'FOV 대비 여유', en: 'Margin', unit: '%', digits: 1, primary: true },
      { key: 'edgeRatio', label: '가장자리 조도비', en: 'Edge Ratio', unit: '%', digits: 1 },
      { key: 'edgeStops', label: '가장자리 손실', en: 'Edge Falloff', unit: 'stop', digits: 2 },
      { key: 'edgeAngle', label: 'FOV 끝 각도', en: 'Edge Angle', unit: '°', digits: 2 },
    ],
    compute(v) {
      const coverage = v.emitterMm + 2 * v.distance * Math.tan(degToRad(v.halfAngle));
      // 시야 가장자리를 보는 각도. 조도는 이 각의 네제곱 코사인으로 떨어진다.
      const edgeAngle = radToDeg(Math.atan(v.fovW / 2 / v.distance));
      const edgeRatio = Math.cos(degToRad(edgeAngle)) ** 4;
      return {
        coverage,
        marginPct: ((coverage - v.fovW) / v.fovW) * 100,
        edgeRatio: edgeRatio * 100,
        edgeStops: Math.log2(edgeRatio),
        edgeAngle,
      };
    },
    warn(v, o) {
      const warns = [];
      if (o.coverage < v.fovW) {
        warns.push({
          level: 'danger',
          text: `조사 지름 ${o.coverage.toFixed(1)} mm 가 FOV ${v.fovW} mm 보다 좁습니다. FOV 가장자리가 조명 밖으로 나갑니다.`,
        });
      } else if (o.marginPct < 20) {
        warns.push({
          level: 'warn',
          text: `여유가 ${o.marginPct.toFixed(0)} % 뿐입니다. 조명 가장자리는 광량이 급격히 떨어지므로 FOV 보다 넉넉히 덮는 것이 좋습니다.`,
        });
      }
      if (o.edgeRatio < 70) {
        warns.push({
          level: 'warn',
          text: `FOV 끝 조도가 중심의 ${o.edgeRatio.toFixed(0)} % 입니다. 조명을 멀리 두거나 확산판을 쓰면 균일해집니다.`,
        });
      }
      return warns;
    },
  },
];
