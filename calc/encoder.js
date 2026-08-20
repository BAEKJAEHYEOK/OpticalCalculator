// 엔코더 · 트리거 대분류.
// 이송을 따라 라인을 찍을 때, 엔코더 펄스를 몇 개마다 촬상할지(분주비)와
// 트리거 보드에 넣을 펄스폭 설정값을 구한다.
// 이 값이 맞지 않으면 Y 방향 배율이 틀어져 상이 늘어나거나 눌린다.

// 엔코더가 픽셀보다 굵으면 상이 늘어나므로 그랩보드 스케일러로 보정해야 하고,
// 조밀하면 분주비로 나눠 촬상하면 된다. 어느 쪽인지 알려주는 문구는 모드마다 같다.
function scalerWarnings(v, o) {
  const warns = [];

  if (o.scaler > 1) {
    warns.push({
      level: 'warn',
      text: `엔코더 한 펄스가 ${o.encoderUm ? o.encoderUm.toFixed(2) : v.encoderUm} µm 로 픽셀 ${v.imageUm} µm 보다 굵습니다. 펄스마다 찍으면 Y 방향이 ${o.scaler.toFixed(2)} 배 늘어나므로, 그랩보드 스케일러로 보정하거나 더 조밀한 엔코더가 필요합니다.`,
    });
    return warns;
  }

  if (Number.isInteger(o.divider)) {
    warns.push({
      level: 'info',
      text: `분주비가 정수 ${o.divider} 로 딱 떨어집니다. Y 분해능이 이미지 분해능과 정확히 일치합니다.`,
    });
    return warns;
  }

  // 트리거 보드에는 정수만 들어가므로 어느 쪽으로 맞출지 미리 알려준다.
  if (o.dividerRound !== undefined) {
    const gapRound = Math.abs(o.yUmRound - v.imageUm);
    const gapFloor = Math.abs(o.yUmFloor - v.imageUm);
    const useRound = gapRound <= gapFloor;
    const pickDiv = useRound ? o.dividerRound : o.dividerFloor;
    const pickY = useRound ? o.yUmRound : o.yUmFloor;
    const pct = ((pickY - v.imageUm) / v.imageUm) * 100;
    warns.push({
      level: Math.abs(pct) > 5 ? 'warn' : 'info',
      text: `분주비 ${o.divider.toFixed(3)} 는 정수가 아닙니다. 트리거 보드에는 정수만 들어가므로 ${useRound ? '반올림' : '반내림'} 한 ${pickDiv} 을 쓰면 Y 분해능이 ${pickY.toFixed(3)} µm 가 되어 이미지 분해능과 ${pct.toFixed(1)} % 차이 납니다.`,
    });
  } else {
    warns.push({
      level: 'info',
      text: `분주비 ${o.divider.toFixed(2)} 로 나눠 촬상하면 됩니다. 분주비 계산기에서 트리거 설정값을 구하세요.`,
    });
  }
  return warns;
}

