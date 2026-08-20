// 공정능력 대분류.
// 측정한 값이 규격 안에 얼마나 여유 있게 들어오는지, 그리고 그 판단을
// 믿어도 되는지(측정계가 충분히 정밀한지)를 다룬다.
//
// Cpk 가 나쁠 때 공정 탓인지 측정계 탓인지 가르지 못하면 엉뚱한 곳을 고치게 된다.
// 그래서 Gage R&R 을 같은 대분류에 둔다.

import { capabilityView, contributionBars } from '../core/diagram.js';

// erfc 체비쇼프 근사(Numerical Recipes). 급수 근사와 달리 꼬리 쪽에서도
// 상대 정밀도가 유지돼야 PPM 을 제대로 낼 수 있다.
const ERFC_COF = [
  -1.3026537197817094, 6.4196979235649026e-1, 1.9476473204185836e-2, -9.561514786808631e-3,
  -9.46595344482036e-4, 3.66839497852761e-4, 4.2523324806907e-5, -2.0278578112534e-5,
  -1.624290004647e-6, 1.30365583558e-6, 1.5626441722e-8, -8.5238095915e-8,
  6.529054439e-9, 5.059343495e-9, -9.91364156e-10, -2.27365122e-10,
  9.6467911e-11, 2.394038e-12, -6.886027e-12, 8.94487e-13, 3.13092e-13,
  -1.12708e-13, 3.81e-16, 7.106e-15, -1.523e-15, -9.4e-17, 1.21e-16, -2.8e-17,
];

function erfcPos(z) {
  const t = 2 / (2 + z);
  const ty = 4 * t - 2;
  let d = 0;
  let dd = 0;
  for (let j = ERFC_COF.length - 1; j > 0; j--) {
    const tmp = d;
    d = ty * d - dd + ERFC_COF[j];
    dd = tmp;
  }
  return t * Math.exp(-z * z + 0.5 * (ERFC_COF[0] + ty * d) - dd);
}

export const erfc = (x) => (x >= 0 ? erfcPos(x) : 2 - erfcPos(-x));

// 표준정규 하측 확률. Φ(−3) = 0.00135 처럼 규격 밖 비율을 낼 때 쓴다.
export const normalCdf = (z) => 0.5 * erfc(-z / Math.SQRT2);

// 한쪽 규격을 벗어날 확률을 PPM 으로. 지수 z 는 3 × Cpu 또는 3 × Cpl 이다.
const ppmBeyond = (z) => 0.5 * erfc(z / Math.SQRT2) * 1e6;

const AIAG = (pct) =>
  pct < 10 ? '양호' : pct <= 30 ? '조건부 사용' : '사용 불가';

