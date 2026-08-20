// 조명 대분류.
// 얼마나 밝게 비추고 있는지, 설정을 바꾸면 얼마나 밝아지는지를 다룬다.

import { degToRad, radToDeg } from '../core/units.js';
import { pulseTrainView, strobeTimingView, motionBlurView } from '../core/diagram.js';

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
    tags: ['스트로브', 'strobe', '듀티', 'duty', '펄스', '펄스 폭', '오버드라이브', 'LED', '발열', '수명'],
    related: ['strobe-timing', 'strobe-freeze', 'led-thermal'],
    modes: [
      {
        id: 'duty',
        name: '듀티 계산',
        en: 'Duty Cycle',
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
        diagram(v, o) {
          return [
            pulseTrainView({
              pulseUs: v.pulseUs,
              periodMs: o.periodMs,
              dutyPct: o.dutyPct,
              overdrive: v.overdrive,
              load: o.load,
            }),
          ];
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
        id: 'limit',
        name: '허용 펄스 폭',
        en: 'Pulse Width Limit',
        formula: [
          '허용 듀티 = 1 / 오버드라이브 배수',
          '최대 펄스 폭 = 허용 듀티 / 반복 주파수',
          '권장 펄스 폭 = 최대 펄스 폭 × 정격 여유',
        ],
        inputs: [
          { key: 'freqHz', label: '반복 주파수', en: 'Repetition Rate', unit: 'Hz', default: 30, min: 0.01, step: 1 },
          { key: 'overdrive', label: '오버드라이브 배수', en: 'Overdrive', unit: '×', default: 5, min: 1, step: 0.5,
            hint: '쓰고 싶은 순간 밝기' },
          { key: 'derate', label: '정격 여유', en: 'Derating', unit: '×', default: 0.8, min: 0.05, max: 1, step: 0.05,
            hint: '한계의 몇 배까지만 쓸지. 0.8 이면 20 % 를 여유로 남깁니다' },
        ],
        outputs: [
          { key: 'safePulseUs', label: '권장 펄스 폭', en: 'Safe Pulse Width', unit: 'µs', digits: 1, primary: true },
          { key: 'maxPulseUs', label: '최대 펄스 폭', en: 'Max Pulse Width', unit: 'µs', digits: 1, primary: true },
          { key: 'maxDutyPct', label: '허용 듀티', en: 'Max Duty Cycle', unit: '%', digits: 3 },
          { key: 'safeLoad', label: '권장 평균 부하', en: 'Load at Safe', unit: '×정격', digits: 3 },
          { key: 'periodMs', label: '반복 주기', en: 'Period', unit: 'ms', digits: 2 },
        ],
        compute(v) {
          // 평균 부하를 정격 이내로 두는 조건에서 듀티의 상한이 정해지고,
          // 반복 주파수가 정해져 있으면 그 듀티가 곧 펄스 폭의 상한이다.
          const maxDuty = 1 / v.overdrive;
          const maxPulseUs = (maxDuty / v.freqHz) * 1e6;
          return {
            maxDutyPct: maxDuty * 100,
            maxPulseUs,
            safePulseUs: maxPulseUs * v.derate,
            // 듀티를 여유만큼 줄이면 평균 부하도 같은 비율로 줄어든다.
            safeLoad: v.derate,
            periodMs: 1000 / v.freqHz,
          };
        },
        diagram(v, o) {
          return [
            pulseTrainView({
              pulseUs: o.safePulseUs,
              periodMs: o.periodMs,
              dutyPct: o.maxDutyPct * v.derate,
              overdrive: v.overdrive,
              load: o.safeLoad,
            }),
          ];
        },
        warn(v, o) {
          const warns = [{
            level: 'info',
            text: `이 조건에서 펄스는 ${o.safePulseUs.toFixed(0)} µs 까지가 안전합니다. 노출 시간이 이보다 길면 오버드라이브를 낮추거나 조명을 가까이 붙이세요.`,
          }];
          if (o.safePulseUs > o.periodMs * 1000) {
            warns.push({
              level: 'warn',
              text: '허용 펄스 폭이 반복 주기보다 깁니다. 오버드라이브가 낮아 사실상 연속 점등과 같은 조건입니다.',
            });
          }
          if (o.safePulseUs < 10) {
            warns.push({
              level: 'warn',
              text: `${o.safePulseUs.toFixed(1)} µs 는 LED 상승 시간과 비슷한 수준입니다. 펄스가 정점에 오르기 전에 꺼져 실제 광량이 계산보다 적습니다.`,
            });
          }
          return warns;
        },
      },
    ],
  },

  {
    id: 'strobe-timing',
    category: 'lighting',
    name: '스트로브 타이밍',
    en: 'Strobe Timing',
    summary: '트리거부터 노출·발광까지의 지연을 맞춰 펄스가 노출 창 안에 들어오는지 확인합니다',
    tags: ['스트로브', 'strobe', '타이밍', 'timing', '지연', 'delay', '트리거', '노출 창', '지터', 'jitter', '동기'],
    related: ['strobe', 'strobe-freeze', 'exposure-balance'],
    formula: [
      '노출 창 = [ 카메라 트리거 지연 , 카메라 트리거 지연 + 노출 시간 ]',
      '발광 창 = [ 조명 트리거 지연 , 조명 트리거 지연 + 펄스 폭 ]',
      '겹침 시간 = 두 창이 겹치는 구간의 길이',
      '광량 취득률 = 겹침 시간 / 펄스 폭',
      '권장 조명 지연 = 카메라 트리거 지연 + (노출 시간 − 펄스 폭) / 2',
    ],
    inputs: [
      { key: 'camDelayUs', label: '카메라 트리거 지연', en: 'Camera Delay', unit: 'µs', default: 20, min: 0, step: 5,
        hint: '트리거가 들어가고 노출이 시작되기까지' },
      { key: 'exposureUs', label: '노출 시간', en: 'Exposure Time', unit: 'µs', default: 300, min: 0.1, step: 10 },
      { key: 'lightDelayUs', label: '조명 트리거 지연', en: 'Light Delay', unit: 'µs', default: 30, min: 0, step: 5,
        hint: '컨트롤러 지연 + LED 상승 시간' },
      { key: 'pulseUs', label: '펄스 폭', en: 'Pulse Width', unit: 'µs', default: 200, min: 0.1, step: 10 },
      { key: 'jitterUs', label: '트리거 지터', en: 'Trigger Jitter', unit: 'µs', default: 5, min: 0, step: 1,
        hint: '프레임마다 ± 로 흔들리는 폭' },
    ],
    outputs: [
      { key: 'captureRatio', label: '광량 취득률', en: 'Capture Ratio', unit: '%', digits: 1, primary: true },
      { key: 'overlapUs', label: '겹침 시간', en: 'Overlap', unit: 'µs', digits: 1, primary: true },
      { key: 'recommendedDelayUs', label: '권장 조명 지연', en: 'Recommended Delay', unit: 'µs', digits: 1, primary: true },
      { key: 'leadUs', label: '앞 여유', en: 'Lead Margin', unit: 'µs', digits: 1 },
      { key: 'tailUs', label: '뒤 여유', en: 'Tail Margin', unit: 'µs', digits: 1 },
      { key: 'marginUs', label: '가장 좁은 여유', en: 'Worst Margin', unit: 'µs', digits: 1 },
    ],
    compute(v) {
      const expStart = v.camDelayUs;
      const expEnd = expStart + v.exposureUs;
      const pulseStart = v.lightDelayUs;
      const pulseEnd = pulseStart + v.pulseUs;
      // 센서에 담기는 빛은 두 창이 겹치는 구간에서만 들어온다.
      const overlapUs = Math.max(0, Math.min(expEnd, pulseEnd) - Math.max(expStart, pulseStart));
      const leadUs = pulseStart - expStart;
      const tailUs = expEnd - pulseEnd;
      return {
        overlapUs,
        captureRatio: (overlapUs / v.pulseUs) * 100,
        leadUs,
        tailUs,
        marginUs: Math.min(leadUs, tailUs),
        // 펄스를 노출 창 한가운데 두면 앞뒤 여유가 같아져 지터에 가장 강해진다.
        recommendedDelayUs: expStart + (v.exposureUs - v.pulseUs) / 2,
        _expStart: expStart,
        _pulseStart: pulseStart,
      };
    },
    diagram(v, o) {
      return [
        strobeTimingView({
          expStart: o._expStart,
          expUs: v.exposureUs,
          pulseStart: o._pulseStart,
          pulseUs: v.pulseUs,
          overlapUs: o.overlapUs,
        }),
      ];
    },
    warn(v, o) {
      const warns = [];
      if (o.overlapUs <= 0) {
        return [{
          level: 'danger',
          text: `펄스가 노출 창 밖에 있습니다. 조명 지연을 ${o.recommendedDelayUs.toFixed(0)} µs 로 맞추세요.`,
        }];
      }
      if (v.pulseUs > v.exposureUs) {
        warns.push({
          level: 'warn',
          text: '펄스가 노출보다 깁니다. 노출을 펄스보다 조금 길게 두어야 펄스 전체가 담기고, 주변광이 들어오는 시간도 짧아집니다.',
        });
      }
      if (o.captureRatio < 99.9) {
        warns.push({
          level: 'danger',
          text: `펄스의 ${(100 - o.captureRatio).toFixed(1)} % 가 노출 밖에서 버려집니다. ${o.leadUs < 0 ? '조명이 노출보다 먼저 켜집니다' : '조명이 노출보다 늦게 꺼집니다'}.`,
        });
      } else if (o.marginUs < v.jitterUs) {
        warns.push({
          level: 'warn',
          text: `여유가 ${o.marginUs.toFixed(1)} µs 뿐이라 지터 ±${v.jitterUs} µs 를 흡수하지 못합니다. 프레임마다 밝기가 달라질 수 있습니다.`,
        });
      } else {
        warns.push({
          level: 'info',
          text: `펄스 전체가 노출 안에 들어옵니다. 앞뒤 여유는 ${o.leadUs.toFixed(0)} / ${o.tailUs.toFixed(0)} µs 입니다.`,
        });
      }
      if (Math.abs(v.lightDelayUs - o.recommendedDelayUs) > 1) {
        warns.push({
          level: 'info',
          text: `조명 지연을 ${o.recommendedDelayUs.toFixed(0)} µs 로 두면 앞뒤 여유가 같아져 지터에 가장 강합니다.`,
        });
      }
      return warns;
    },
  },

  {
    id: 'strobe-freeze',
    category: 'lighting',
    name: '스트로브 모션 정지',
    en: 'Strobe Motion Freeze',
    summary: '스트로브에서는 펄스 폭이 실질 노출입니다. 남는 블러와 필요한 펄스 폭을 구합니다',
    tags: ['스트로브', 'strobe', '모션 블러', '정지', 'freeze', '펄스 폭', '이송 속도', '흔들림'],
    related: ['strobe', 'motion-blur', 'strobe-timing'],
    modes: [
      {
        id: 'blur',
        name: '남는 블러 계산',
        en: 'Residual Blur',
        formula: [
          '블러(µm) = 이송 속도(mm/s) × 펄스 폭(µs) / 1000',
          '블러(px) = 블러(µm) / 대상 분해능(µm/px)',
          '허용 펄스 폭 = 허용 블러(px) × 대상 분해능 × 1000 / 이송 속도',
        ],
        inputs: [
          { key: 'speed', label: '이송 속도', en: 'Conveyor Speed', unit: 'mm/s', default: 300, min: 0, step: 10 },
          { key: 'pulseUs', label: '펄스 폭', en: 'Pulse Width', unit: 'µs', default: 200, min: 0.1, step: 10,
            hint: '노출 시간이 아니라 이 값이 블러를 정합니다' },
          { key: 'umPerPx', label: '대상 분해능', en: 'Spatial Resolution', unit: 'µm/px', default: 20, min: 0.01, step: 1 },
          { key: 'maxBlurPx', label: '허용 블러', en: 'Allowed Blur', unit: 'px', default: 0.5, min: 0.01, step: 0.1 },
        ],
        outputs: [
          { key: 'blurPx', label: '블러', en: 'Motion Blur', unit: 'px', digits: 3, primary: true },
          { key: 'blurUm', label: '블러', en: 'Motion Blur', unit: 'µm', digits: 2, primary: true },
          { key: 'maxPulseUs', label: '허용 펄스 폭', en: 'Max Pulse Width', unit: 'µs', digits: 1 },
          { key: 'headroom', label: '여유 배수', en: 'Headroom', unit: '×', digits: 2 },
        ],
        compute(v) {
          // mm/s × µs 는 1e-3 µm 이므로 1000 으로 나누면 µm 가 된다.
          const blurUm = (v.speed * v.pulseUs) / 1000;
          const maxBlurUm = v.maxBlurPx * v.umPerPx;
          return {
            blurUm,
            blurPx: blurUm / v.umPerPx,
            maxPulseUs: v.speed > 0 ? (maxBlurUm * 1000) / v.speed : Infinity,
            headroom: blurUm > 0 ? maxBlurUm / blurUm : Infinity,
          };
        },
        diagram(v, o) {
          return [
            motionBlurView({
              blurPx: o.blurPx,
              blurUm: o.blurUm,
              umPerPx: v.umPerPx,
              exposureUs: v.pulseUs,
              timeName: '펄스',
            }),
          ];
        },
        warn(v, o) {
          if (v.speed === 0) {
            return [{ level: 'info', text: '정지 상태에서는 블러가 없습니다.' }];
          }
          const warns = [];
          if (o.blurPx > v.maxBlurPx) {
            warns.push({
              level: 'danger',
              text: `블러 ${o.blurPx.toFixed(2)} px 가 허용치 ${v.maxBlurPx} px 를 넘습니다. 펄스를 ${o.maxPulseUs.toFixed(0)} µs 이하로 줄이세요.`,
            });
          } else {
            warns.push({
              level: 'info',
              text: `허용치까지 ${o.headroom.toFixed(2)} 배 여유가 있습니다. 펄스는 ${o.maxPulseUs.toFixed(0)} µs 까지 늘릴 수 있습니다.`,
            });
          }
          warns.push({
            level: 'info',
            text: '노출을 길게 잡아도 블러는 펄스 폭으로 정해집니다. 다만 주변광이 있으면 노출 내내 들어와 별도의 블러를 만듭니다.',
          });
          return warns;
        },
      },
      {
        id: 'pulse',
        name: '필요 펄스 폭 계산',
        en: 'Required Pulse Width',
        formula: [
          '허용 블러(µm) = 허용 블러(px) × 대상 분해능(µm/px)',
          '펄스 폭(µs) = 허용 블러(µm) × 1000 / 이송 속도(mm/s)',
          '필요 오버드라이브 = 기준 노출 / 펄스 폭',
        ],
        inputs: [
          { key: 'speed', label: '이송 속도', en: 'Conveyor Speed', unit: 'mm/s', default: 300, min: 0.01, step: 10 },
          { key: 'umPerPx', label: '대상 분해능', en: 'Spatial Resolution', unit: 'µm/px', default: 20, min: 0.01, step: 1 },
          { key: 'maxBlurPx', label: '허용 블러', en: 'Allowed Blur', unit: 'px', default: 0.5, min: 0.01, step: 0.1,
            hint: '보통 0.5 px 이하로 잡습니다' },
          { key: 'baseExpUs', label: '기준 노출', en: 'Reference Exposure', unit: 'µs', default: 2000, min: 0.1, step: 100,
            hint: '연속 점등으로 적정 밝기가 나오던 노출' },
        ],
        outputs: [
          { key: 'pulseUs', label: '필요 펄스 폭', en: 'Required Pulse Width', unit: 'µs', digits: 1, primary: true },
          { key: 'needOverdrive', label: '필요 오버드라이브', en: 'Required Overdrive', unit: '×', digits: 1, primary: true },
          { key: 'maxBlurUm', label: '허용 블러', en: 'Allowed Blur', unit: 'µm', digits: 2 },
          { key: 'needStops', label: '메워야 할 밝기', en: 'Gap', unit: 'stop', digits: 2 },
        ],
        compute(v) {
          const maxBlurUm = v.maxBlurPx * v.umPerPx;
          const pulseUs = (maxBlurUm * 1000) / v.speed;
          // 같은 노출량을 더 짧은 시간에 담으려면 그 시간비만큼 밝아야 한다.
          const needOverdrive = v.baseExpUs / pulseUs;
          return {
            pulseUs,
            maxBlurUm,
            needOverdrive,
            needStops: Math.log2(needOverdrive),
          };
        },
        warn(v, o) {
          const warns = [{
            level: 'info',
            text: `펄스를 ${o.pulseUs.toFixed(0)} µs 로 두면 블러가 ${v.maxBlurPx} px 안에 들어옵니다.`,
          }];
          if (o.needOverdrive > 10) {
            warns.push({
              level: 'danger',
              text: `기준 노출을 그대로 옮기려면 ${o.needOverdrive.toFixed(1)} 배 밝아야 합니다. 스트로브 한 대로는 어렵습니다. 조명을 늘리거나 조리개를 열어 ${o.needStops.toFixed(1)} 스톱을 나눠 메우세요.`,
            });
          } else {
            warns.push({
              level: 'info',
              text: `밝기를 ${o.needOverdrive.toFixed(1)} 배, 즉 ${o.needStops.toFixed(1)} 스톱 올려야 같은 밝기가 나옵니다.`,
            });
          }
          return warns;
        },
      },
    ],
  },

  {
    id: 'strobe-exposure',
    category: 'lighting',
    name: '스트로브 광량 · 주변광',
    en: 'Strobe Exposure',
    summary: '연속광 조건을 스트로브로 옮길 때 필요한 배수와, 주변광이 얼마나 섞이는지 구합니다',
    tags: ['스트로브', 'strobe', '노출량', '주변광', 'ambient', '외란광', '오버드라이브', '차광', '등가'],
    related: ['strobe', 'exposure-balance', 'illuminance'],
    modes: [
      {
        id: 'overdrive',
        name: '필요 오버드라이브',
        en: 'Required Overdrive',
        formula: [
          '필요 오버드라이브 = 연속광 노출 / 펄스 폭',
          '듀티 = 펄스 폭(s) × 반복 주파수(Hz)',
          '허용 오버드라이브 = 1 / 듀티',
          '여유 = 허용 오버드라이브 / 필요 오버드라이브',
        ],
        inputs: [
          { key: 'contExpUs', label: '연속광 노출', en: 'Continuous Exposure', unit: 'µs', default: 2000, min: 0.1, step: 100,
            hint: '연속 점등으로 적정 밝기가 나오던 노출' },
          { key: 'pulseUs', label: '펄스 폭', en: 'Pulse Width', unit: 'µs', default: 200, min: 0.1, step: 10 },
          { key: 'freqHz', label: '반복 주파수', en: 'Repetition Rate', unit: 'Hz', default: 30, min: 0.01, step: 1 },
        ],
        outputs: [
          { key: 'needOverdrive', label: '필요 오버드라이브', en: 'Required Overdrive', unit: '×', digits: 2, primary: true },
          { key: 'maxOverdrive', label: '듀티 기준 허용 배수', en: 'Max Overdrive', unit: '×', digits: 1, primary: true },
          { key: 'margin', label: '여유', en: 'Headroom', unit: '×', digits: 2 },
          { key: 'dutyPct', label: '듀티', en: 'Duty Cycle', unit: '%', digits: 3 },
          { key: 'needStops', label: '메워야 할 밝기', en: 'Gap', unit: 'stop', digits: 2 },
          { key: 'loadAtNeed', label: '그때의 평균 부하', en: 'Load', unit: '×정격', digits: 3 },
        ],
        compute(v) {
          const duty = (v.pulseUs * 1e-6) * v.freqHz;
          const needOverdrive = v.contExpUs / v.pulseUs;
          const maxOverdrive = duty > 0 ? 1 / duty : Infinity;
          return {
            needOverdrive,
            maxOverdrive,
            margin: maxOverdrive / needOverdrive,
            dutyPct: duty * 100,
            needStops: Math.log2(needOverdrive),
            loadAtNeed: duty * needOverdrive,
          };
        },
        warn(v, o) {
          const warns = [];
          if (o.loadAtNeed > 1) {
            warns.push({
              level: 'danger',
              text: `필요 배수 ${o.needOverdrive.toFixed(1)} 가 허용 ${o.maxOverdrive.toFixed(1)} 를 넘습니다. 평균 부하가 정격의 ${o.loadAtNeed.toFixed(2)} 배가 되어 LED 가 상합니다.`,
            });
          } else {
            warns.push({
              level: 'info',
              text: `필요 배수 ${o.needOverdrive.toFixed(1)} 는 허용 ${o.maxOverdrive.toFixed(1)} 이내이고, 평균 부하는 정격의 ${(o.loadAtNeed * 100).toFixed(1)} % 입니다.`,
            });
          }
          warns.push({
            level: 'info',
            text: '조리개를 한 단 열거나 조명을 가까이 붙이면 필요 배수가 절반으로 줄어듭니다. 오버드라이브에만 기대지 않는 편이 안전합니다.',
          });
          return warns;
        },
      },
      {
        id: 'ambient',
        name: '주변광 섞임',
        en: 'Ambient Light',
        formula: [
          '스트로브 노출량 = 스트로브 조도 × 펄스 폭',
          '주변광 노출량 = 주변광 조도 × 노출 시간',
          '신호 대 주변광비 = 스트로브 노출량 / 주변광 노출량',
          '주변광 기여율 = 주변광 노출량 / (스트로브 노출량 + 주변광 노출량)',
        ],
        inputs: [
          { key: 'strobeLux', label: '스트로브 조도', en: 'Strobe Illuminance', unit: 'lux', default: 20000, min: 0.1, step: 1000,
            hint: '펄스가 켜져 있는 동안의 대상면 조도' },
          { key: 'pulseUs', label: '펄스 폭', en: 'Pulse Width', unit: 'µs', default: 200, min: 0.1, step: 10 },
          { key: 'ambientLux', label: '주변광 조도', en: 'Ambient Illuminance', unit: 'lux', default: 500, min: 0, step: 50,
            hint: '천장등이나 창문처럼 항상 들어오는 빛' },
          { key: 'exposureUs', label: '노출 시간', en: 'Exposure Time', unit: 'µs', default: 1000, min: 0.1, step: 100 },
        ],
        outputs: [
          { key: 'ratio', label: '신호 대 주변광비', en: 'Signal to Ambient', unit: '×', digits: 1, primary: true },
          { key: 'ambientPct', label: '주변광 기여율', en: 'Ambient Share', unit: '%', digits: 2, primary: true },
          { key: 'signal', label: '스트로브 노출량', en: 'Strobe Exposure', unit: 'lux·ms', digits: 3 },
          { key: 'ambient', label: '주변광 노출량', en: 'Ambient Exposure', unit: 'lux·ms', digits: 3 },
          { key: 'ratioStops', label: '주변광 대비 여유', en: 'Margin', unit: 'stop', digits: 2 },
          { key: 'bestRatio', label: '노출을 펄스에 맞췄을 때', en: 'Best Ratio', unit: '×', digits: 1 },
        ],
        compute(v) {
          // 노출량은 조도 × 시간이다. 스트로브는 펄스 동안만, 주변광은 노출 내내 쌓인다.
          const signal = v.strobeLux * (v.pulseUs / 1000);
          const ambient = v.ambientLux * (v.exposureUs / 1000);
          const ratio = ambient > 0 ? signal / ambient : Infinity;
          return {
            signal,
            ambient,
            ratio,
            ratioStops: Math.log2(ratio),
            ambientPct: (ambient / (signal + ambient)) * 100,
            // 노출을 펄스 폭까지 줄이면 주변광이 그 시간비만큼 덜 들어온다.
            bestRatio: v.ambientLux > 0 ? signal / (v.ambientLux * (v.pulseUs / 1000)) : Infinity,
          };
        },
        warn(v, o) {
          if (v.ambientLux === 0) {
            return [{ level: 'info', text: '주변광이 없는 조건입니다. 완전 차광이면 노출 시간을 자유롭게 잡을 수 있습니다.' }];
          }
          const warns = [];
          if (o.ambientPct > 10) {
            warns.push({
              level: 'danger',
              text: `밝기의 ${o.ambientPct.toFixed(1)} % 가 주변광입니다. 주변광은 스트로브와 달리 노출 내내 들어와 대상이 움직인 만큼 번집니다.`,
            });
          } else if (o.ambientPct > 2) {
            warns.push({
              level: 'warn',
              text: `주변광이 ${o.ambientPct.toFixed(1)} % 섞입니다. 조명을 끈 상태로 한 장 찍어 빼면 정확도가 올라갑니다.`,
            });
          } else {
            warns.push({
              level: 'info',
              text: `주변광 기여가 ${o.ambientPct.toFixed(2)} % 로 무시할 수준입니다.`,
            });
          }
          if (v.exposureUs > v.pulseUs * 1.5) {
            warns.push({
              level: 'info',
              text: `노출을 펄스에 가깝게 줄이면 신호 대 주변광비가 ${o.ratio.toFixed(1)} 에서 ${o.bestRatio.toFixed(1)} 로 올라갑니다. 차광막이나 대역통과 필터도 같은 효과를 냅니다.`,
            });
          }
          return warns;
        },
      },
    ],
  },

  {
    id: 'led-thermal',
    category: 'lighting',
    name: 'LED 발열 · 정션 온도',
    en: 'LED Thermal',
    summary: '오버드라이브 전류와 듀티로 평균 전력과 정션 온도를 구해 수명 여유를 확인합니다',
    tags: ['LED', '발열', '정션 온도', 'junction', '열저항', 'thermal', '수명', '광출력 저하', '오버드라이브'],
    related: ['strobe', 'strobe-exposure', 'illuminance'],
    formula: [
      '피크 전력 = 순방향 전압 × 펄스 전류',
      '평균 전력 = 피크 전력 × 듀티',
      '발열 = 평균 전력 × (1 − 광 변환 효율)',
      '온도 상승 = 발열 × 열저항',
      '정션 온도 = 주위 온도 + 온도 상승',
      '상대 광출력 = 1 + 광출력 온도계수 × (정션 온도 − 25)',
    ],
    inputs: [
      { key: 'vf', label: '순방향 전압', en: 'Forward Voltage', unit: 'V', default: 3.2, min: 0.1, step: 0.1,
        hint: '데이터시트 Vf. 펄스 전류에서는 조금 높습니다' },
      { key: 'ifPeak', label: '펄스 전류', en: 'Peak Current', unit: 'A', default: 3.5, min: 0.001, step: 0.1 },
      { key: 'dutyPct', label: '듀티', en: 'Duty Cycle', unit: '%', default: 0.6, min: 0, max: 100, step: 0.1 },
      { key: 'rth', label: '열저항', en: 'Thermal Resistance', unit: '°C/W', default: 8, min: 0.1, step: 0.5,
        hint: '정션에서 주위까지. 데이터시트 Rθja' },
      { key: 'ta', label: '주위 온도', en: 'Ambient Temperature', unit: '°C', default: 25, step: 5 },
      { key: 'tjMax', label: '정션 온도 한계', en: 'Max Junction Temp', unit: '°C', default: 125, min: 1, step: 5 },
      { key: 'effPct', label: '광 변환 효율', en: 'Wall-plug Efficiency', unit: '%', default: 30, min: 0, max: 100, step: 5,
        hint: '나머지는 전부 열이 됩니다' },
      { key: 'tempCoef', label: '광출력 온도계수', en: 'Output Coefficient', unit: '%/°C', default: -0.5, step: 0.1,
        hint: '정션이 뜨거워질수록 밝기가 떨어지는 비율' },
    ],
    outputs: [
      { key: 'tj', label: '정션 온도', en: 'Junction Temperature', unit: '°C', digits: 1, primary: true },
      { key: 'avgW', label: '평균 전력', en: 'Average Power', unit: 'W', digits: 3, primary: true },
      { key: 'marginC', label: '한계까지 여유', en: 'Margin', unit: '°C', digits: 1, primary: true },
      { key: 'peakW', label: '피크 전력', en: 'Peak Power', unit: 'W', digits: 2 },
      { key: 'heatW', label: '발열', en: 'Heat', unit: 'W', digits: 3 },
      { key: 'riseC', label: '온도 상승', en: 'Temperature Rise', unit: '°C', digits: 1 },
      { key: 'relOutput', label: '상대 광출력', en: 'Relative Output', unit: '%', digits: 1 },
    ],
    compute(v) {
      const duty = v.dutyPct / 100;
      const peakW = v.vf * v.ifPeak;
      const avgW = peakW * duty;
      // 빛으로 빠져나간 몫을 뺀 나머지가 소자를 데운다.
      const heatW = avgW * (1 - v.effPct / 100);
      const riseC = heatW * v.rth;
      const tj = v.ta + riseC;
      return {
        peakW,
        avgW,
        heatW,
        riseC,
        tj,
        marginC: v.tjMax - tj,
        relOutput: (1 + (v.tempCoef / 100) * (tj - 25)) * 100,
      };
    },
    warn(v, o) {
      const warns = [];
      if (o.tj > v.tjMax) {
        warns.push({
          level: 'danger',
          text: `정션 온도 ${o.tj.toFixed(0)} °C 가 한계 ${v.tjMax} °C 를 넘습니다. 듀티를 낮추거나 방열을 보강하지 않으면 광량이 떨어지고 수명이 급격히 줄어듭니다.`,
        });
      } else if (o.marginC < 20) {
        warns.push({
          level: 'warn',
          text: `한계까지 ${o.marginC.toFixed(0)} °C 뿐입니다. 여름철에 주위 온도가 오르면 바로 넘어갑니다.`,
        });
      } else {
        warns.push({
          level: 'info',
          text: `정션 온도 ${o.tj.toFixed(0)} °C 로, 한계까지 ${o.marginC.toFixed(0)} °C 여유가 있습니다.`,
        });
      }
      if (o.relOutput < 90) {
        warns.push({
          level: 'warn',
          text: `이 온도에서 광출력이 상온 대비 ${o.relOutput.toFixed(0)} % 입니다. 장비를 켜고 나서 밝기가 서서히 떨어지는 원인이 됩니다.`,
        });
      }
      warns.push({
        level: 'info',
        text: '열저항은 조명 하우징과 브래킷까지 포함한 값을 써야 실제와 맞습니다. 소자 단품 값만 쓰면 온도를 낮게 봅니다.',
      });
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