export const encoderCalculators = [
  {
    id: 'encoder-resolution',
    category: 'encoder',
    name: '엔코더 분해능 · 스케일러',
    en: 'Encoder Resolution',
    summary: '엔코더 분해능을 알면 스케일러만 구하고, 모르면 스테이지를 움직여 분해능부터 구합니다',
    tags: ['엔코더', 'encoder', '분해능', '스케일러', 'scaler', '펄스', 'PPR', '체배', '롤러', '리니어'],
    related: ['trigger-divider', 'line-rate'],
    modes: [
      {
        id: 'scaler',
        name: '스케일러 계산',
        en: 'Scaler',
        formula: [
          '스케일러 = 엔코더 분해능 / 이미지 분해능',
          '분주비 = 이미지 분해능 / 엔코더 분해능',
          'Y 분해능 = 엔코더 분해능 × 적용 분주비',
        ],
        inputs: [
          { key: 'encoderUm', label: '엔코더 분해능', en: 'Encoder Resolution', unit: 'µm/pulse',
            default: 2, min: 0.0001, step: 0.1,
            hint: '제어쪽에서 알려주는 한 펄스당 이송량' },
          { key: 'imageUm', label: '이미지 분해능', en: 'Pixel Size', unit: 'µm',
            default: 18.3, min: 0.001, step: 0.1,
            hint: '대상 위에서 픽셀 하나가 차지하는 크기' },
        ],
        outputs: [
          { key: 'scaler', label: '스케일러', en: 'Scaler', unit: '', digits: 4, primary: true },
          { key: 'divider', label: '분주비', en: 'Divider', unit: '', digits: 4, primary: true },
          { key: 'dividerRound', label: '적용 분주비 (반올림)', en: 'Round', unit: '', digits: 0 },
          { key: 'yUmRound', label: '반올림 시 Y 분해능', en: 'Y Resolution', unit: 'µm', digits: 3 },
          { key: 'dividerFloor', label: '적용 분주비 (반내림)', en: 'Floor', unit: '', digits: 0 },
          { key: 'yUmFloor', label: '반내림 시 Y 분해능', en: 'Y Resolution', unit: 'µm', digits: 3 },
        ],
        compute(v) {
          const divider = v.imageUm / v.encoderUm;
          const dividerFloor = Math.max(1, Math.floor(divider));
          const dividerRound = Math.max(1, Math.round(divider));
          return {
            scaler: v.encoderUm / v.imageUm,
            divider,
            dividerFloor,
            dividerRound,
            yUmFloor: v.encoderUm * dividerFloor,
            yUmRound: v.encoderUm * dividerRound,
          };
        },
        warn(v, o) {
          return scalerWarnings(v, o);
        },
      },
      {
        id: 'position',
        name: '엔코더 분해능 (실측)',
        en: 'Resolution — Measured',
        formula: [
          '이동량 = 이동 후 좌표 − 이동 전 좌표',
          '펄스 변화량 = 이동 후 펄스 위치 값 − 이동 전 펄스 위치 값',
          '엔코더 분해능(µm) = 이동량(mm) / 펄스 변화량 × 1000',
          '스케일러 = 엔코더 분해능 / 이미지 분해능',
        ],
        inputs: [
          { key: 'mmBefore', label: '이동 전 좌표', en: 'Position Before', unit: 'mm', default: 0, step: 1,
            hint: '물류의 mm 좌표' },
          { key: 'pulseBefore', label: '이동 전 펄스 위치 값', en: 'Pulse Before', unit: 'pulse', default: 0, step: 1,
            hint: '컨트롤러에서 읽은 위치값(AP)' },
          { key: 'mmAfter', label: '이동 후 좌표', en: 'Position After', unit: 'mm', default: 100, step: 1 },
          { key: 'pulseAfter', label: '이동 후 펄스 위치 값', en: 'Pulse After', unit: 'pulse', default: 500, step: 1 },
          { key: 'imageUm', label: '이미지 분해능', en: 'Pixel Size', unit: 'µm', default: 18.3, min: 0.001, step: 0.1 },
        ],
        outputs: [
          { key: 'encoderUm', label: '엔코더 분해능', en: 'Encoder Resolution', unit: 'µm/pulse', digits: 4, primary: true },
          { key: 'scaler', label: '스케일러', en: 'Scaler', unit: '', digits: 3, primary: true },
          { key: 'travelMm', label: '이동량', en: 'Travel', unit: 'mm', digits: 3 },
          { key: 'pulseDelta', label: '펄스 변화량', en: 'Pulse Change', unit: 'pulse', digits: 0 },
          { key: 'pulsePerMm', label: '1 mm 당 펄스', en: 'Pulses per mm', unit: 'pulse', digits: 2 },
          { key: 'divider', label: '분주비', en: 'Divider', unit: '', digits: 3 },
        ],
        compute(v) {
          const travelMm = v.mmAfter - v.mmBefore;
          const pulseDelta = v.pulseAfter - v.pulseBefore;
          // 되돌아오는 방향으로 재도 분해능 자체는 같다. 부호는 경고에서 따로 짚는다.
          const encoderUm = (Math.abs(travelMm) / Math.abs(pulseDelta)) * 1000;
          return {
            encoderUm,
            scaler: encoderUm / v.imageUm,
            travelMm,
            pulseDelta,
            pulsePerMm: Math.abs(pulseDelta) / Math.abs(travelMm),
            divider: v.imageUm / encoderUm,
            _reversed: travelMm * pulseDelta < 0,
          };
        },
        warn(v, o) {
          if (o.pulseDelta === 0 || o.travelMm === 0) {
            return [{
              level: 'danger',
              text: '이동량이나 펄스 변화량이 0 입니다. 두 지점이 실제로 달라야 분해능을 구할 수 있습니다.',
            }];
          }

          const warns = [];
          if (o._reversed) {
            warns.push({
              level: 'warn',
              text: '좌표는 늘었는데 펄스가 줄었습니다(또는 그 반대). 엔코더 계수 방향이 이송 방향과 반대라는 뜻이므로, A/B 상을 바꾸거나 컨트롤러에서 방향을 뒤집어야 합니다.',
            });
          }
          if (Math.abs(o.pulseDelta) < 1000) {
            warns.push({
              level: 'warn',
              text: `펄스 변화량이 ${Math.abs(o.pulseDelta)} 뿐입니다. 세는 오차가 ±1 펄스만 있어도 분해능이 ${(100 / Math.abs(o.pulseDelta)).toFixed(2)} % 틀어집니다. 더 멀리 이동시켜 재세요.`,
            });
          }
          if (o.encoderUm > v.imageUm) {
            warns.push({
              level: 'warn',
              text: `엔코더 한 펄스가 ${o.encoderUm.toFixed(2)} µm 로 픽셀보다 굵습니다. 펄스마다 찍으면 Y 방향이 ${o.scaler.toFixed(2)} 배 늘어납니다.`,
            });
          } else {
            warns.push({
              level: 'info',
              text: `분주비 ${o.divider.toFixed(2)} 로 나눠 촬상하면 됩니다. 분주비 계산기에서 트리거 설정값을 구하세요.`,
            });
          }
          return warns;
        },
      },
      {
        id: 'rotary',
        name: '엔코더 분해능 (사양)',
        en: 'Resolution — From Spec',
        formula: [
          '엔코더 분해능(µm) = 롤러 지름(µm) × π / (엔코더 PPR × 체배)',
          '스케일러 = 엔코더 분해능 / 이미지 분해능',
        ],
        inputs: [
          { key: 'rollerMm', label: '롤러 지름', en: 'Roller Diameter', unit: 'mm', default: 48, min: 0.001, step: 0.1 },
          { key: 'ppr', label: '엔코더 PPR', en: 'Pulses per Revolution', unit: 'pulse', default: 5000, min: 1, step: 1,
            hint: '엔코더 1회전당 펄스 수' },
          { key: 'multiplier', label: '체배', en: 'Multiplier', unit: '×', default: 4, min: 1, step: 1,
            hint: 'A/B상 4체배가 일반적' },
          { key: 'imageUm', label: '이미지 분해능', en: 'Pixel Size', unit: 'µm', default: 42, min: 0.001, step: 0.1 },
        ],
        outputs: [
          { key: 'encoderUm', label: '엔코더 분해능', en: 'Encoder Resolution', unit: 'µm/pulse', digits: 4, primary: true },
          { key: 'divider', label: '분주비', en: 'Divider', unit: '', digits: 4, primary: true },
          { key: 'totalPulses', label: '1회전당 총 펄스', en: 'Counts per Revolution', unit: 'pulse', digits: 0 },
          { key: 'circumferenceMm', label: '롤러 둘레', en: 'Circumference', unit: 'mm', digits: 2 },
          { key: 'scaler', label: '스케일러', en: 'Scaler', unit: '', digits: 4 },
        ],
        compute(v) {
          const totalPulses = v.ppr * v.multiplier;
          const circumferenceUm = v.rollerMm * 1000 * Math.PI;
          const encoderUm = circumferenceUm / totalPulses;
          return {
            encoderUm,
            divider: v.imageUm / encoderUm,
            totalPulses,
            circumferenceMm: circumferenceUm / 1000,
            scaler: encoderUm / v.imageUm,
          };
        },
        warn(v, o) {
          const warns = [{
            level: 'info',
            text: `분주비가 ${o.divider.toFixed(2)} 입니다. 트리거 보드에는 정수만 넣을 수 있으므로 분주비 계산기에서 반내림·반올림 결과를 비교하세요.`,
          }];
          warns.push({
            level: 'info',
            text: '원주율을 3.1416 으로 계산합니다. 기존 엑셀 시트가 3.14 를 쓴다면 값이 0.05 % 정도 차이 납니다.',
          });
          return warns;
        },
      },
      {
        id: 'required',
        name: '필요 PPR 역산',
        en: 'Required PPR',
        formula: [
          '필요 총 펄스 = 롤러 지름(µm) × π / 목표 엔코더 분해능(µm)',
          '필요 PPR = 필요 총 펄스 / 체배',
        ],
        inputs: [
          { key: 'rollerMm', label: '롤러 지름', en: 'Roller Diameter', unit: 'mm', default: 48, min: 0.001, step: 0.1 },
          { key: 'targetUm', label: '목표 엔코더 분해능', en: 'Target Resolution', unit: 'µm', default: 7.5, min: 0.001, step: 0.1 },
          { key: 'multiplier', label: '체배', en: 'Multiplier', unit: '×', default: 4, min: 1, step: 1 },
        ],
        outputs: [
          { key: 'requiredPpr', label: '필요 PPR', en: 'Required PPR', unit: 'pulse', digits: 0, primary: true },
          { key: 'requiredTotal', label: '필요 총 펄스', en: 'Counts per Revolution', unit: 'pulse', digits: 0, primary: true },
          { key: 'circumferenceMm', label: '롤러 둘레', en: 'Circumference', unit: 'mm', digits: 2 },
          { key: 'actualUm', label: '표준 PPR 적용 시 분해능', en: 'With Standard PPR', unit: 'µm', digits: 4 },
          { key: 'standardPpr', label: '가까운 표준 PPR', en: 'Nearest Standard', unit: 'pulse', digits: 0 },
        ],
        compute(v) {
          const circumferenceUm = v.rollerMm * 1000 * Math.PI;
          const requiredTotal = circumferenceUm / v.targetUm;
          const requiredPpr = requiredTotal / v.multiplier;
          // 시중 로터리 엔코더가 흔히 내는 PPR. 이 중 가까운 것을 골라 실제 분해능을 낸다.
          const STANDARD = [100, 200, 360, 500, 600, 1000, 1024, 2000, 2500, 3600, 5000, 10000];
          const standardPpr = STANDARD.reduce(
            (best, cur) => (Math.abs(cur - requiredPpr) < Math.abs(best - requiredPpr) ? cur : best),
            STANDARD[0]
          );
          return {
            requiredPpr,
            requiredTotal,
            circumferenceMm: circumferenceUm / 1000,
            standardPpr,
            actualUm: circumferenceUm / (standardPpr * v.multiplier),
          };
        },
        warn(v, o) {
          const gap = ((o.actualUm - v.targetUm) / v.targetUm) * 100;
          return [{
            level: Math.abs(gap) > 10 ? 'warn' : 'info',
            text: `표준 ${o.standardPpr} PPR 을 쓰면 분해능이 ${o.actualUm.toFixed(3)} µm 로 목표와 ${gap.toFixed(1)} % 차이 납니다. 분주비를 정수로 맞출 수 있는지 함께 확인하세요.`,
          }];
        },
      },
    ],
  },

  {
    id: 'tdi-alignment',
    category: 'encoder',
    name: 'TDI 정합 · 스케일러 보정',
    en: 'TDI Alignment',
    summary: '분주비를 정수로 넣어 버려진 소수점이 TDI 에서 얼마나 번지는지, 스케일러로 어떻게 되돌리는지 구합니다',
    tags: ['TDI', '스미어', 'smear', '정합', '스케일러', 'scaler', 'DCF', '분주비', '늘어짐', '진동', '단수'],
    related: ['trigger-divider', 'encoder-resolution', 'line-rate'],
    formula: [
      '이상 분주비 = 이미지 분해능 / 엔코더 분해능',
      '실제 Y 분해능 = 엔코더 분해능 × 적용 분주비',
      '스케일러 = 적용 분주비 / 이상 분주비',
      'TDI 스미어(px) = TDI 단수 × | 1 − 스케일러 |',
      'SW 트리거 라인레이트 = 이송 속도(mm/s) × 1000 / 이미지 분해능(µm)',
    ],
    inputs: [
      { key: 'imageUm', label: '이미지 분해능', en: 'Pixel Size', unit: 'µm', default: 18.3, min: 0.001, step: 0.1,
        hint: '대상 위 가로 픽셀 크기. Y 를 여기에 맞춰야 합니다' },
      { key: 'encoderUm', label: '엔코더 분해능', en: 'Encoder Resolution', unit: 'µm/pulse', default: 2, min: 0.0001, step: 0.1 },
      { key: 'dividerInt', label: '적용 분주비', en: 'Divider Entered', unit: '', default: 9, min: 1, step: 1,
        hint: '트리거 프로그램에 실제로 넣은 정수' },
      { key: 'tdiStages', label: 'TDI 단수', en: 'TDI Stages', unit: '', default: 256, min: 1, step: 1,
        hint: '단수가 높을수록 오차에 민감합니다' },
      { key: 'speedMmS', label: '이송 속도', en: 'Speed', unit: 'mm/s', default: 300, min: 0.001, step: 10,
        hint: 'SW 트리거 라인레이트 계산용' },
    ],
    outputs: [
      { key: 'smearPx', label: 'TDI 스미어', en: 'TDI Smear', unit: 'px', digits: 2, primary: true },
      { key: 'scaler', label: '스케일러', en: 'Scaler', unit: '', digits: 5, primary: true },
      { key: 'idealDivider', label: '이상 분주비', en: 'Ideal Divider', unit: '', digits: 4 },
      { key: 'actualYUm', label: '실제 Y 분해능', en: 'Actual Y', unit: 'µm', digits: 4 },
      { key: 'errorPct', label: '배율 오차', en: 'Scale Error', unit: '%', digits: 3 },
      { key: 'scalerInv', label: '스케일러 역수', en: 'Reciprocal', unit: '', digits: 5 },
      { key: 'maxStages', label: '1 px 이내 허용 TDI 단수', en: 'Max Stages', unit: '', digits: 0 },
      { key: 'swLineRate', label: 'SW 트리거 라인레이트', en: 'SW Trigger Line Rate', unit: 'lines/s', digits: 1 },
    ],
    compute(v) {
      const idealDivider = v.imageUm / v.encoderUm;
      const actualYUm = v.encoderUm * v.dividerInt;
      // 실제 이송 피치가 픽셀보다 짧으면 같은 물체를 더 많은 라인으로 찍어 Y 로 늘어난다.
      const scaler = v.dividerInt / idealDivider;
      const mismatch = Math.abs(1 - scaler);
      return {
        idealDivider,
        actualYUm,
        scaler,
        scalerInv: 1 / scaler,
        errorPct: (scaler - 1) * 100,
        // TDI 는 단을 넘길 때마다 오차가 쌓이므로 단수에 비례해 번진다.
        smearPx: v.tdiStages * mismatch,
        maxStages: mismatch > 0 ? Math.floor(1 / mismatch) : Infinity,
        swLineRate: (v.speedMmS * 1000) / v.imageUm,
        _mismatch: mismatch,
      };
    },
    warn(v, o) {
      const warns = [];

      if (o._mismatch === 0) {
        warns.push({
          level: 'info',
          text: '적용 분주비가 이상 분주비와 정확히 같습니다. 스케일러 보정이 필요 없고 TDI 단수를 올려도 번지지 않습니다.',
        });
        return warns;
      }

      const stretched = o.scaler < 1;
      warns.push({
        level: o.smearPx > 1 ? 'danger' : 'warn',
        text: `버려진 소수점 때문에 Y 방향이 ${Math.abs(o.errorPct).toFixed(2)} % ${stretched ? '늘어납니다' : '눌립니다'}. TDI ${v.tdiStages} 단에서는 ${o.smearPx.toFixed(2)} px 번집니다.`,
      });

      if (o.smearPx > 1) {
        warns.push({
          level: 'info',
          text: `이 분주비로는 TDI ${o.maxStages} 단까지가 한계입니다(스미어 1 px 기준). 단수를 낮추거나 아래 두 방법 중 하나로 보정하세요.`,
        });
      }

      warns.push({
        level: 'info',
        text: `보정 1 — 그랩보드 DCF 의 Y 스케일러에 ${o.scaler.toFixed(5)} 를 넣습니다. 그 항목이 "늘릴 배수" 로 정의돼 있다면 역수 ${o.scalerInv.toFixed(5)} 를 넣으세요.`,
      });
      warns.push({
        level: 'info',
        text: `보정 2 — 엔코더 트리거 대신 소프트웨어 트리거로 ${o.swLineRate.toFixed(1)} lines/s 를 직접 주면 정수 제약이 사라져 오차가 0 이 됩니다. 다만 이송 속도가 흔들리면 그대로 오차가 됩니다.`,
      });

      return warns;
    },
  },

  {
    id: 'trigger-divider',
    category: 'encoder',
    name: '분주비 · 트리거 펄스폭',
    en: 'Trigger Divider',
    summary: '트리거 보드에 넣을 분주비와 펄스폭 설정값을 구합니다. 이 값이 맞아야 Y 배율이 틀어지지 않습니다',
    tags: ['분주비', 'divider', '트리거', 'trigger', '펄스폭', 'pulse width', '엔코더', '주파수', '라인스캔'],
    related: ['encoder-resolution', 'line-rate'],
    formula: [
      '분주비 = 이미지 분해능(µm) / 엔코더 분해능(µm)',
      '입력엔코더 최대주파수(Hz) = 최대 이동속도(µm/s) / 엔코더 분해능(µm)',
      '입력엔코더 주기(µs) = 1 / 최대주파수 × 1000000',
      '트리거 유효 펄스폭(µs) = 입력엔코더 주기 − 가드 타임',
      '펄스폭 설정값 = 트리거 유효 펄스폭 × 1000 / 타이머 분해능(ns)',
      '트리거 출력 주기(µs) = 입력엔코더 주기 × 적용 분주비',
    ],
    inputs: [
      { key: 'imageUm', label: '이미지 분해능', en: 'Pixel Size', unit: 'µm', default: 18, min: 0.001, step: 0.1,
        hint: '대상 위 픽셀 크기. 이 값에 Y 분해능을 맞춥니다' },
      { key: 'encoderUm', label: '엔코더 분해능', en: 'Encoder Resolution', unit: 'µm', default: 2, min: 0.0001, step: 0.1,
        hint: '엔코더 한 펄스당 이송량' },
      { key: 'speedMmS', label: '최대 이동속도', en: 'Max Speed', unit: 'mm/s', default: 300, min: 0.001, step: 10 },
      { key: 'guardUs', label: '가드 타임', en: 'Guard Time', unit: 'µs', default: 0.1, min: 0, step: 0.01,
        hint: '펄스폭이 주기를 넘지 않도록 빼는 여유' },
      { key: 'timerNs', label: '타이머 분해능', en: 'Timer Resolution', unit: 'ns', default: 20, min: 0.1, step: 1,
        hint: '트리거 보드의 설정 단위. ER-3 는 20 ns' },
    ],
    outputs: [
      { key: 'divider', label: '분주비', en: 'Divider', unit: '', digits: 4, primary: true },
      { key: 'pwSetting', label: '펄스폭 설정값', en: 'Pulse Width Setting', unit: '', digits: 0, primary: true },
      { key: 'dividerFloor', label: '적용 분주비 (반내림)', en: 'Floor', unit: '', digits: 0 },
      { key: 'yUmFloor', label: '반내림 시 Y 분해능', en: 'Y Resolution', unit: 'µm', digits: 3 },
      { key: 'dividerRound', label: '적용 분주비 (반올림)', en: 'Round', unit: '', digits: 0 },
      { key: 'yUmRound', label: '반올림 시 Y 분해능', en: 'Y Resolution', unit: 'µm', digits: 3 },
      { key: 'maxFreqHz', label: '입력엔코더 최대주파수', en: 'Max Frequency', unit: 'Hz', digits: 0 },
      { key: 'periodUs', label: '입력엔코더 주기', en: 'Encoder Period', unit: 'µs', digits: 4 },
      { key: 'pulseWidthUs', label: '트리거 유효 펄스폭', en: 'Trigger Pulse Width', unit: 'µs', digits: 4 },
      { key: 'triggerPeriodUs', label: '트리거 출력 주기', en: 'Trigger Period', unit: 'µs', digits: 3 },
      { key: 'lineRate', label: '라인레이트', en: 'Line Rate', unit: 'lines/s', digits: 0 },
      { key: 'delay', label: '딜레이', en: 'Delay', unit: '', digits: 0 },
    ],
    compute(v) {
      const divider = v.imageUm / v.encoderUm;
      const dividerFloor = Math.max(1, Math.floor(divider));
      const dividerRound = Math.max(1, Math.round(divider));
      const maxFreqHz = (v.speedMmS * 1000) / v.encoderUm;
      const periodUs = (1 / maxFreqHz) * 1e6;
      const pulseWidthUs = periodUs - v.guardUs;
      const triggerPeriodUs = periodUs * dividerRound;
      return {
        divider,
        dividerFloor,
        dividerRound,
        yUmFloor: v.encoderUm * dividerFloor,
        yUmRound: v.encoderUm * dividerRound,
        maxFreqHz,
        periodUs,
        pulseWidthUs,
        // 설정값은 타이머 눈금 개수라 정수여야 한다. 나머지는 버린다.
        pwSetting: Math.floor((pulseWidthUs * 1000) / v.timerNs),
        triggerPeriodUs,
        lineRate: 1e6 / triggerPeriodUs,
        // 트리거 보드 딜레이는 기본 0 으로 둔다.
        delay: 0,
      };
    },
    warn(v, o) {
      const warns = [];

      if (o.pulseWidthUs <= 0) {
        return [{
          level: 'danger',
          text: `입력엔코더 주기 ${o.periodUs.toFixed(3)} µs 가 가드 타임 ${v.guardUs} µs 보다 짧습니다. 이 속도에서는 트리거를 낼 수 없으니 이송을 늦추거나 분해능이 굵은 엔코더를 쓰세요.`,
        }];
      }

      if (Number.isInteger(o.divider)) {
        warns.push({
          level: 'info',
          text: `분주비가 정수 ${o.divider} 로 딱 떨어집니다. Y 분해능이 이미지 분해능과 정확히 일치합니다.`,
        });
      } else {
        // 정수만 넣을 수 있으므로 어느 쪽이 이미지 분해능에 가까운지 알려준다.
        const gapFloor = Math.abs(o.yUmFloor - v.imageUm);
        const gapRound = Math.abs(o.yUmRound - v.imageUm);
        const pick = gapRound <= gapFloor ? '반올림' : '반내림';
        const pickDiv = gapRound <= gapFloor ? o.dividerRound : o.dividerFloor;
        const pickY = gapRound <= gapFloor ? o.yUmRound : o.yUmFloor;
        const pct = ((pickY - v.imageUm) / v.imageUm) * 100;
        warns.push({
          level: 'warn',
          text: `분주비 ${o.divider.toFixed(3)} 는 정수가 아닙니다. 트리거 보드에는 정수만 들어가므로 ${pick} 한 ${pickDiv} 을 쓰면 Y 분해능이 ${pickY.toFixed(3)} µm 가 되어 이미지 분해능과 ${pct.toFixed(1)} % 차이 납니다.`,
        });
        if (Math.abs(pct) > 5) {
          warns.push({
            level: 'warn',
            text: `${Math.abs(pct).toFixed(1)} % 는 상이 눈에 띄게 늘어나거나 눌리는 수준입니다. 엔코더 분해능이나 렌즈 배율을 조정해 분주비가 정수에 가깝게 나오도록 맞추세요.`,
          });
        }
      }

      warns.push({
        level: 'info',
        text: `펄스폭 설정값 ${o.pwSetting} 은 타이머 눈금 개수입니다. 실제 폭은 ${((o.pwSetting * v.timerNs) / 1000).toFixed(3)} µs 이며, 딜레이는 0 으로 둡니다.`,
      });

      return warns;
    },
  },
];
