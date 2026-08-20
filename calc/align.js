// 정렬 대분류.
// 마크를 보고 얼마나 어긋났는지 구하고, 그것을 스테이지 이동량으로 옮기는 데까지를 다룬다.
//
// 정렬 편차는 각도가 µrad, 위치가 µm 단위라 근사가 잘 통한다.
// 다만 회전만은 근사를 쓰지 않는다. 회전 중심이 멀면 작은 각도도 큰 변위를 만들기 때문이다.

import { degToRad, radToDeg } from '../core/units.js';
import { markAlignView, alignBudgetView, rotationCenterView } from '../core/diagram.js';

// −π ~ π 로 접는다. 두 각의 차가 한 바퀴를 넘어 엉뚱한 값이 되는 것을 막는다.
const wrap = (rad) => Math.atan2(Math.sin(rad), Math.cos(rad));

export const alignCalculators = [
  {
    id: 'mark-align',
    category: 'align',
    name: '2점 마크 정렬',
    en: 'Two-Point Mark Align',
    summary: '마크 두 개의 목표 좌표와 실측 좌표로 보정할 ΔX · ΔY · Δθ 와 스케일을 구합니다',
    tags: ['정렬', 'align', '얼라인', '마크', 'fiducial', '피듀셜', '회전', '보정량', 'ΔX', 'Δθ', '스케일'],
    related: ['align-budget', 'stage-kinematics', 'rotation-center'],
    formula: [
      '목표 벡터 = 마크2 목표 − 마크1 목표',
      '실측 벡터 = 마크2 실측 − 마크1 실측',
      'Δθ = ∠목표 벡터 − ∠실측 벡터',
      '스케일 = |실측 벡터| / |목표 벡터|',
      'ΔX, ΔY = 목표 중점 − 실측 중점',
    ],
    inputs: [
      { key: 'x1t', label: '마크1 목표 X', en: 'Mark 1 Target X', unit: 'mm', default: 0, step: 1 },
      { key: 'y1t', label: '마크1 목표 Y', en: 'Mark 1 Target Y', unit: 'mm', default: 0, step: 1 },
      { key: 'x2t', label: '마크2 목표 X', en: 'Mark 2 Target X', unit: 'mm', default: 100, step: 1 },
      { key: 'y2t', label: '마크2 목표 Y', en: 'Mark 2 Target Y', unit: 'mm', default: 0, step: 1 },
      { key: 'x1m', label: '마크1 실측 X', en: 'Mark 1 Measured X', unit: 'mm', default: 0.05, step: 0.01,
        hint: '비전이 찾아낸 실제 마크 위치' },
      { key: 'y1m', label: '마크1 실측 Y', en: 'Mark 1 Measured Y', unit: 'mm', default: 0.02, step: 0.01 },
      { key: 'x2m', label: '마크2 실측 X', en: 'Mark 2 Measured X', unit: 'mm', default: 100.05, step: 0.01 },
      { key: 'y2m', label: '마크2 실측 Y', en: 'Mark 2 Measured Y', unit: 'mm', default: 0.06, step: 0.01 },
    ],
    outputs: [
      { key: 'dX', label: '보정 X 이동량', en: 'Correction X', unit: 'mm', digits: 4, primary: true },
      { key: 'dY', label: '보정 Y 이동량', en: 'Correction Y', unit: 'mm', digits: 4, primary: true },
      { key: 'dThetaDeg', label: '보정 회전각', en: 'Correction Angle', unit: '°', digits: 5, primary: true },
      { key: 'dThetaUrad', label: '보정 회전각', en: 'Correction Angle', unit: 'µrad', digits: 1 },
      { key: 'scalePpm', label: '스케일 오차', en: 'Scale Error', unit: 'ppm', digits: 1 },
      { key: 'targetDist', label: '목표 마크 간 거리', en: 'Target Distance', unit: 'mm', digits: 4 },
      { key: 'measDist', label: '실측 마크 간 거리', en: 'Measured Distance', unit: 'mm', digits: 4 },
      { key: 'residualUm', label: '강체 정합 잔차', en: 'Rigid Residual', unit: 'µm', digits: 3 },
    ],
    compute(v) {
      const vtx = v.x2t - v.x1t;
      const vty = v.y2t - v.y1t;
      const vmx = v.x2m - v.x1m;
      const vmy = v.y2m - v.y1m;
      const targetDist = Math.hypot(vtx, vty);
      const measDist = Math.hypot(vmx, vmy);
      const dTheta = wrap(Math.atan2(vty, vtx) - Math.atan2(vmy, vmx));
      const scale = targetDist > 0 ? measDist / targetDist : 1;
      return {
        dX: (v.x1t + v.x2t) / 2 - (v.x1m + v.x2m) / 2,
        dY: (v.y1t + v.y2t) / 2 - (v.y1m + v.y2m) / 2,
        dThetaDeg: radToDeg(dTheta),
        dThetaUrad: dTheta * 1e6,
        scalePpm: (scale - 1) * 1e6,
        targetDist,
        measDist,
        // 스케일을 못 쓰는 강체 정합에서는 길이 차가 두 마크에 절반씩 남는다.
        residualUm: (Math.abs(targetDist - measDist) / 2) * 1000,
      };
    },
    diagram(v, o) {
      return [
        markAlignView({
          target: [[v.x1t, v.y1t], [v.x2t, v.y2t]],
          measured: [[v.x1m, v.y1m], [v.x2m, v.y2m]],
          dX: o.dX,
          dY: o.dY,
          dThetaDeg: o.dThetaDeg,
          markDist: o.targetDist,
        }),
      ];
    },
    warn(v, o) {
      const warns = [];
      if (o.targetDist === 0) {
        return [{ level: 'danger', text: '두 마크의 목표 좌표가 같습니다. 회전을 구할 수 없습니다.' }];
      }
      if (o.targetDist < 20) {
        warns.push({
          level: 'warn',
          text: `마크 간 거리가 ${o.targetDist.toFixed(1)} mm 로 짧습니다. 같은 마크 검출 오차라도 각도 오차는 거리에 반비례해 커집니다.`,
        });
      }
      if (Math.abs(o.scalePpm) > 200) {
        warns.push({
          level: 'warn',
          text: `스케일 오차가 ${o.scalePpm.toFixed(0)} ppm 입니다. 회전·병진으로는 지워지지 않는 성분이라, 캘리브레이션이 틀렸거나 대상이 열로 늘어난 것을 의심해야 합니다.`,
        });
      }
      if (o.residualUm > 1) {
        warns.push({
          level: 'warn',
          text: `스케일을 보정하지 않고 회전·병진만 쓰면 마크마다 ${o.residualUm.toFixed(2)} µm 가 남습니다.`,
        });
      }
      warns.push({
        level: 'info',
        text: '회전은 두 마크의 중점을 기준으로 잡은 값입니다. 스테이지 회전 중심이 이 점과 다르면 회전 중심 보정을 함께 넣어야 합니다.',
      });
      return warns;
    },
  },

  {
    id: 'align-budget',
    category: 'align',
    name: '정렬 정밀도 예산',
    en: 'Alignment Precision Budget',
    summary: '마크 검출 오차와 마크 간 거리로 정렬의 위치 오차와 각도 오차를 나눠 구합니다',
    tags: ['정렬', 'align', '정밀도', '예산', 'budget', '각도 오차', '마크 간 거리', '반복 정밀도', '에지'],
    related: ['mark-align', 'pixel-calibration', 'tolerance-budget'],
    formula: [
      '마크 검출 오차 = 대상 분해능 × 에지 검출 오차 / √평균 횟수',
      '병진 오차 = 마크 검출 오차 / √2',
      '각도 오차 = √2 × 마크 검출 오차 / 마크 간 거리',
      '끝단 오차 = 반경 × 각도 오차',
      '총 정렬 오차 = √(병진 오차² + 끝단 오차²)',
    ],
    inputs: [
      { key: 'umPerPx', label: '대상 분해능', en: 'Spatial Resolution', unit: 'µm/px', default: 20, min: 0.01, step: 1 },
      { key: 'edgeErrPx', label: '마크 검출 오차', en: 'Detection Error', unit: 'px', default: 0.3, min: 0.001, step: 0.1,
        hint: '서브픽셀까지 쓰면 0.1~0.3 px' },
      { key: 'markDistMm', label: '마크 간 거리', en: 'Mark Distance', unit: 'mm', default: 100, min: 0.1, step: 10 },
      { key: 'radiusMm', label: '보정 반경', en: 'Radius', unit: 'mm', default: 150, min: 0, step: 10,
        hint: '회전 중심에서 가장 먼 검사 지점까지' },
      { key: 'samples', label: '평균 횟수', en: 'Averaging', unit: '회', default: 1, min: 1, step: 1,
        hint: '여러 번 찍어 평균 내면 √n 만큼 좋아집니다' },
    ],
    outputs: [
      { key: 'posErrUm', label: '병진 오차', en: 'Translation Error', unit: 'µm', digits: 3, primary: true },
      { key: 'angErrUrad', label: '각도 오차', en: 'Angular Error', unit: 'µrad', digits: 2, primary: true },
      { key: 'edgeErrUm', label: '끝단 오차', en: 'Edge Error', unit: 'µm', digits: 3, primary: true },
      { key: 'totalUm', label: '총 정렬 오차', en: 'Total Error', unit: 'µm', digits: 3 },
      { key: 'total3Um', label: '총 정렬 오차', en: 'Total Error', unit: 'µm 3σ', digits: 3 },
      { key: 'markErrUm', label: '마크 검출 오차', en: 'Detection Error', unit: 'µm', digits: 3 },
      { key: 'angErrDeg', label: '각도 오차', en: 'Angular Error', unit: '°', digits: 6 },
    ],
    compute(v) {
      const markErrUm = (v.umPerPx * v.edgeErrPx) / Math.sqrt(v.samples);
      // 두 마크가 각각 독립으로 흔들린다. 중점은 평균이라 √2 로 좋아지고,
      // 각도는 두 오차의 차로 정해져 √2 로 나빠진다.
      const posErrUm = markErrUm / Math.SQRT2;
      const angErrRad = (Math.SQRT2 * markErrUm) / 1000 / v.markDistMm;
      const edgeErrUm = v.radiusMm * 1000 * angErrRad;
      return {
        markErrUm,
        posErrUm,
        angErrUrad: angErrRad * 1e6,
        angErrDeg: radToDeg(angErrRad),
        edgeErrUm,
        totalUm: Math.hypot(posErrUm, edgeErrUm),
        total3Um: 3 * Math.hypot(posErrUm, edgeErrUm),
      };
    },
    diagram(v, o) {
      return [
        alignBudgetView({
          markDistMm: v.markDistMm,
          posErrUm: o.markErrUm,
          angErrUrad: o.angErrUrad,
          radiusMm: v.radiusMm,
          edgeErrUm: o.edgeErrUm,
        }),
      ];
    },
    warn(v, o) {
      const warns = [];
      if (o.edgeErrUm > o.posErrUm * 1.5) {
        warns.push({
          level: 'warn',
          text: `끝단 오차 ${o.edgeErrUm.toFixed(2)} µm 가 병진 오차 ${o.posErrUm.toFixed(2)} µm 를 압도합니다. 마크 간 거리를 2 배로 늘리면 각도 오차가 절반이 됩니다. 분해능을 올리는 것보다 대개 쉽고 효과가 큽니다.`,
        });
      } else {
        warns.push({
          level: 'info',
          text: `병진과 각도의 기여가 비슷합니다. 총 오차 ${o.totalUm.toFixed(2)} µm (3σ ${o.total3Um.toFixed(2)} µm).`,
        });
      }
      if (v.samples > 1) {
        warns.push({
          level: 'info',
          text: `${v.samples} 회 평균으로 ${Math.sqrt(v.samples).toFixed(2)} 배 좋아진 값입니다. 다만 계통 오차는 평균으로 줄지 않습니다.`,
        });
      }
      return warns;
    },
  },

  {
    id: 'rotation-center',
    category: 'align',
    name: '회전 중심 보정',
    en: 'Rotation Center Offset',
    summary: '회전 중심과 기준점이 떨어져 있을 때, θ 보정이 만드는 XY 밀림을 구합니다',
    tags: ['회전 중심', 'rotation center', '정렬', 'align', '보정', '편심', 'θ', '밀림'],
    related: ['mark-align', 'stage-kinematics', 'align-convergence'],
    formula: [
      '반경 X = 기준점 X − 회전 중심 X',
      '반경 Y = 기준점 Y − 회전 중심 Y',
      'ΔX 밀림 = (cos θ − 1) × 반경 X − sin θ × 반경 Y',
      'ΔY 밀림 = sin θ × 반경 X + (cos θ − 1) × 반경 Y',
      '밀림 크기 = 2 × 회전 반경 × |sin(θ / 2)|',
    ],
    inputs: [
      { key: 'thetaDeg', label: '보정 회전각', en: 'Correction Angle', unit: '°', default: 0.02, step: 0.001,
        hint: '2점 마크 정렬이 내놓은 Δθ' },
      { key: 'ox', label: '회전 중심 X', en: 'Center X', unit: 'mm', default: 0, step: 1 },
      { key: 'oy', label: '회전 중심 Y', en: 'Center Y', unit: 'mm', default: 0, step: 1 },
      { key: 'px', label: '기준점 X', en: 'Reference X', unit: 'mm', default: 150, step: 1,
        hint: '정렬을 맞추려는 지점. 보통 대상 중심이나 검사 위치' },
      { key: 'py', label: '기준점 Y', en: 'Reference Y', unit: 'mm', default: 80, step: 1 },
    ],
    outputs: [
      { key: 'corrXUm', label: '상쇄 X 이동량', en: 'Compensation X', unit: 'µm', digits: 3, primary: true },
      { key: 'corrYUm', label: '상쇄 Y 이동량', en: 'Compensation Y', unit: 'µm', digits: 3, primary: true },
      { key: 'shiftUm', label: '밀림 크기', en: 'Shift', unit: 'µm', digits: 3, primary: true },
      { key: 'dxUm', label: 'X 밀림', en: 'Shift X', unit: 'µm', digits: 3 },
      { key: 'dyUm', label: 'Y 밀림', en: 'Shift Y', unit: 'µm', digits: 3 },
      { key: 'radiusMm', label: '회전 반경', en: 'Radius', unit: 'mm', digits: 3 },
    ],
    compute(v) {
      const th = degToRad(v.thetaDeg);
      const rx = v.px - v.ox;
      const ry = v.py - v.oy;
      // 근사를 쓰지 않는다. 회전 반경이 크면 작은 각도에서도 차이가 난다.
      const dx = (Math.cos(th) - 1) * rx - Math.sin(th) * ry;
      const dy = Math.sin(th) * rx + (Math.cos(th) - 1) * ry;
      const radiusMm = Math.hypot(rx, ry);
      return {
        dxUm: dx * 1000,
        dyUm: dy * 1000,
        corrXUm: -dx * 1000,
        corrYUm: -dy * 1000,
        shiftUm: 2 * radiusMm * Math.abs(Math.sin(th / 2)) * 1000,
        radiusMm,
      };
    },
    diagram(v, o) {
      return [rotationCenterView({ radiusMm: o.radiusMm, thetaDeg: v.thetaDeg, shiftUm: o.shiftUm })];
    },
    warn(v, o) {
      if (o.radiusMm === 0) {
        return [{ level: 'info', text: '기준점이 회전 중심과 같습니다. 회전해도 밀리지 않습니다.' }];
      }
      const warns = [{
        level: 'info',
        text: `반경 ${o.radiusMm.toFixed(1)} mm 에서 ${v.thetaDeg}° 를 돌리면 기준점이 ${o.shiftUm.toFixed(2)} µm 밀립니다. XY 로 ${o.corrXUm.toFixed(2)} / ${o.corrYUm.toFixed(2)} µm 를 함께 넣어야 제자리입니다.`,
      }];
      if (o.shiftUm > 5) {
        warns.push({
          level: 'warn',
          text: '밀림이 정렬 공차와 맞먹는 수준입니다. 이 보정을 빼먹으면 회전을 맞출수록 위치가 틀어져 정렬 루프가 수렴하지 않습니다.',
        });
      }
      return warns;
    },
  },

  {
    id: 'stage-kinematics',
    category: 'align',
    name: '스테이지 역기구학',
    en: 'Stage Kinematics',
    summary: '구한 ΔX · ΔY · Δθ 를 스테이지 각 축의 이동량으로 바꿉니다',
    tags: ['스테이지', 'stage', 'UVW', 'XYT', '역기구학', 'kinematics', '축 이동량', '정렬', '액추에이터'],
    related: ['mark-align', 'rotation-center', 'align-convergence'],
    modes: [
      {
        id: 'uvw',
        name: 'UVW 스테이지',
        en: 'UVW Stage',
        formula: [
          'θ = 보정 회전각 (rad)',
          'U = ΔX − U축 Y좌표 × θ',
          'V = ΔX − V축 Y좌표 × θ',
          'W = ΔY + W축 X좌표 × θ',
          '검산 θ = (U − V) / (V축 Y좌표 − U축 Y좌표)',
        ],
        inputs: [
          { key: 'dX', label: '보정 X 이동량', en: 'Correction X', unit: 'mm', default: -0.05, step: 0.001 },
          { key: 'dY', label: '보정 Y 이동량', en: 'Correction Y', unit: 'mm', default: -0.04, step: 0.001 },
          { key: 'dThetaDeg', label: '보정 회전각', en: 'Correction Angle', unit: '°', default: -0.0229, step: 0.001 },
          { key: 'yU', label: 'U축 Y좌표', en: 'U Axis Y', unit: 'mm', default: -90, step: 5,
            hint: '회전 중심에서 본 U축 위치. U·V 는 X 방향 구동' },
          { key: 'yV', label: 'V축 Y좌표', en: 'V Axis Y', unit: 'mm', default: 90, step: 5 },
          { key: 'xW', label: 'W축 X좌표', en: 'W Axis X', unit: 'mm', default: -120, step: 5,
            hint: 'W 는 Y 방향 구동' },
        ],
        outputs: [
          { key: 'u', label: 'U축 이동량', en: 'U Stroke', unit: 'mm', digits: 5, primary: true },
          { key: 'v', label: 'V축 이동량', en: 'V Stroke', unit: 'mm', digits: 5, primary: true },
          { key: 'w', label: 'W축 이동량', en: 'W Stroke', unit: 'mm', digits: 5, primary: true },
          { key: 'uMinusV', label: 'U − V', en: 'U minus V', unit: 'mm', digits: 5 },
          { key: 'checkDeg', label: '검산 회전각', en: 'Check Angle', unit: '°', digits: 5 },
          { key: 'maxStrokeUm', label: '최대 축 이동량', en: 'Max Stroke', unit: 'µm', digits: 1 },
        ],
        compute(v) {
          const th = degToRad(v.dThetaDeg);
          // 강체가 θ 만큼 돌면 (x, y) 점은 (−y·θ, x·θ) 만큼 움직인다.
          // 각 액추에이터는 자기 위치에서 자기 방향 성분만 담당한다.
          const u = v.dX - v.yU * th;
          const vv = v.dX - v.yV * th;
          const w = v.dY + v.xW * th;
          const span = v.yV - v.yU;
          return {
            u,
            v: vv,
            w,
            uMinusV: u - vv,
            checkDeg: span !== 0 ? radToDeg((u - vv) / span) : NaN,
            maxStrokeUm: Math.max(Math.abs(u), Math.abs(vv), Math.abs(w)) * 1000,
          };
        },
        warn(v, o) {
          if (v.yU === v.yV) {
            return [{
              level: 'danger',
              text: 'U축과 V축의 Y 좌표가 같습니다. 두 축이 겹쳐 있으면 회전을 만들 수 없습니다.',
            }];
          }
          const warns = [{
            level: 'info',
            text: `U·V 가 X 방향, W 가 Y 방향으로 구동하는 배치를 가정한 값입니다. 축이 비스듬히 놓인 UVW 라면 각 축 방향의 코사인 성분을 따로 곱해야 합니다.`,
          }];
          if (o.maxStrokeUm > 5000) {
            warns.push({
              level: 'warn',
              text: `최대 축 이동량이 ${(o.maxStrokeUm / 1000).toFixed(2)} mm 입니다. 정밀 정렬 스테이지의 스트로크는 보통 ±5 mm 이내이므로 스트로크를 확인하세요.`,
            });
          }
          return warns;
        },
      },
      {
        id: 'theta-xy',
        name: 'θ-XY 적층',
        en: 'Theta over XY',
        formula: [
          'θ축 = 보정 회전각 그대로',
          '회전 밀림 X = (cos θ − 1) × 반경 X − sin θ × 반경 Y',
          '회전 밀림 Y = sin θ × 반경 X + (cos θ − 1) × 반경 Y',
          'X축 = 보정 X 이동량 − 회전 밀림 X',
          'Y축 = 보정 Y 이동량 − 회전 밀림 Y',
        ],
        inputs: [
          { key: 'dX', label: '보정 X 이동량', en: 'Correction X', unit: 'mm', default: -0.05, step: 0.001 },
          { key: 'dY', label: '보정 Y 이동량', en: 'Correction Y', unit: 'mm', default: -0.04, step: 0.001 },
          { key: 'dThetaDeg', label: '보정 회전각', en: 'Correction Angle', unit: '°', default: -0.0229, step: 0.001 },
          { key: 'rx', label: '반경 X', en: 'Radius X', unit: 'mm', default: 150, step: 1,
            hint: '회전 중심에서 기준점까지의 X 거리' },
          { key: 'ry', label: '반경 Y', en: 'Radius Y', unit: 'mm', default: 80, step: 1 },
        ],
        outputs: [
          { key: 'stageX', label: 'X축 이동량', en: 'X Stroke', unit: 'mm', digits: 5, primary: true },
          { key: 'stageY', label: 'Y축 이동량', en: 'Y Stroke', unit: 'mm', digits: 5, primary: true },
          { key: 'stageTheta', label: 'θ축 회전량', en: 'Theta Stroke', unit: '°', digits: 5, primary: true },
          { key: 'rotShiftXUm', label: '회전 밀림 X', en: 'Rotation Shift X', unit: 'µm', digits: 2 },
          { key: 'rotShiftYUm', label: '회전 밀림 Y', en: 'Rotation Shift Y', unit: 'µm', digits: 2 },
          { key: 'rotShiftUm', label: '회전 밀림 크기', en: 'Rotation Shift', unit: 'µm', digits: 2 },
        ],
        compute(v) {
          const th = degToRad(v.dThetaDeg);
          const dx = (Math.cos(th) - 1) * v.rx - Math.sin(th) * v.ry;
          const dy = Math.sin(th) * v.rx + (Math.cos(th) - 1) * v.ry;
          return {
            stageX: v.dX - dx,
            stageY: v.dY - dy,
            stageTheta: v.dThetaDeg,
            rotShiftXUm: dx * 1000,
            rotShiftYUm: dy * 1000,
            rotShiftUm: Math.hypot(dx, dy) * 1000,
          };
        },
        warn(v, o) {
          const warns = [];
          const moveUm = Math.hypot(v.dX, v.dY) * 1000;
          if (o.rotShiftUm > moveUm) {
            warns.push({
              level: 'warn',
              text: `회전이 만드는 밀림 ${o.rotShiftUm.toFixed(1)} µm 가 병진 보정량 ${moveUm.toFixed(1)} µm 보다 큽니다. θ 를 먼저 돌리고 XY 를 나중에 잡으면 두 번 일하게 되므로, 두 값을 한 번에 계산해 동시에 내리는 편이 낫습니다.`,
            });
          } else {
            warns.push({
              level: 'info',
              text: `θ 를 ${v.dThetaDeg}° 돌리면 기준점이 ${o.rotShiftUm.toFixed(2)} µm 밀리므로, XY 축에 그만큼을 미리 빼서 내렸습니다.`,
            });
          }
          return warns;
        },
      },
    ],
  },

  {
    id: 'align-convergence',
    category: 'align',
    name: '정렬 반복 수렴',
    en: 'Alignment Convergence',
    summary: '루프 게인과 반복 정밀도로 몇 번 만에 공차 안에 들어오는지 구합니다',
    tags: ['정렬', 'align', '수렴', '반복', 'iteration', '게인', 'gain', '루프', '잔차', '진동'],
    related: ['align-budget', 'rotation-center', 'stage-kinematics'],
    formula: [
      '수렴비 = |1 − 루프 게인|',
      'n 회 후 잔차 = √( (초기 오차 × 수렴비ⁿ)² + 반복 정밀도² )',
      '필요 횟수 = ln(목표 공차 / 초기 오차) / ln(수렴비)',
    ],
    inputs: [
      { key: 'e0', label: '초기 오차', en: 'Initial Error', unit: 'µm', default: 50, min: 0, step: 5 },
      { key: 'gain', label: '루프 게인', en: 'Loop Gain', unit: '×', default: 0.8, min: 0.01, max: 2.5, step: 0.05,
        hint: '보정량을 몇 배로 내리는지. 1 이면 계산값 그대로' },
      { key: 'floor', label: '반복 정밀도', en: 'Repeatability', unit: 'µm', default: 0.5, min: 0, step: 0.1,
        hint: '정렬 정밀도 예산의 총 오차. 이 아래로는 안 내려갑니다' },
      { key: 'tol', label: '목표 공차', en: 'Target Tolerance', unit: 'µm', default: 3, min: 0.01, step: 0.5 },
      { key: 'maxIter', label: '최대 반복', en: 'Max Iterations', unit: '회', default: 5, min: 1, step: 1 },
    ],
    outputs: [
      { key: 'needIter', label: '필요 반복 횟수', en: 'Required Iterations', unit: '회', digits: 0, primary: true },
      { key: 'eAtMax', label: '최대 반복 후 잔차', en: 'Residual at Max', unit: 'µm', digits: 3, primary: true },
      { key: 'ratio', label: '수렴비', en: 'Convergence Ratio', unit: '×', digits: 3, primary: true },
      { key: 'e1', label: '1회 후 잔차', en: 'After 1', unit: 'µm', digits: 3 },
      { key: 'e2', label: '2회 후 잔차', en: 'After 2', unit: 'µm', digits: 3 },
      { key: 'e3', label: '3회 후 잔차', en: 'After 3', unit: 'µm', digits: 3 },
    ],
    compute(v) {
      const ratio = Math.abs(1 - v.gain);
      // 계통 오차는 게인만큼 줄지만 반복 정밀도는 남는다. 둘은 독립이라 제곱합으로 더한다.
      const at = (n) => Math.hypot(v.e0 * ratio ** n, v.floor);
      let needIter = Infinity;
      if (v.e0 <= v.tol) needIter = 0;
      else if (ratio < 1 && ratio > 0) {
        for (let n = 1; n <= 200; n++) {
          if (at(n) <= v.tol) { needIter = n; break; }
        }
      } else if (ratio === 0) {
        needIter = at(1) <= v.tol ? 1 : Infinity;
      }
      return {
        ratio,
        needIter,
        e1: at(1),
        e2: at(2),
        e3: at(3),
        eAtMax: at(v.maxIter),
      };
    },
    warn(v, o) {
      const warns = [];
      if (v.gain >= 2) {
        return [{
          level: 'danger',
          text: `게인 ${v.gain} 은 수렴비가 ${o.ratio.toFixed(2)} 로 1 이상입니다. 돌릴수록 오차가 커져 발산합니다.`,
        }];
      }
      if (v.gain > 1) {
        warns.push({
          level: 'warn',
          text: `게인이 1 을 넘어 매번 목표를 지나칩니다. 부호가 번갈아 바뀌며 줄어드는 진동 수렴입니다.`,
        });
      }
      if (v.floor >= v.tol) {
        warns.push({
          level: 'danger',
          text: `반복 정밀도 ${v.floor} µm 가 목표 공차 ${v.tol} µm 이상입니다. 몇 번을 돌려도 들어가지 않습니다. 마크 검출이나 스테이지 분해능을 먼저 손봐야 합니다.`,
        });
      } else if (!Number.isFinite(o.needIter)) {
        warns.push({ level: 'danger', text: '이 조건에서는 공차 안으로 들어오지 않습니다.' });
      } else if (o.needIter > v.maxIter) {
        warns.push({
          level: 'warn',
          text: `공차에 들려면 ${o.needIter} 회가 필요한데 최대 반복이 ${v.maxIter} 회입니다. 게인을 올리거나 반복 한도를 늘리세요.`,
        });
      } else {
        warns.push({
          level: 'info',
          text: `${o.needIter} 회 만에 공차 안에 들어옵니다. ${v.maxIter} 회까지 돌리면 ${o.eAtMax.toFixed(2)} µm 로 반복 정밀도 바닥에 붙습니다.`,
        });
      }
      return warns;
    },
  },

  {
    id: 'hand-eye',
    category: 'align',
    name: '핸드아이 각도 보정',
    en: 'Hand-Eye Calibration',
    summary: '스테이지를 알려진 양만큼 움직여 카메라와 스테이지 사이의 회전각과 분해능을 구합니다',
    tags: ['핸드아이', 'hand-eye', '캘리브레이션', '카메라 회전', '축 정렬', '정렬', 'align', '좌표 변환'],
    related: ['pixel-calibration', 'mark-align', 'align-budget'],
    formula: [
      '스테이지 이동 거리 = √(스테이지 ΔX² + 스테이지 ΔY²)',
      '픽셀 이동 거리 = √(픽셀 Δu² + 픽셀 Δv²)',
      '대상 분해능 = 스테이지 이동 거리 × 1000 / 픽셀 이동 거리',
      '카메라 회전각 = atan2(Δv, Δu) − atan2(스테이지 ΔY, 스테이지 ΔX)',
    ],
    inputs: [
      { key: 'sx', label: '스테이지 ΔX', en: 'Stage dX', unit: 'mm', default: 10, step: 1,
        hint: '명령으로 내린 이동량' },
      { key: 'sy', label: '스테이지 ΔY', en: 'Stage dY', unit: 'mm', default: 0, step: 1 },
      { key: 'du', label: '픽셀 Δu', en: 'Pixel du', unit: 'px', default: 498.2, step: 1,
        hint: '같은 특징이 이미지에서 움직인 양' },
      { key: 'dv', label: '픽셀 Δv', en: 'Pixel dv', unit: 'px', default: 8.7, step: 1,
        hint: '이미지 좌표는 아래가 + 인 경우가 많습니다. 부호를 맞춰 넣으세요' },
    ],
    outputs: [
      { key: 'camRotDeg', label: '카메라 회전각', en: 'Camera Rotation', unit: '°', digits: 4, primary: true },
      { key: 'umPerPx', label: '대상 분해능', en: 'Spatial Resolution', unit: 'µm/px', digits: 4, primary: true },
      { key: 'camRotUrad', label: '카메라 회전각', en: 'Camera Rotation', unit: 'µrad', digits: 0 },
      { key: 'pixLen', label: '픽셀 이동 거리', en: 'Pixel Distance', unit: 'px', digits: 2 },
      { key: 'stageLen', label: '스테이지 이동 거리', en: 'Stage Distance', unit: 'mm', digits: 4 },
      { key: 'crossUm', label: '직교축 누설', en: 'Cross Coupling', unit: 'µm/mm', digits: 2 },
    ],
    compute(v) {
      const stageLen = Math.hypot(v.sx, v.sy);
      const pixLen = Math.hypot(v.du, v.dv);
      const rot = wrap(Math.atan2(v.dv, v.du) - Math.atan2(v.sy, v.sx));
      return {
        stageLen,
        pixLen,
        umPerPx: pixLen > 0 ? (stageLen * 1000) / pixLen : NaN,
        camRotDeg: radToDeg(rot),
        camRotUrad: rot * 1e6,
        // 한 축만 움직였을 때 반대 축으로 새어 나가는 양. 회전각의 탄젠트다.
        crossUm: Math.abs(Math.tan(rot)) * 1000,
      };
    },
    warn(v, o) {
      const warns = [];
      if (o.pixLen === 0 || o.stageLen === 0) {
        return [{ level: 'danger', text: '이동량이 0 입니다. 스테이지를 움직인 값과 그때 픽셀이 움직인 값을 넣으세요.' }];
      }
      const absDeg = Math.abs(o.camRotDeg);
      if (absDeg > 1) {
        warns.push({
          level: 'danger',
          text: `카메라가 ${o.camRotDeg.toFixed(3)}° 틀어져 있습니다. X 로 1 mm 움직이면 Y 로 ${o.crossUm.toFixed(1)} µm 가 새어 나갑니다. 기구로 바로잡는 편이 낫습니다.`,
        });
      } else if (absDeg > 0.05) {
        warns.push({
          level: 'warn',
          text: `${o.camRotDeg.toFixed(4)}° 틀어져 있습니다. 소프트웨어 좌표 변환에 이 회전을 넣지 않으면 정렬에 직교축 오차로 남습니다.`,
        });
      } else {
        warns.push({
          level: 'info',
          text: `회전이 ${o.camRotDeg.toFixed(4)}° 로 충분히 작습니다. 축이 잘 맞춰져 있습니다.`,
        });
      }
      warns.push({
        level: 'info',
        text: '이동량을 크게 줄수록 이 값이 정확해집니다. 시야를 거의 가로지를 만큼 움직여 재는 것이 좋습니다.',
      });
      return warns;
    },
  },
];