export const capabilityCalculators = [
  {
    id: 'process-capability',
    category: 'capability',
    name: '공정능력 Cp · Cpk',
    en: 'Process Capability',
    summary: '규격과 평균·산포로 Cp, Cpk, 시그마 수준, PPM 불량률을 구합니다',
    tags: ['공정능력', 'Cp', 'Cpk', 'Cpm', 'capability', 'PPM', '불량률', '수율', '시그마 수준', '규격', '공차'],
    related: ['gage-rr', 'tolerance-budget', 'align-budget'],
    modes: [
      {
        id: 'index',
        name: '지수 계산',
        en: 'Capability Index',
        formula: [
          'Cp = (USL − LSL) / (6 × 표준편차)',
          'Cpu = (USL − 평균) / (3 × 표준편차)',
          'Cpl = (평균 − LSL) / (3 × 표준편차)',
          'Cpk = min(Cpu, Cpl)',
          '시그마 수준 = 3 × Cpk',
          'PPM 불량 = [ Φ(−3Cpu) + Φ(−3Cpl) ] × 10⁶',
        ],
        inputs: [
          { key: 'usl', label: 'USL', en: 'Upper Spec Limit', unit: 'µm', default: 10, step: 1,
            hint: '규격 상한. 단위만 맞으면 µm 가 아니어도 됩니다' },
          { key: 'lsl', label: 'LSL', en: 'Lower Spec Limit', unit: 'µm', default: -10, step: 1 },
          { key: 'mean', label: '평균', en: 'Mean', unit: 'µm', default: 1.2, step: 0.1 },
          { key: 'sigma', label: '표준편차', en: 'Standard Deviation', unit: 'µm', default: 2.4, min: 1e-9, step: 0.1,
            hint: '표본 표준편차 s' },
        ],
        outputs: [
          { key: 'cpk', label: 'Cpk', en: 'Cpk', unit: '', digits: 3, primary: true },
          { key: 'cp', label: 'Cp', en: 'Cp', unit: '', digits: 3, primary: true },
          { key: 'ppm', label: 'PPM 불량', en: 'Defect Rate', unit: 'PPM', digits: 2, primary: true },
          { key: 'cpu', label: 'Cpu', en: 'Cpu', unit: '', digits: 3 },
          { key: 'cpl', label: 'Cpl', en: 'Cpl', unit: '', digits: 3 },
          { key: 'cpm', label: 'Cpm', en: 'Cpm', unit: '', digits: 3 },
          { key: 'sigmaLevel', label: '시그마 수준', en: 'Sigma Level', unit: 'σ', digits: 2 },
          { key: 'kOffset', label: '편심률', en: 'Offset Ratio', unit: '', digits: 3 },
          { key: 'yieldPct', label: '수율', en: 'Yield', unit: '%', digits: 5 },
        ],
        compute(v) {
          const width = v.usl - v.lsl;
          const center = (v.usl + v.lsl) / 2;
          const cp = width / (6 * v.sigma);
          const cpu = (v.usl - v.mean) / (3 * v.sigma);
          const cpl = (v.mean - v.lsl) / (3 * v.sigma);
          const cpk = Math.min(cpu, cpl);
          const ppm = ppmBeyond(3 * cpu) + ppmBeyond(3 * cpl);
          return {
            cp,
            cpu,
            cpl,
            cpk,
            // Cpm 은 중앙에서 벗어난 몫을 산포와 같이 취급한다. 편심에 더 민감하다.
            cpm: width / (6 * Math.hypot(v.sigma, v.mean - center)),
            sigmaLevel: 3 * cpk,
            kOffset: width !== 0 ? Math.abs(v.mean - center) / (width / 2) : Infinity,
            ppm,
            yieldPct: 100 - ppm / 1e4,
          };
        },
        diagram(v, o) {
          return [
            capabilityView({
              lsl: v.lsl,
              usl: v.usl,
              mean: v.mean,
              sigma: v.sigma,
              cp: o.cp,
              cpk: o.cpk,
              ppm: o.ppm,
            }),
          ];
        },
        warn(v, o) {
          const warns = [];
          if (v.usl <= v.lsl) {
            return [{ level: 'danger', text: 'USL 이 LSL 보다 크지 않습니다. 규격을 확인하세요.' }];
          }
          if (o.cpk < 1) {
            warns.push({
              level: 'danger',
              text: `Cpk ${o.cpk.toFixed(2)} 는 1 미만입니다. 분포가 이미 규격을 물고 있어 ${o.ppm.toFixed(0)} PPM 이 규격 밖입니다.`,
            });
          } else if (o.cpk < 1.33) {
            warns.push({
              level: 'warn',
              text: `Cpk ${o.cpk.toFixed(2)} 는 통상 기준인 1.33 에 못 미칩니다. 불량 ${o.ppm.toFixed(1)} PPM.`,
            });
          } else {
            warns.push({
              level: 'info',
              text: `Cpk ${o.cpk.toFixed(2)}, 시그마 수준 ${o.sigmaLevel.toFixed(2)}σ, 불량 ${o.ppm.toFixed(2)} PPM 입니다.`,
            });
          }
          if (o.cp - o.cpk > 0.1) {
            warns.push({
              level: 'warn',
              text: `Cp ${o.cp.toFixed(2)} 와 Cpk ${o.cpk.toFixed(2)} 의 차이는 평균이 중앙에서 벗어난 몫입니다. 산포를 줄이지 않고 평균만 중앙으로 옮겨도 Cpk 가 ${o.cp.toFixed(2)} 까지 올라갑니다.`,
            });
          }
          return warns;
        },
      },
      {
        id: 'required',
        name: '목표 Cpk 역산',
        en: 'Required Sigma',
        formula: [
          '허용 표준편차 = min(USL − 평균, 평균 − LSL) / (3 × 목표 Cpk)',
          '허용 산포 = 6 × 허용 표준편차',
          '중심 정렬 시 허용 표준편차 = (USL − LSL) / (6 × 목표 Cpk)',
        ],
        inputs: [
          { key: 'usl', label: 'USL', en: 'Upper Spec Limit', unit: 'µm', default: 10, step: 1 },
          { key: 'lsl', label: 'LSL', en: 'Lower Spec Limit', unit: 'µm', default: -10, step: 1 },
          { key: 'mean', label: '평균', en: 'Mean', unit: 'µm', default: 1.2, step: 0.1,
            hint: '평균을 중앙으로 옮길 수 있다면 0 으로 두고 보세요' },
          { key: 'targetCpk', label: '목표 Cpk', en: 'Target Cpk', unit: '', default: 1.33, min: 0.01, step: 0.01,
            hint: '양산 기준은 보통 1.33, 안전 특성은 1.67' },
        ],
        outputs: [
          { key: 'allowedSigma', label: '허용 표준편차', en: 'Allowed Sigma', unit: 'µm', digits: 4, primary: true },
          { key: 'allowedSpread', label: '허용 산포', en: 'Allowed Spread', unit: 'µm 6σ', digits: 3, primary: true },
          { key: 'centeredSigma', label: '중심 정렬 시 허용 표준편차', en: 'Centered Sigma', unit: 'µm', digits: 4, primary: true },
          { key: 'centeringGain', label: '중심 정렬 이득', en: 'Centering Gain', unit: '×', digits: 3 },
          { key: 'ppmAtTarget', label: '목표에서의 PPM', en: 'PPM at Target', unit: 'PPM', digits: 3 },
        ],
        compute(v) {
          const nearest = Math.min(v.usl - v.mean, v.mean - v.lsl);
          const allowedSigma = nearest / (3 * v.targetCpk);
          const centeredSigma = (v.usl - v.lsl) / (6 * v.targetCpk);
          return {
            allowedSigma,
            allowedSpread: 6 * allowedSigma,
            centeredSigma,
            centeringGain: allowedSigma > 0 ? centeredSigma / allowedSigma : Infinity,
            // 한쪽만 아슬아슬한 상태이므로 가까운 쪽 규격의 확률이 사실상 전부다.
            ppmAtTarget: ppmBeyond(3 * v.targetCpk),
          };
        },
        warn(v, o) {
          if (o.allowedSigma <= 0) {
            return [{ level: 'danger', text: '평균이 이미 규격 밖입니다. 산포를 아무리 줄여도 목표 Cpk 에 닿지 않습니다.' }];
          }
          const warns = [{
            level: 'info',
            text: `Cpk ${v.targetCpk} 를 만족하려면 표준편차가 ${o.allowedSigma.toFixed(3)} µm 이하여야 합니다. 실측 산포 폭(6σ)으로는 ${o.allowedSpread.toFixed(2)} µm 입니다.`,
          }];
          if (o.centeringGain > 1.05) {
            warns.push({
              level: 'warn',
              text: `평균을 중앙으로 옮기면 허용 표준편차가 ${o.centeredSigma.toFixed(3)} µm 까지 늘어납니다. 산포를 줄이는 것보다 ${o.centeringGain.toFixed(2)} 배 헐거워지므로, 편심부터 잡는 편이 대개 쉽습니다.`,
            });
          }
          return warns;
        },
      },
    ],
  },

  {
    id: 'gage-rr',
    category: 'capability',
    name: 'Gage R&R · 측정계 능력',
    en: 'Gage R&R',
    summary: '측정계 산포가 공차와 부품 산포에 비해 얼마나 큰지 재고, 관측 Cpk 에서 측정 몫을 걷어냅니다',
    tags: ['Gage R&R', 'GRR', '측정 시스템', 'MSA', '반복성', '재현성', 'P/T', 'NDC', '측정 오차', '분해능'],
    related: ['process-capability', 'tolerance-budget', 'align-budget'],
    modes: [
      {
        id: 'grr',
        name: '측정계 능력 평가',
        en: 'Gage Capability',
        formula: [
          '측정계 산포 = √(반복성² + 재현성²)',
          '총 산포 = √(측정계 산포² + 부품 산포²)',
          '%GRR = 측정계 산포 / 총 산포 × 100',
          'P/T 비 = 6 × 측정계 산포 / 공차 폭 × 100',
          'NDC = 1.41 × 부품 산포 / 측정계 산포',
        ],
        inputs: [
          { key: 'repeatUm', label: '반복성', en: 'Repeatability', unit: 'µm', default: 0.8, min: 0, step: 0.1,
            hint: '같은 사람이 같은 대상을 반복 측정했을 때의 산포' },
          { key: 'reprodUm', label: '재현성', en: 'Reproducibility', unit: 'µm', default: 0.5, min: 0, step: 0.1,
            hint: '측정자나 장비를 바꿨을 때 생기는 차이' },
          { key: 'partUm', label: '부품 산포', en: 'Part Variation', unit: 'µm', default: 4, min: 0, step: 0.5 },
          { key: 'tolUm', label: '공차 폭', en: 'Tolerance', unit: 'µm', default: 20, min: 1e-9, step: 1,
            hint: 'USL − LSL' },
        ],
        outputs: [
          { key: 'pctGRR', label: '%GRR', en: 'Percent GRR', unit: '%', digits: 2, primary: true },
          { key: 'ptRatio', label: 'P/T 비', en: 'Precision to Tolerance', unit: '%', digits: 2, primary: true },
          { key: 'ndc', label: 'NDC', en: 'Number of Distinct Categories', unit: '구간', digits: 0, primary: true },
          { key: 'grrUm', label: '측정계 산포', en: 'Gage Variation', unit: 'µm', digits: 3 },
          { key: 'totalUm', label: '총 산포', en: 'Total Variation', unit: 'µm', digits: 3 },
          { key: 'pctRepeat', label: '반복성 비중', en: 'Repeatability Share', unit: '%', digits: 2 },
          { key: 'pctReprod', label: '재현성 비중', en: 'Reproducibility Share', unit: '%', digits: 2 },
        ],
        compute(v) {
          const grrUm = Math.hypot(v.repeatUm, v.reprodUm);
          const totalUm = Math.hypot(grrUm, v.partUm);
          return {
            grrUm,
            totalUm,
            pctGRR: totalUm > 0 ? (grrUm / totalUm) * 100 : 0,
            pctRepeat: totalUm > 0 ? (v.repeatUm / totalUm) * 100 : 0,
            pctReprod: totalUm > 0 ? (v.reprodUm / totalUm) * 100 : 0,
            ptRatio: ((6 * grrUm) / v.tolUm) * 100,
            // 측정계가 부품 산포를 몇 단계로 구분해 낼 수 있는지. 5 이상을 요구한다.
            ndc: grrUm > 0 ? Math.floor(1.41 * (v.partUm / grrUm)) : Infinity,
          };
        },
        diagram(v, o) {
          const varTotal = v.repeatUm ** 2 + v.reprodUm ** 2 + v.partUm ** 2;
          const pct = (x) => (varTotal > 0 ? ((x * x) / varTotal) * 100 : 0);
          return [
            contributionBars({
              items: [
                { name: '반복성', pct: pct(v.repeatUm) },
                { name: '재현성', pct: pct(v.reprodUm) },
                { name: '부품 산포', pct: pct(v.partUm) },
              ],
              totalUm: o.totalUm,
            }),
          ];
        },
        warn(v, o) {
          const warns = [];
          const verdict = AIAG(o.pctGRR);
          const level = o.pctGRR < 10 ? 'info' : o.pctGRR <= 30 ? 'warn' : 'danger';
          warns.push({
            level,
            text: `%GRR ${o.pctGRR.toFixed(1)} % — AIAG 기준 ${verdict}. 10 % 미만 양호, 30 % 초과는 사용 불가입니다.`,
          });
          if (o.ptRatio > 30) {
            warns.push({
              level: 'danger',
              text: `P/T 비 ${o.ptRatio.toFixed(1)} % 로 측정계가 공차의 ${(o.ptRatio / 100).toFixed(2)} 배를 잡아먹습니다. 이 측정계로는 합부 판정을 믿기 어렵습니다.`,
            });
          }
          if (o.ndc < 5) {
            warns.push({
              level: 'danger',
              text: `NDC ${o.ndc} 구간입니다. 5 이상이어야 부품 간 차이를 구분할 수 있습니다.`,
            });
          }
          if (v.repeatUm > v.reprodUm * 1.5) {
            warns.push({
              level: 'info',
              text: '반복성이 지배적입니다. 조명·초점·에지 검출처럼 장비 자체의 문제를 먼저 보세요.',
            });
          } else if (v.reprodUm > v.repeatUm * 1.5) {
            warns.push({
              level: 'info',
              text: '재현성이 지배적입니다. 티칭 값이나 셋업 절차가 사람마다 다른 것을 의심하세요.',
            });
          }
          return warns;
        },
      },
      {
        id: 'true-sigma',
        name: '측정 오차 걷어내기',
        en: 'True Process Sigma',
        formula: [
          '실제 공정 산포 = √(관측 산포² − 측정계 산포²)',
          '관측 Cpk = min(USL − 평균, 평균 − LSL) / (3 × 관측 산포)',
          '실제 Cpk = min(USL − 평균, 평균 − LSL) / (3 × 실제 공정 산포)',
          '측정계 몫 = 측정계 산포² / 관측 산포²',
        ],
        inputs: [
          { key: 'obsSigma', label: '관측 산포', en: 'Observed Sigma', unit: 'µm', default: 2.4, min: 1e-9, step: 0.1,
            hint: '측정값을 그대로 모아 낸 표준편차' },
          { key: 'gaugeSigma', label: '측정계 산포', en: 'Gage Sigma', unit: 'µm', default: 0.943, min: 0, step: 0.1,
            hint: 'Gage R&R 이 내놓은 측정계 산포' },
          { key: 'usl', label: 'USL', en: 'Upper Spec Limit', unit: 'µm', default: 10, step: 1 },
          { key: 'lsl', label: 'LSL', en: 'Lower Spec Limit', unit: 'µm', default: -10, step: 1 },
          { key: 'mean', label: '평균', en: 'Mean', unit: 'µm', default: 1.2, step: 0.1 },
        ],
        outputs: [
          { key: 'trueSigma', label: '실제 공정 산포', en: 'True Sigma', unit: 'µm', digits: 4, primary: true },
          { key: 'cpkTrue', label: '실제 Cpk', en: 'True Cpk', unit: '', digits: 3, primary: true },
          { key: 'cpkObs', label: '관측 Cpk', en: 'Observed Cpk', unit: '', digits: 3, primary: true },
          { key: 'cpkGain', label: 'Cpk 차이', en: 'Cpk Gap', unit: '', digits: 3 },
          { key: 'gaugeSharePct', label: '측정계 몫', en: 'Gage Share', unit: '%', digits: 2 },
          { key: 'ppmTrue', label: '실제 PPM 불량', en: 'True Defect Rate', unit: 'PPM', digits: 3 },
        ],
        compute(v) {
          const nearest = Math.min(v.usl - v.mean, v.mean - v.lsl);
          const trueVar = v.obsSigma ** 2 - v.gaugeSigma ** 2;
          const trueSigma = trueVar > 0 ? Math.sqrt(trueVar) : NaN;
          const cpkObs = nearest / (3 * v.obsSigma);
          const cpkTrue = trueVar > 0 ? nearest / (3 * trueSigma) : NaN;
          // 양쪽 규격을 각각 벗어날 확률을 더한다. 편심이 크면 한쪽이 사실상 전부다.
          const ppmTrue = trueVar > 0
            ? ppmBeyond((v.usl - v.mean) / trueSigma) + ppmBeyond((v.mean - v.lsl) / trueSigma)
            : NaN;
          return {
            trueSigma,
            cpkObs,
            cpkTrue,
            cpkGain: cpkTrue - cpkObs,
            gaugeSharePct: (v.gaugeSigma ** 2 / v.obsSigma ** 2) * 100,
            ppmTrue,
          };
        },
        warn(v, o) {
          if (!(o.trueSigma > 0)) {
            return [{
              level: 'danger',
              text: '측정계 산포가 관측 산포 이상입니다. 보이는 산포가 전부 측정 잡음이라는 뜻이거나, 두 값을 다른 조건에서 잰 것입니다.',
            }];
          }
          const warns = [{
            level: 'info',
            text: `관측 Cpk ${o.cpkObs.toFixed(2)} 중 측정계가 갉아먹은 몫을 걷어내면 실제 Cpk 는 ${o.cpkTrue.toFixed(2)} 입니다.`,
          }];
          if (o.gaugeSharePct > 30) {
            warns.push({
              level: 'danger',
              text: `보이는 산포의 ${o.gaugeSharePct.toFixed(0)} % 가 측정계에서 나옵니다. 공정을 손대기 전에 측정계를 먼저 잡아야 합니다. 공정만 개선하면 Cpk 는 ${o.cpkObs.toFixed(2)} 근처에서 더 오르지 않습니다.`,
            });
          } else if (o.cpkGain > 0.1) {
            warns.push({
              level: 'warn',
              text: `측정계를 완전히 없앨 수 있다면 Cpk 가 ${o.cpkGain.toFixed(2)} 만큼 올라갑니다.`,
            });
          }
          return warns;
        },
      },
    ],
  },

  {
    id: 'tolerance-budget',
    category: 'capability',
    name: '오차 배분',
    en: 'Tolerance Budget',
    summary: '여러 오차원을 제곱합으로 합쳐 총 오차와 공차 대비 여유를 구하고, 어느 항목이 지배적인지 봅니다',
    tags: ['오차 배분', 'budget', '공차', 'tolerance', 'RSS', '제곱합', '기여도', '합성 오차', '정렬'],
    related: ['process-capability', 'align-budget', 'gage-rr'],
    formula: [
      '합성 오차 = √(정렬² + 측정² + 스테이지² + 열² + 기타²)',
      '기여율 = 각 항목² / 합성 오차²',
      '총 산포 = 6 × 합성 오차',
      '공차 대비 Cp = 공차 폭 / (6 × 합성 오차)',
    ],
    inputs: [
      { key: 'e1', label: '정렬 오차', en: 'Alignment', unit: 'µm', default: 1.5, min: 0, step: 0.1,
        hint: '정렬 정밀도 예산의 총 정렬 오차' },
      { key: 'e2', label: '측정 오차', en: 'Measurement', unit: 'µm', default: 0.94, min: 0, step: 0.1,
        hint: 'Gage R&R 의 측정계 산포' },
      { key: 'e3', label: '스테이지 오차', en: 'Stage', unit: 'µm', default: 1, min: 0, step: 0.1,
        hint: '위치결정 반복 정밀도' },
      { key: 'e4', label: '열 변형', en: 'Thermal', unit: 'µm', default: 2, min: 0, step: 0.1,
        hint: '온도 변화로 대상이나 구조물이 늘어나는 몫' },
      { key: 'e5', label: '기타', en: 'Other', unit: 'µm', default: 0.5, min: 0, step: 0.1 },
      { key: 'tolUm', label: '공차 폭', en: 'Tolerance', unit: 'µm', default: 20, min: 1e-9, step: 1 },
    ],
    outputs: [
      { key: 'totalUm', label: '합성 오차', en: 'Combined Error', unit: 'µm', digits: 3, primary: true },
      { key: 'spread6', label: '총 산포', en: 'Total Spread', unit: 'µm 6σ', digits: 3, primary: true },
      { key: 'cp', label: '공차 대비 Cp', en: 'Cp', unit: '', digits: 3, primary: true },
      { key: 'usagePct', label: '공차 사용률', en: 'Tolerance Usage', unit: '%', digits: 1 },
      { key: 'topPct', label: '최대 기여율', en: 'Top Contribution', unit: '%', digits: 1 },
      { key: 'sumLinear', label: '단순 합', en: 'Linear Sum', unit: 'µm', digits: 3 },
    ],
    compute(v) {
      const parts = [v.e1, v.e2, v.e3, v.e4, v.e5];
      const varSum = parts.reduce((a, x) => a + x * x, 0);
      const totalUm = Math.sqrt(varSum);
      return {
        totalUm,
        spread6: 6 * totalUm,
        cp: v.tolUm / (6 * totalUm),
        usagePct: ((6 * totalUm) / v.tolUm) * 100,
        topPct: varSum > 0 ? (Math.max(...parts) ** 2 / varSum) * 100 : 0,
        // 최악값을 단순히 더한 값. 제곱합보다 훨씬 크게 나오는 것을 보이려고 함께 낸다.
        sumLinear: parts.reduce((a, x) => a + x, 0),
      };
    },
    diagram(v, o) {
      const parts = [
        { name: '정렬', x: v.e1 },
        { name: '측정', x: v.e2 },
        { name: '스테이지', x: v.e3 },
        { name: '열 변형', x: v.e4 },
        { name: '기타', x: v.e5 },
      ];
      const varSum = parts.reduce((a, p) => a + p.x * p.x, 0);
      return [
        contributionBars({
          items: parts.map((p) => ({ name: p.name, pct: varSum > 0 ? ((p.x * p.x) / varSum) * 100 : 0 })),
          totalUm: o.totalUm,
        }),
      ];
    },
    warn(v, o) {
      const parts = [
        ['정렬 오차', v.e1], ['측정 오차', v.e2], ['스테이지 오차', v.e3], ['열 변형', v.e4], ['기타', v.e5],
      ];
      const top = parts.reduce((a, b) => (b[1] > a[1] ? b : a));
      const warns = [];
      if (o.cp < 1.33) {
        warns.push({
          level: o.cp < 1 ? 'danger' : 'warn',
          text: `공차 대비 Cp ${o.cp.toFixed(2)} 입니다. 총 산포 ${o.spread6.toFixed(2)} µm 가 공차 ${v.tolUm} µm 를 거의 다 씁니다.`,
        });
      } else {
        warns.push({
          level: 'info',
          text: `총 산포 ${o.spread6.toFixed(2)} µm 로 공차 ${v.tolUm} µm 안에 Cp ${o.cp.toFixed(2)} 로 들어옵니다.`,
        });
      }
      warns.push({
        level: 'info',
        text: `${top[0]} 가 ${o.topPct.toFixed(0)} % 를 차지합니다. 제곱합이라 가장 큰 항목 하나를 줄이는 것이 나머지를 다 줄이는 것보다 효과적입니다.`,
      });
      warns.push({
        level: 'info',
        text: `단순히 더하면 ${o.sumLinear.toFixed(2)} µm 지만, 서로 무관한 오차는 제곱합으로 ${o.totalUm.toFixed(2)} µm 가 됩니다. 같은 방향으로 몰리는 계통 오차라면 제곱합을 쓰면 안 됩니다.`,
      });
      return warns;
    },
  },
];
