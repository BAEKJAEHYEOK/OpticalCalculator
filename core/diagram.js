// 계산 결과 도해.
// 용어가 그림의 어느 구간을 가리키는지 보여주고, 그 구간에 계산된 값을 함께 적는다.
// 값 없이 도형만 그리면 의미가 없으므로 라벨은 항상 "용어 + 수치 + 단위" 형태로 쓴다.

import { format, degToRad } from './units.js';

const NS = 'http://www.w3.org/2000/svg';

// 화살촉은 모든 도해가 같은 정의를 쓰므로 id 를 고정한다.
// 문서 안에 중복 정의가 생기지만 내용이 동일해 렌더링에 차이가 없다.
const ARROW = 'oc-arrow';

function s(tag, attrs = {}, ...kids) {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v !== null && v !== undefined) node.setAttribute(k, v);
  }
  for (const k of kids.flat()) {
    if (k === null || k === undefined || k === false) continue;
    node.append(k instanceof Node ? k : document.createTextNode(String(k)));
  }
  return node;
}

const defs = () =>
  s(
    'defs',
    {},
    s(
      'marker',
      {
        id: ARROW,
        viewBox: '0 0 8 8',
        refX: 7,
        refY: 4,
        markerWidth: 6,
        markerHeight: 6,
        orient: 'auto-start-reverse',
      },
      // context-stroke 는 구형 안드로이드 WebView 에서 동작하지 않는다.
      // currentColor 로 두고 CSS 의 color 로 색을 넘긴다.
      s('path', { d: 'M0,0 L8,4 L0,8 z', fill: 'currentColor' })
    )
  );

function frame(caption, viewBox, ...kids) {
  return s(
    'svg',
    { viewBox, class: 'diagram', role: 'img', preserveAspectRatio: 'xMidYMid meet' },
    s('title', {}, caption),
    defs(),
    ...kids
  );
}

const label = (x, y, text, cls = 'd-label', anchor = 'middle') =>
  s('text', { x, y, class: cls, 'text-anchor': anchor }, text);

// 각도 라벨은 자주 쓰이므로 도 단위 문자열을 한 곳에서 만든다.
export const deg = (value) => `${format(value, 2)}°`;

// 치수선: 양끝 화살표 + 보조선 + 가운데 라벨.
function dimH(x1, x2, y, text, { accent = false, below = false } = {}) {
  const cls = accent ? 'd-dim d-accent' : 'd-dim';
  return s(
    'g',
    { class: cls },
    s('line', {
      x1,
      y1: y,
      x2,
      y2: y,
      'marker-start': `url(#${ARROW})`,
      'marker-end': `url(#${ARROW})`,
    }),
    s('line', { x1, y1: y - 5, x2: x1, y2: y + 5 }),
    s('line', { x1: x2, y1: y - 5, x2: x2, y2: y + 5 }),
    label((x1 + x2) / 2, below ? y + 15 : y - 8, text, accent ? 'd-label d-accent-fill' : 'd-label')
  );
}

function dimV(y1, y2, x, text, { accent = false } = {}) {
  const cls = accent ? 'd-dim d-accent' : 'd-dim';
  return s(
    'g',
    { class: cls },
    s('line', {
      x1: x,
      y1,
      x2: x,
      y2,
      'marker-start': `url(#${ARROW})`,
      'marker-end': `url(#${ARROW})`,
    }),
    s('line', { x1: x - 5, y1, x2: x + 5, y2: y1 }),
    s('line', { x1: x - 5, y1: y2, x2: x + 5, y2 }),
    s(
      'text',
      {
        x: x - 9,
        y: (y1 + y2) / 2,
        class: accent ? 'd-label d-accent-fill' : 'd-label',
        'text-anchor': 'middle',
        transform: `rotate(-90 ${x - 9} ${(y1 + y2) / 2})`,
      },
      text
    )
  );
}

/* ---------- 시야 사각형 ---------- */

// 실제 시야를 실선으로, 검사 대상을 점선으로 겹쳐 그린다.
// 두 사각형의 차이가 곧 남는 여백이고, 붙어 있는 축이 제약축이다.
// name 을 주면 치수 라벨을 바꿔 쓸 수 있다. 센서 사각형처럼 시야가 아닌 것을
// 그릴 때 "FOV" 로 잘못 적히는 것을 막는다.
export function fovRect(fovW, fovH, { targetW, targetH, axis, note, name = 'FOV' } = {}) {
  const VB_W = 340;
  const VB_H = 210;
  const boxW = 190;
  const boxH = 100;
  const x0 = 84;
  const y0 = 44;

  const scale = Math.min(boxW / fovW, boxH / fovH);
  const w = fovW * scale;
  const h = fovH * scale;

  const kids = [
    s('rect', { x: x0, y: y0, width: w, height: h, class: 'd-fov' }),
    dimH(x0, x0 + w, y0 - 14, `${name} (W)  ${format(fovW, 1)} mm`, { accent: true }),
    dimV(y0, y0 + h, x0 - 16, `${name} (H)  ${format(fovH, 1)} mm`, { accent: true }),
  ];

  if (targetW && targetH) {
    const tw = targetW * scale;
    const th = targetH * scale;
    // 사각형 안에 글자를 넣으면 세로 치수 라벨과 부딪힌다. 설명은 전부 아래로 뺀다.
    kids.push(
      s('rect', { x: x0 + (w - tw) / 2, y: y0 + (h - th) / 2, width: tw, height: th, class: 'd-target' }),
      label(VB_W / 2, y0 + h + 24, `점선 = 검사 대상  ${format(targetW, 1)} × ${format(targetH, 1)} mm`, 'd-label-sm')
    );
    if (axis) {
      kids.push(label(VB_W / 2, y0 + h + 40, `${axis}축이 제약 — 반대 축에 여백이 남습니다`, 'd-label-sm'));
    }
  }

  if (note) kids.push(label(VB_W / 2, VB_H - 8, note, 'd-label-sm'));

  return frame('시야 도해', `0 0 ${VB_W} ${VB_H}`, ...kids);
}

/* ---------- 광학 배치 측면도 ---------- */

// 렌즈 왼쪽(센서 쪽)과 오른쪽(대상 쪽)은 축척이 서로 다르다. 상거리 57 mm 와
// 작동거리 300 mm 를 같은 축척으로 그리면 한쪽이 뭉개져 읽히지 않기 때문이다.
// 다만 각 구간 안에서는 비율을 지킨다 — 센서 쪽에서 f 는 b 에 대해 1/(1+m) 이다.
export function opticalLayout({ wd, f, fovH, sensorH, m }) {
  const VB_W = 380;
  // 라벨을 약어 대신 풀네임으로 쓰면서 폭·높이가 모두 늘었다. 아래 여백을 그만큼 잡는다.
  const VB_H = 272;
  const axisY = 132;
  const sensorX = 52;
  const lensX = 156;
  const objectX = 340;

  // 상거리. 렌즈에서 센서까지의 실제 거리는 f 가 아니라 이 값이다.
  const b = f * (1 + m);

  const imageSpan = lensX - sensorX;
  // 초점은 렌즈 뒤 f 지점. 상거리보다 짧고, 그 비율이 곧 1/(1+m) 이다.
  const fPx = Math.max(14, Math.min(imageSpan - 6, imageSpan / (1 + m)));
  const focalX = lensX - fPx;

  const sensorHalf = 26;
  const objectHalf = 46;

  const kids = [
    s('line', { x1: sensorX - 12, y1: axisY, x2: objectX, y2: axisY, class: 'd-axis' }),

    // 대상의 위·아래 끝에서 나온 주광선이 렌즈 중심을 지나며 상이 뒤집힌다.
    // 꺾이는 지점은 반드시 렌즈 중심이어야 한다.
    s('polyline', {
      points: `${objectX},${axisY - objectHalf} ${lensX},${axisY} ${sensorX},${axisY + sensorHalf}`,
      class: 'd-ray',
      fill: 'none',
    }),
    s('polyline', {
      points: `${objectX},${axisY + objectHalf} ${lensX},${axisY} ${sensorX},${axisY - sensorHalf}`,
      class: 'd-ray',
      fill: 'none',
    }),

    // 초점 위치 표식
    s('line', { x1: focalX, y1: axisY - 6, x2: focalX, y2: axisY + 6, class: 'd-limit' }),

    s('rect', { x: sensorX - 5, y: axisY - sensorHalf, width: 10, height: sensorHalf * 2, class: 'd-sensor' }),
    s('ellipse', { cx: lensX, cy: axisY, rx: 7, ry: 34, class: 'd-lens' }),
    s('rect', { x: objectX - 5, y: axisY - objectHalf, width: 10, height: objectHalf * 2, class: 'd-object' }),

    label(sensorX, axisY + sensorHalf + 18, '센서', 'd-label-sm'),
    label(sensorX, axisY + sensorHalf + 34, `${format(sensorH, 2)} mm`, 'd-label-sm'),
    label(lensX, axisY + 50, '렌즈', 'd-label-sm'),
    label(objectX, axisY + objectHalf + 18, '대상', 'd-label-sm'),

    // 상거리와 초점거리를 같은 쪽에 겹쳐 그려 초점거리 < 상거리 관계가 보이게 한다.
    dimH(sensorX, lensX, axisY - 76, `상거리 Image Distance  ${format(b, 2)} mm`),
    dimH(focalX, lensX, axisY - 50, `초점거리 Focal Length  ${format(f, 2)} mm`, { accent: true }),

    dimH(lensX, objectX, axisY + objectHalf + 48, `WD  ${format(wd, 1)} mm`, {
      accent: true,
    }),

    // 렌즈~센서 구간을 초점거리로 오해하기 쉬워 관계식을 그림 안에 적어 둔다.
    label(VB_W / 2, VB_H - 28, '렌즈 → 센서 = 상거리 = 초점거리 × (1 + 배율)', 'd-label-sm'),
    label(VB_W / 2, VB_H - 10, `배율 ${format(m, 4)} ×  ·  개략도 — 좌우 축척이 다름`, 'd-label-sm'),
  ];

  return frame('광학 배치 도해', `0 0 ${VB_W} ${VB_H}`, ...kids);
}

/* ---------- 피사계심도 구간 ---------- */

export function depthRange({ dof, nearHalf, farHalf, unit = 'mm' }) {
  const VB_W = 360;
  // 하단 설명이 DOF 치수 라벨과 겹치지 않을 만큼 아래 여백을 둔다.
  const VB_H = 190;
  const axisY = 78;
  const lensX = 40;
  const focusX = 210;
  const half = 62;

  const kids = [
    s('line', { x1: lensX, y1: axisY, x2: VB_W - 14, y2: axisY, class: 'd-axis' }),
    s('ellipse', { cx: lensX, cy: axisY, rx: 6, ry: 30, class: 'd-lens' }),
    label(lensX, axisY - 40, '렌즈', 'd-label-sm'),

    // 초점이 맞는 것으로 판정되는 깊이 구간
    s('rect', { x: focusX - half, y: axisY - 34, width: half * 2, height: 68, class: 'd-band' }),

    // 초점면
    s('line', { x1: focusX, y1: axisY - 44, x2: focusX, y2: axisY + 44, class: 'd-focus' }),
    label(focusX, axisY - 50, '초점면', 'd-label-sm'),

    s('line', { x1: focusX - half, y1: axisY - 38, x2: focusX - half, y2: axisY + 38, class: 'd-limit' }),
    s('line', { x1: focusX + half, y1: axisY - 38, x2: focusX + half, y2: axisY + 38, class: 'd-limit' }),

    dimH(focusX - half, focusX + half, axisY + 58, `DOF  ${format(dof, 3)} ${unit}`, { accent: true, below: true }),

    label(focusX - half / 2, axisY + 30, `전방 ${format(nearHalf, 3)}`, 'd-label-sm'),
    label(focusX + half / 2, axisY + 30, `후방 ${format(farHalf, 3)}`, 'd-label-sm'),

    label(VB_W / 2, VB_H - 8, '이 구간 안에 있으면 초점이 맞은 것으로 본다  ·  개략도(축척 아님)', 'd-label-sm'),
  ];

  return frame('피사계심도 도해', `0 0 ${VB_W} ${VB_H}`, ...kids);
}

/* ---------- 초점심도 (센서측) ---------- */

// 렌즈에서 모인 빛은 초점에서 한 점이 되었다가 다시 퍼진다.
// 센서를 초점에서 앞뒤로 옮기면 점이 원으로 번지는데, 그 원이 허용 착란원에
// 닿는 지점까지가 초점심도다. 원뿔로 그리면 이 관계가 그대로 보인다.
export function focusDepthView({ focusDepth, halfDepth, coc, effectiveN }) {
  const VB_W = 360;
  const VB_H = 210;
  const axisY = 88;
  const lensX = 40;
  const focusX = 225;
  const half = 34;

  const coneHalf = 42;
  const slope = coneHalf / (focusX - lensX - 6);
  const spotHalf = half * slope;
  const tailX = 330;
  const tailHalf = (tailX - focusX) * slope;

  return frame(
    '초점심도 도해',
    `0 0 ${VB_W} ${VB_H}`,
    s('line', { x1: lensX, y1: axisY, x2: tailX, y2: axisY, class: 'd-axis' }),

    // 초점이 맞은 것으로 보는 구간
    s('rect', { x: focusX - half, y: axisY - 46, width: half * 2, height: 92, class: 'd-band' }),

    // 수렴했다가 다시 퍼지는 광선
    s('polyline', {
      points: `${lensX + 6},${axisY - coneHalf} ${focusX},${axisY} ${tailX},${axisY + tailHalf}`,
      class: 'd-ray',
      fill: 'none',
    }),
    s('polyline', {
      points: `${lensX + 6},${axisY + coneHalf} ${focusX},${axisY} ${tailX},${axisY - tailHalf}`,
      class: 'd-ray',
      fill: 'none',
    }),

    s('ellipse', { cx: lensX, cy: axisY, rx: 6, ry: coneHalf, class: 'd-lens' }),
    label(lensX, axisY - coneHalf - 10, '렌즈', 'd-label-sm'),

    // 구간 양끝에서 빛다발의 지름이 곧 허용 착란원이다.
    s('line', { x1: focusX - half, y1: axisY - spotHalf, x2: focusX - half, y2: axisY + spotHalf, class: 'd-coc' }),
    s('line', { x1: focusX + half, y1: axisY - spotHalf, x2: focusX + half, y2: axisY + spotHalf, class: 'd-coc' }),

    // 초점면에 놓인 센서
    s('rect', { x: focusX - 4, y: axisY - 30, width: 8, height: 60, class: 'd-sensor' }),
    label(focusX, axisY - 52, '센서', 'd-label-sm'),

    dimH(focusX - half, focusX + half, axisY + 62, `초점심도 Depth of Focus  ${format(focusDepth, 1)} µm`, {
      accent: true,
      below: true,
    }),

    label(focusX + half + 46, axisY + spotHalf + 14, `허용 착란원 ${format(coc, 2)} µm`, 'd-label-sm'),
    label(VB_W / 2, VB_H - 24, `센서를 앞뒤로 ±${format(halfDepth, 1)} µm 까지 옮겨도 흐림이 허용 착란원 안에 있습니다`, 'd-label-sm'),
    label(VB_W / 2, VB_H - 8, `유효 F수 ${format(effectiveN, 2)}  ·  개략도 — 축척 아님`, 'd-label-sm')
  );
}

/* ---------- 모션 블러 ---------- */

// 노출 중 대상이 움직인 거리가 픽셀 몇 개에 걸치는지 보여준다.
export function motionBlurView({ blurPx, blurUm, umPerPx, exposureUs, timeName = '노출' }) {
  const VB_W = 340;
  const VB_H = 180;
  const cell = 30;
  const cols = 8;
  const x0 = (VB_W - cols * cell) / 2;
  const y0 = 46;

  const smear = Math.max(0.15, Math.min(cols - 1, blurPx));
  const kids = [];

  for (let c = 0; c < cols; c++) {
    kids.push(s('rect', { x: x0 + c * cell, y: y0, width: cell, height: cell, class: 'd-px' }));
  }

  // 정지 상태의 점과, 노출 동안 번진 자국.
  kids.push(
    s('circle', { cx: x0 + cell * 0.5, cy: y0 + cell / 2, r: cell * 0.3, class: 'd-spot' }),
    s('rect', {
      x: x0 + cell * 0.5 - cell * 0.3,
      y: y0 + cell / 2 - cell * 0.3,
      width: cell * (0.6 + smear),
      height: cell * 0.6,
      rx: cell * 0.3,
      class: 'd-smear',
    }),
    dimH(x0 + cell * 0.5, x0 + cell * (0.5 + smear), y0 + cell + 26,
      `이동 ${format(blurUm, 1)} µm = ${format(blurPx, 2)} px`, { accent: true, below: true }),
    label(x0 + cell * 0.5, y0 - 12, '정지 시', 'd-label-sm'),
    label(VB_W / 2, VB_H - 22, `1 px = ${format(umPerPx, 2)} µm  ·  ${timeName} ${format(exposureUs, 0)} µs`, 'd-label-sm'),
    label(VB_W / 2, VB_H - 7, `${timeName} 동안 대상이 움직인 만큼 상이 번집니다`, 'd-label-sm')
  );

  return frame('모션 블러 도해', `0 0 ${VB_W} ${VB_H}`, ...kids);
}

/* ---------- 롤링 셔터 왜곡 ---------- */

// 위에서 아래로 순차 노출되므로, 대상이 움직이면 아래로 갈수록 밀려 기울어진다.
export function rollingShutterView({ shiftPx, skewDeg, readoutUs, rows }) {
  const VB_W = 340;
  // 도형 아래 캡션 한 줄 + 설명 세 줄이 들어가므로 아래 여백을 넉넉히 잡는다.
  const VB_H = 222;
  const boxW = 110;
  const boxH = 92;
  const cx = VB_W / 2;
  const y0 = 42;

  // 기울기를 화면에서 보이게 하되 과하지 않게 제한한다.
  const lean = Math.max(-56, Math.min(56, (shiftPx / Math.max(rows, 1)) * boxH * 6));

  return frame(
    '롤링 셔터 왜곡 도해',
    `0 0 ${VB_W} ${VB_H}`,
    s('rect', { x: cx - boxW - 24, y: y0, width: boxW, height: boxH, class: 'd-target' }),
    label(cx - boxW / 2 - 24, y0 + boxH + 18, '실제 형상', 'd-label-sm'),

    s('polygon', {
      points: [
        `${cx + 24},${y0}`,
        `${cx + 24 + boxW},${y0}`,
        `${cx + 24 + boxW + lean},${y0 + boxH}`,
        `${cx + 24 + lean},${y0 + boxH}`,
      ].join(' '),
      class: 'd-fov-bad',
    }),
    label(cx + boxW / 2 + 24, y0 + boxH + 18, '촬영 결과', 'd-label-sm'),

    label(VB_W / 2, VB_H - 46, `첫 행과 마지막 행 사이 ${format(readoutUs, 0)} µs 차이`, 'd-label-sm'),
    label(VB_W / 2, VB_H - 28, `아래쪽이 ${format(shiftPx, 2)} px 밀립니다`, 'd-label'),
    label(VB_W / 2, VB_H - 8, `기울기 ${format(skewDeg, 2)}°  ·  개략도 — 기울기 과장`, 'd-label-sm')
  );
}

/* ---------- 이미지 서클과 센서 ---------- */

// 렌즈가 만드는 상의 원과 센서 사각형을 겹쳐 그린다.
// 사각형의 대각이 원을 벗어나면 모서리가 어두워진다.
export function imageCircleView({ circleDia, sensorW, sensorH, diag }) {
  const VB_W = 320;
  const VB_H = 250;
  const cx = VB_W / 2;
  const cy = 118;

  // 원과 사각형은 같은 축척으로 그려야 여유가 눈에 보인다.
  const outer = Math.max(circleDia, diag);
  const scale = 96 / (outer / 2);
  const r = (circleDia / 2) * scale;
  const w = sensorW * scale;
  const h = sensorH * scale;
  const covered = circleDia >= diag;

  return frame(
    '이미지 서클 도해',
    `0 0 ${VB_W} ${VB_H}`,
    s('circle', { cx, cy, r, class: 'd-circle' }),
    s('rect', { x: cx - w / 2, y: cy - h / 2, width: w, height: h, class: covered ? 'd-fov' : 'd-fov-bad' }),
    // 센서 대각. 이 선이 원을 뚫고 나가면 비네팅이다.
    s('line', { x1: cx - w / 2, y1: cy - h / 2, x2: cx + w / 2, y2: cy + h / 2, class: 'd-limit' }),
    label(cx, cy - r - 10, `이미지 서클 Image Circle  ⌀${format(circleDia, 1)} mm`, 'd-label'),
    label(cx, VB_H - 40, `센서 ${format(sensorW, 2)} × ${format(sensorH, 2)} mm`, 'd-label-sm'),
    label(cx, VB_H - 24, `센서 대각 Diagonal  ${format(diag, 2)} mm`, 'd-label-sm'),
    label(
      cx,
      VB_H - 8,
      covered
        ? `여유 ${format(circleDia - diag, 2)} mm — 모서리까지 덮습니다`
        : `${format(diag - circleDia, 2)} mm 모자랍니다 — 모서리 비네팅`,
      'd-label-sm'
    )
  );
}

/* ---------- 박막렌즈 결상 ---------- */

// 교과서 배치를 따른다 — 대상이 왼쪽, 렌즈가 가운데, 상이 오른쪽.
// 머신비전 배치도(opticalLayout)와 좌우가 반대인 점에 주의.
export function thinLensView({ f, a, b, m, virtual }) {
  const VB_W = 380;
  const VB_H = 215;
  const axisY = 96;
  const lensX = 190;

  // 물체거리와 상거리의 비율만 반영하고, 한쪽이 뭉개지지 않도록 폭을 제한한다.
  const maxArm = 128;
  const scale = Math.min(maxArm / a, maxArm / Math.abs(b));
  const aPx = Math.max(26, a * scale);
  const bPx = Math.max(26, Math.abs(b) * scale);

  const objectX = lensX - aPx;
  const imageX = virtual ? lensX - bPx : lensX + bPx;

  const objHalf = 30;
  const imgHalf = Math.max(8, Math.min(46, objHalf * Math.abs(m)));

  return frame(
    '박막렌즈 결상 도해',
    `0 0 ${VB_W} ${VB_H}`,
    s('line', { x1: 14, y1: axisY, x2: VB_W - 14, y2: axisY, class: 'd-axis' }),
    s('ellipse', { cx: lensX, cy: axisY, rx: 7, ry: 40, class: 'd-lens' }),

    // 주광선. 실상이면 렌즈 중심을 지나 반대편에 거꾸로 맺힌다.
    s('polyline', {
      points: `${objectX},${axisY - objHalf} ${lensX},${axisY} ${imageX},${axisY + (virtual ? -imgHalf : imgHalf)}`,
      class: 'd-ray',
      fill: 'none',
    }),

    s('rect', { x: objectX - 4, y: axisY - objHalf, width: 8, height: objHalf, class: 'd-object' }),
    s('rect', {
      x: imageX - 4,
      y: virtual ? axisY - imgHalf : axisY,
      width: 8,
      height: imgHalf,
      class: virtual ? 'd-image-virtual' : 'd-image',
    }),

    label(objectX, axisY - objHalf - 8, '대상', 'd-label-sm'),
    label(imageX, virtual ? axisY - imgHalf - 8 : axisY + imgHalf + 16, virtual ? '허상' : '상', 'd-label-sm'),
    label(lensX, axisY + 52, '렌즈', 'd-label-sm'),

    dimH(objectX, lensX, axisY - 62, `물체거리 Object Distance  ${format(a, 2)} mm`),
    dimH(
      Math.min(lensX, imageX),
      Math.max(lensX, imageX),
      axisY + 74,
      `상거리 Image Distance  ${format(b, 2)} mm`,
      { accent: true, below: true }
    ),
    label(
      VB_W / 2,
      VB_H - 8,
      `배율 ${format(m, 3)} ×  ·  ${virtual ? '허상 — 상은 대상과 같은 쪽에 맺힙니다' : '실상 — 상은 거꾸로 맺힙니다'}`,
      'd-label-sm'
    )
  );
}

/* ---------- 굴절 (스넬 법칙) ---------- */

export function refractionView({ n1, n2, theta1, theta2, reflectance, total }) {
  const VB_W = 340;
  const VB_H = 230;
  const cx = VB_W / 2;
  const cy = 108;
  const len = 84;

  const rad = (d) => (d * Math.PI) / 180;
  // 스침 입사(80° 이상)에서는 광선이 경계면에 붙어 라벨이 겹친다.
  // 그림에서만 각도를 제한한다 — 표시되는 수치는 실제 값 그대로다.
  const DRAW_MAX = 75;
  const drawT1 = Math.min(theta1, DRAW_MAX);
  const drawT2 = Math.min(theta2 ?? 0, DRAW_MAX);
  const clamped = theta1 > DRAW_MAX;

  // 각도는 경계면 법선(수직)에서 잰다.
  const inX = cx - len * Math.sin(rad(drawT1));
  const inY = cy - len * Math.cos(rad(drawT1));
  const reflX = cx + len * Math.sin(rad(drawT1));

  const kids = [
    // 아래쪽이 둘째 매질
    s('rect', { x: 14, y: cy, width: VB_W - 28, height: 62, class: 'd-medium' }),
    s('line', { x1: 14, y1: cy, x2: VB_W - 14, y2: cy, class: 'd-interface' }),
    s('line', { x1: cx, y1: cy - 92, x2: cx, y2: cy + 56, class: 'd-axis' }),

    s('line', { x1: inX, y1: inY, x2: cx, y2: cy, class: 'd-ray' }),
    s('line', { x1: cx, y1: cy, x2: reflX, y2: inY, class: 'd-ray-weak' }),

    label(14, cy - 8, `n₁ = ${format(n1, 4)}`, 'd-label-sm', 'start'),
    label(14, cy + 20, `n₂ = ${format(n2, 4)}`, 'd-label-sm', 'start'),
    // 수직 입사에서는 입사광과 반사광이 같은 선 위에 놓인다.
    // 라벨을 법선 기준 양쪽으로 갈라 붙여야 겹치지 않는다.
    label(inX - 6, inY - 6, `입사 ${format(theta1, 2)}°`, 'd-label-sm', 'end'),
    label(reflX + 6, inY - 6, `반사 ${format(reflectance * 100, 1)} %`, 'd-label-sm', 'start'),
  ];

  if (total) {
    kids.push(label(cx, cy + 46, '전반사 — 굴절광이 없습니다', 'd-label'));
  } else {
    const outX = cx + len * Math.sin(rad(drawT2));
    const outY = cy + len * Math.cos(rad(drawT2));
    kids.push(
      s('line', { x1: cx, y1: cy, x2: outX, y2: outY, class: 'd-ray' }),
      label(outX + 2, outY + 14, `굴절 ${format(theta2, 2)}°`, 'd-label')
    );
  }

  kids.push(
    label(
      VB_W / 2,
      VB_H - 8,
      clamped
        ? 'n₁ sin θ₁ = n₂ sin θ₂  ·  각도는 법선 기준  ·  그림의 각도는 축소 표시'
        : 'n₁ sin θ₁ = n₂ sin θ₂  ·  각도는 법선 기준',
      'd-label-sm'
    )
  );
  return frame('굴절 도해', `0 0 ${VB_W} ${VB_H}`, ...kids);
}

/* ---------- 평행 유리판 통과 ---------- */

// 유리를 통해 들여다보면 초점이 뒤로 밀리고, 비스듬히 보면 상이 옆으로 어긋난다.
export function plateShiftView({ thickness, focusShift, lateralShift, theta1 }) {
  const VB_W = 350;
  const VB_H = 200;
  const cy = 84;
  const plateX = 130;
  const plateW = 74;

  const rad = (d) => (d * Math.PI) / 180;
  const drop = Math.tan(rad(theta1)) * 34;

  return frame(
    '평행판 통과 도해',
    `0 0 ${VB_W} ${VB_H}`,
    s('rect', { x: plateX, y: cy - 46, width: plateW, height: 92, class: 'd-medium' }),
    label(plateX + plateW / 2, cy - 54, `유리 ${format(thickness, 2)} mm`, 'd-label-sm'),

    // 유리가 없을 때의 경로
    s('line', { x1: 18, y1: cy - drop, x2: VB_W - 18, y2: cy + drop * 1.9, class: 'd-ray-ghost' }),
    // 유리를 지나며 평행하게 어긋난 경로
    s('polyline', {
      points: `${18},${cy - drop} ${plateX},${cy} ${plateX + plateW},${cy + drop * 0.5} ${VB_W - 18},${cy + drop * 1.9 + 16}`,
      class: 'd-ray',
      fill: 'none',
    }),

    dimH(plateX, plateX + plateW, cy + 62, `초점 이동 ${format(focusShift, 3)} mm`, { accent: true, below: true }),
    label(VB_W / 2, VB_H - 24, `측면 변위 ${format(lateralShift, 4)} mm  ·  입사각 ${format(theta1, 1)}°`, 'd-label-sm'),
    label(VB_W / 2, VB_H - 8, '점선 = 유리가 없을 때 경로  ·  개략도 — 어긋남 과장', 'd-label-sm')
  );
}

/* ---------- 화각 ---------- */

export function angleOfViewView({ aovDeg, wd, fovW, f }) {
  const VB_W = 340;
  const VB_H = 218;
  const apexX = 40;
  const apexY = 92;
  const reach = 250;

  const rad = ((aovDeg / 2) * Math.PI) / 180;
  const half = Math.min(66, Math.tan(rad) * reach);

  return frame(
    '화각 도해',
    `0 0 ${VB_W} ${VB_H}`,
    s('line', { x1: apexX, y1: apexY, x2: apexX + reach + 14, y2: apexY, class: 'd-axis' }),
    s('polygon', {
      points: `${apexX},${apexY} ${apexX + reach},${apexY - half} ${apexX + reach},${apexY + half}`,
      class: 'd-cone',
    }),
    s('ellipse', { cx: apexX, cy: apexY, rx: 6, ry: 26, class: 'd-lens' }),
    label(apexX, apexY - 34, '렌즈', 'd-label-sm'),
    s('rect', { x: apexX + reach - 4, y: apexY - half, width: 8, height: half * 2, class: 'd-object' }),

    label(apexX + 52, apexY - 10, `${format(aovDeg, 2)}°`, 'd-label d-accent-fill', 'start'),
    // 원뿔 높이와 무관하게 고정 위치에 둔다. 화각이 넓어도 아래 설명과 겹치지 않는다.
    dimH(apexX, apexX + reach, VB_H - 42, `WD ${format(wd, 1)} mm`, { below: false }),
    dimV(apexY - half, apexY + half, apexX + reach + 22, `FOV (W) ${format(fovW, 1)} mm`, { accent: true }),
    label(VB_W / 2, VB_H - 8, `초점거리 ${format(f, 2)} mm  ·  화각 = 2 × atan( FOV (W) / 2 / WD )`, 'd-label-sm')
  );
}

/* ---------- 픽셀 격자와 검출 한계 ---------- */

// 해상도(µm/px)가 실제로 무엇인지 — 픽셀 한 칸이 대상에서 몇 µm 인지 — 를 보여주고,
// 결함 판정에 필요한 픽셀 수만큼 칠해 검출 한계를 나타낸다.
export function pixelGrid({ umPerPx, minPixels, detectLimit }) {
  const VB_W = 340;
  // 검출 한계 치수 라벨이 격자 아래로 내려오므로 하단 설명과의 간격을 확보한다.
  const VB_H = 205;
  const cell = 26;
  const cols = 6;
  const rows = 4;
  const x0 = (VB_W - cols * cell) / 2;
  const y0 = 40;

  const n = Math.max(1, Math.min(minPixels, cols));
  const kids = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const filled = r === 1 && c >= 1 && c < 1 + n;
      kids.push(
        s('rect', {
          x: x0 + c * cell,
          y: y0 + r * cell,
          width: cell,
          height: cell,
          class: filled ? 'd-px-on' : 'd-px',
        })
      );
    }
  }

  kids.push(
    dimH(x0, x0 + cell, y0 - 12, `1 px = ${format(umPerPx, 2)} µm`, { accent: true }),
    dimH(x0 + cell, x0 + cell * (1 + n), y0 + rows * cell + 16, `검출 한계  ${format(detectLimit, 1)} µm  (${minPixels} px)`, {
      below: true,
    }),
    label(VB_W / 2, VB_H - 8, '대상 위에서 픽셀 한 칸이 차지하는 실제 크기', 'd-label-sm')
  );

  return frame('해상도 도해', `0 0 ${VB_W} ${VB_H}`, ...kids);
}

/* ---------- 스트로브 타이밍 ---------- */

// 트리거 한 점을 기준으로 노출 창과 발광 펄스를 같은 시간축 위에 겹쳐 그린다.
// 두 구간이 겹치는 만큼만 센서에 빛이 담기므로, 겹침 구간을 따로 칠한다.
export function strobeTimingView({ expStart, expUs, pulseStart, pulseUs, overlapUs }) {
  const VB_W = 340;
  const VB_H = 226;
  const x0 = 52;
  const x1 = 326;
  const W = x1 - x0;

  const expEnd = expStart + expUs;
  const pulseEnd = pulseStart + pulseUs;
  // 축 오른쪽 끝에 도형이 닿지 않도록 8 % 만 여유를 준다.
  const span = Math.max(expEnd, pulseEnd, 1e-9) * 1.08;
  const xOf = (t) => x0 + (t / span) * W;
  // 아주 짧은 펄스도 보이도록 최소 폭을 준다.
  const barW = (a, b) => Math.max(2.5, xOf(b) - xOf(a));

  const expY = 56;
  const pulseY = 108;
  const barH = 26;
  const axisY = 148;

  const kids = [];

  // 겹침 구간을 두 줄에 걸쳐 세로로 칠한다. 막대보다 먼저 그려 뒤에 깔리게 한다.
  if (overlapUs > 0) {
    const oa = Math.max(expStart, pulseStart);
    kids.push(
      s('rect', {
        x: xOf(oa),
        y: expY - 6,
        width: barW(oa, oa + overlapUs),
        height: pulseY + barH + 6 - (expY - 6),
        class: 'd-overlap',
      })
    );
  }

  kids.push(
    s('line', { x1: x0, y1: 40, x2: x0, y2: axisY, class: 'd-trigger' }),
    label(x0, 32, '트리거', 'd-label-sm'),

    s('rect', { x: xOf(expStart), y: expY, width: barW(expStart, expEnd), height: barH, class: 'd-window' }),
    label(46, expY + 17, '노출', 'd-label', 'end'),
    label(xOf(expStart) + barW(expStart, expEnd) / 2, expY + 17, `${format(expUs, 0)} µs`, 'd-label'),

    s('rect', { x: xOf(pulseStart), y: pulseY, width: barW(pulseStart, pulseEnd), height: barH, class: 'd-pulse' }),
    label(46, pulseY + 17, '조명', 'd-label', 'end'),
    label(xOf(pulseStart) + barW(pulseStart, pulseEnd) / 2, pulseY + 17, `${format(pulseUs, 0)} µs`, 'd-label'),

    s('line', { x1: x0, y1: axisY, x2: x1 + 4, y2: axisY, class: 'd-axis' }),
    label(x1 + 4, axisY + 13, '시간', 'd-label-sm', 'end')
  );

  if (overlapUs > 0) {
    const oa = Math.max(expStart, pulseStart);
    kids.push(dimH(xOf(oa), xOf(oa) + barW(oa, oa + overlapUs), axisY + 24,
      `겹침 ${format(overlapUs, 0)} µs`, { accent: true, below: true }));
  } else {
    kids.push(label(VB_W / 2, axisY + 30, '겹치는 구간이 없습니다', 'd-label d-accent-fill'));
  }

  kids.push(
    label(VB_W / 2, VB_H - 22, `펄스 중 ${format((overlapUs / pulseUs) * 100, 1)} % 만 센서에 담깁니다`, 'd-label-sm'),
    label(VB_W / 2, VB_H - 7, '트리거를 기준으로 각 지연을 더한 위치입니다', 'd-label-sm')
  );

  return frame('스트로브 타이밍 도해', `0 0 ${VB_W} ${VB_H}`, ...kids);
}

/* ---------- 스트로브 펄스 열 ---------- */

// 정격 대비 얼마나 세게, 얼마나 짧게 때리는지를 한 화면에 보인다.
// 막대 높이가 오버드라이브 배수이고, 폭이 듀티다.
export function pulseTrainView({ pulseUs, periodMs, dutyPct, overdrive, load }) {
  const VB_W = 340;
  const VB_H = 208;
  const x0 = 44;
  const x1 = 322;
  const W = x1 - x0;
  const cycles = 3;
  const per = W / cycles;

  const base = 118;
  const maxH = 60;
  // 막대 꼭대기를 오버드라이브 배수로 두면, 정격 1× 선의 높이는 그 역수다.
  const ratedH = maxH / Math.max(overdrive, 1);
  const pulseW = Math.max(2.5, per * (dutyPct / 100));

  const kids = [];
  for (let i = 0; i < cycles; i++) {
    kids.push(s('rect', { x: x0 + i * per, y: base - maxH, width: pulseW, height: maxH, class: 'd-pulse-solid' }));
  }

  kids.push(
    s('line', { x1: x0, y1: base - ratedH, x2: x1, y2: base - ratedH, class: 'd-rated' }),
    label(x1, base - ratedH - 5, '정격 1×', 'd-label-sm', 'end'),
    s('line', { x1: x0 - 6, y1: base, x2: x1 + 4, y2: base, class: 'd-axis' }),
    dimH(x0, x0 + per, base + 18, `주기 ${format(periodMs, 2)} ms`, { below: true }),
    label(VB_W / 2, VB_H - 36, `펄스 ${format(pulseUs, 1)} µs  ·  듀티 ${format(dutyPct, 3)} %`, 'd-label'),
    label(VB_W / 2, VB_H - 20, `피크 ${format(overdrive, 1)} ×정격  ·  평균 부하 ${format(load, 3)} ×정격`,
      load > 1 ? 'd-label d-accent-fill' : 'd-label-sm'),
    label(VB_W / 2, VB_H - 5, '막대 높이가 오버드라이브 배수, 폭이 듀티입니다', 'd-label-sm')
  );

  return frame('스트로브 펄스 열 도해', `0 0 ${VB_W} ${VB_H}`, ...kids);
}

/* ---------- 2점 마크 정렬 ---------- */

// 목표 마크와 실측 마크를 겹쳐 그린다.
// 정렬 편차는 마크 간 거리에 비해 수백 배 작아 그대로 그리면 두 점이 겹쳐 보인다.
// 그래서 편차만 배율을 걸어 키우고, 몇 배로 키웠는지 캡션에 적는다.
export function markAlignView({ target, measured, dX, dY, dThetaDeg, markDist }) {
  const VB_W = 340;
  const VB_H = 226;
  const PL = 36;
  const PR = 304;
  const PT = 46;
  const PB = 164;

  const xs = target.map((p) => p[0]);
  const ys = target.map((p) => p[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const spanX = Math.max(Math.max(...xs) - Math.min(...xs), 1e-9);
  const spanY = Math.max(Math.max(...ys) - Math.min(...ys), 1e-9);
  // 마크 쌍이 화면 폭의 70 % 를 차지하도록 맞춘다.
  const scale = Math.min((PR - PL) / (spanX * 1.45), (PB - PT) / (spanY * 1.45));
  const X = (x) => (PL + PR) / 2 + (x - cx) * scale;
  const Y = (y) => (PT + PB) / 2 - (y - cy) * scale;

  const devs = target.map((t, i) => [measured[i][0] - t[0], measured[i][1] - t[1]]);
  const maxDevPx = Math.max(...devs.map((d) => Math.hypot(d[0], d[1]) * scale));
  // 화면에서 20 px 정도로 보이게 키운다. 이미 충분히 크면 그대로 둔다.
  const gain = maxDevPx > 1e-9 ? Math.max(1, Math.min(2000, 20 / maxDevPx)) : 1;

  const ts = target.map((p) => [X(p[0]), Y(p[1])]);
  const ms = target.map((p, i) => [X(p[0]) + devs[i][0] * scale * gain, Y(p[1]) - devs[i][1] * scale * gain]);

  const kids = [
    s('line', { x1: ts[0][0], y1: ts[0][1], x2: ts[1][0], y2: ts[1][1], class: 'd-mark-t' }),
    s('line', { x1: ms[0][0], y1: ms[0][1], x2: ms[1][0], y2: ms[1][1], class: 'd-mark-m' }),
  ];

  for (let i = 0; i < 2; i++) {
    kids.push(
      s('circle', { cx: ts[i][0], cy: ts[i][1], r: 6, class: 'd-mark-t' }),
      s('circle', { cx: ms[i][0], cy: ms[i][1], r: 4, class: 'd-mark-m-fill' })
    );
  }

  // 마크 번호는 목표 위치 기준으로 붙인다.
  kids.push(
    label(ts[0][0], ts[0][1] - 12, '마크 1', 'd-label-sm'),
    label(ts[1][0], ts[1][1] - 12, '마크 2', 'd-label-sm'),
    label(VB_W / 2, VB_H - 42, `ΔX ${format(dX, 4)} mm  ·  ΔY ${format(dY, 4)} mm`, 'd-label d-accent-fill'),
    label(VB_W / 2, VB_H - 25, `Δθ ${format(dThetaDeg, 4)}°  ·  마크 간 ${format(markDist, 3)} mm`, 'd-label'),
    label(VB_W / 2, VB_H - 8,
      gain > 1.5 ? `목표 점선 · 실측 실선 — 편차 ×${format(gain, 0)} 과장` : '목표 점선 · 실측 실선',
      'd-label-sm')
  );

  return frame('2점 마크 정렬 도해', `0 0 ${VB_W} ${VB_H}`, ...kids);
}

/* ---------- 정렬 정밀도 예산 ---------- */

// 위쪽은 마크 두 개와 각각의 위치 오차, 아래쪽은 그 오차가 만드는 각도 오차가
// 반경 끝에서 얼마가 되는지를 보인다. 두 그림이 한 화면에 있어야
// "마크를 멀리 두면 각도가 좋아진다" 가 눈으로 읽힌다.
export function alignBudgetView({ markDistMm, posErrUm, angErrUrad, radiusMm, edgeErrUm }) {
  const VB_W = 340;
  const VB_H = 228;
  const mx1 = 66;
  const mx2 = 274;
  const my = 60;

  const pivotX = 52;
  const armY = 150;
  const armEnd = 296;
  // 각도 오차는 µrad 단위라 그대로 그리면 보이지 않는다. 22 px 로 고정해 과장한다.
  const lift = 22;

  return frame(
    '정렬 정밀도 예산 도해',
    `0 0 ${VB_W} ${VB_H}`,
    s('line', { x1: mx1, y1: my, x2: mx2, y2: my, class: 'd-axis' }),
    s('circle', { cx: mx1, cy: my, r: 11, class: 'd-err' }),
    s('circle', { cx: mx2, cy: my, r: 11, class: 'd-err' }),
    s('circle', { cx: mx1, cy: my, r: 3, class: 'd-spot' }),
    s('circle', { cx: mx2, cy: my, r: 3, class: 'd-spot' }),
    label(mx1, my - 18, `±${format(posErrUm, 2)} µm`, 'd-label-sm'),
    label(mx2, my - 18, `±${format(posErrUm, 2)} µm`, 'd-label-sm'),
    dimH(mx1, mx2, my + 26, `마크 간 거리 ${format(markDistMm, 1)} mm`, { below: true }),

    s('line', { x1: pivotX, y1: armY, x2: armEnd, y2: armY, class: 'd-axis' }),
    s('polygon', {
      points: `${pivotX},${armY} ${armEnd},${armY} ${armEnd},${armY - lift}`,
      class: 'd-cone',
    }),
    s('circle', { cx: pivotX, cy: armY, r: 3, class: 'd-spot' }),
    label(pivotX + 4, armY + 15, `θ 오차 ${format(angErrUrad, 2)} µrad`, 'd-label-sm', 'start'),
    dimV(armY, armY - lift, armEnd + 20, `${format(edgeErrUm, 2)} µm`, { accent: true }),
    label((pivotX + armEnd) / 2, armY - 6, `반경 ${format(radiusMm, 1)} mm`, 'd-label-sm'),

    label(VB_W / 2, VB_H - 24, '마크 간 거리를 늘리면 각도 오차가 그만큼 줄어듭니다', 'd-label-sm'),
    label(VB_W / 2, VB_H - 8, '개략도 — 오차 과장', 'd-label-sm')
  );
}

/* ---------- 회전 중심 보정 ---------- */

// 회전 중심과 기준점이 떨어져 있으면, θ 만 돌려도 기준점은 호를 따라 밀린다.
// 그 밀린 양이 XY 로 되돌려야 하는 보정량이다.
export function rotationCenterView({ radiusMm, thetaDeg, shiftUm }) {
  const VB_W = 340;
  const VB_H = 204;
  const ox = 96;
  const oy = 128;
  const r = 118;
  // 실제 보정각은 1° 미만이라 그대로 그리면 호가 보이지 않는다.
  const drawDeg = Math.sign(thetaDeg || 1) * 17;
  const a = degToRad(drawDeg);

  const px = ox + r;
  const py = oy;
  const qx = ox + r * Math.cos(a);
  const qy = oy - r * Math.sin(a);

  return frame(
    '회전 중심 보정 도해',
    `0 0 ${VB_W} ${VB_H}`,
    s('line', { x1: ox, y1: oy, x2: px, y2: py, class: 'd-axis' }),
    s('line', { x1: ox, y1: oy, x2: qx, y2: qy, class: 'd-ray' }),
    s('path', { d: `M ${ox + 34},${oy} A 34,34 0 0 ${drawDeg > 0 ? 1 : 0} ${ox + 34 * Math.cos(a)},${oy - 34 * Math.sin(a)}`, class: 'd-dim' }),
    label(ox + 44, oy - 14 * Math.sign(drawDeg), `θ ${format(thetaDeg, 4)}°`, 'd-label-sm', 'start'),

    s('circle', { cx: ox, cy: oy, r: 5, class: 'd-mark-t' }),
    s('line', { x1: ox - 9, y1: oy, x2: ox + 9, y2: oy, class: 'd-dim' }),
    s('line', { x1: ox, y1: oy - 9, x2: ox, y2: oy + 9, class: 'd-dim' }),
    label(ox, oy + 24, '회전 중심', 'd-label-sm'),

    s('circle', { cx: px, cy: py, r: 4, class: 'd-spot' }),
    label(px, py + 18, '기준점', 'd-label-sm'),
    s('circle', { cx: qx, cy: qy, r: 4, class: 'd-image' }),
    label(qx + 6, qy - 8, '회전 후', 'd-label-sm', 'start'),
    s('line', { x1: px, y1: py, x2: qx, y2: qy, class: 'd-dim d-accent', 'marker-end': `url(#${ARROW})` }),

    label(VB_W / 2, VB_H - 38, `회전 반경 ${format(radiusMm, 2)} mm`, 'd-label-sm'),
    label(VB_W / 2, VB_H - 21, `기준점이 ${format(shiftUm, 2)} µm 밀립니다`, 'd-label d-accent-fill'),
    label(VB_W / 2, VB_H - 5, '이 값을 XY 로 되돌려야 정렬이 맞습니다  ·  각도 과장', 'd-label-sm')
  );
}

/* ---------- 공정능력 분포 ---------- */

// 정규분포에 규격선을 겹쳐 그린다. 규격 밖으로 나간 꼬리가 곧 불량률이다.
export function capabilityView({ lsl, usl, mean, sigma, cp, cpk, ppm }) {
  const VB_W = 340;
  // ±3σ 치수 라벨과 아래 두 줄이 겹치지 않도록 아래 여백을 넉넉히 잡는다.
  const VB_H = 222;
  const PL = 28;
  const PR = 312;
  const base = 152;
  const peak = 104;

  const lo = Math.min(lsl, mean - 4 * sigma);
  const hi = Math.max(usl, mean + 4 * sigma);
  const pad = (hi - lo) * 0.08;
  const a = lo - pad;
  const b = hi + pad;
  const X = (v) => PL + ((v - a) / (b - a)) * (PR - PL);
  const Yc = (v) => base - peak * Math.exp(-0.5 * ((v - mean) / sigma) ** 2);

  const N = 96;
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const v = a + ((b - a) * i) / N;
    pts.push(`${X(v).toFixed(2)},${Yc(v).toFixed(2)}`);
  }

  // 규격 밖 꼬리. 곡선 아래를 규격선까지만 채운다.
  const tail = (from, to) => {
    const seg = [];
    const M = 24;
    for (let i = 0; i <= M; i++) {
      const v = from + ((to - from) * i) / M;
      seg.push(`${X(v).toFixed(2)},${Yc(v).toFixed(2)}`);
    }
    return s('polygon', { points: `${X(from).toFixed(2)},${base} ${seg.join(' ')} ${X(to).toFixed(2)},${base}`, class: 'd-tail' });
  };

  return frame(
    '공정능력 분포 도해',
    `0 0 ${VB_W} ${VB_H}`,
    s('polygon', { points: `${PL},${base} ${pts.join(' ')} ${PR},${base}`, class: 'd-curve' }),
    tail(a, lsl),
    tail(usl, b),

    s('line', { x1: X(lsl), y1: 44, x2: X(lsl), y2: base, class: 'd-spec' }),
    s('line', { x1: X(usl), y1: 44, x2: X(usl), y2: base, class: 'd-spec' }),
    label(X(lsl), 38, 'LSL', 'd-label-sm'),
    label(X(usl), 38, 'USL', 'd-label-sm'),

    s('line', { x1: X(mean), y1: 56, x2: X(mean), y2: base, class: 'd-limit' }),
    label(X(mean), 52, 'μ', 'd-label'),

    s('line', { x1: PL, y1: base, x2: PR, y2: base, class: 'd-axis' }),
    dimH(X(mean - 3 * sigma), X(mean + 3 * sigma), base + 16, '±3σ', { below: true }),

    label(VB_W / 2, VB_H - 22, `Cp ${format(cp, 2)}  ·  Cpk ${format(cpk, 2)}`, 'd-label d-accent-fill'),
    label(VB_W / 2, VB_H - 6, `규격 밖 ${format(ppm, 1)} PPM`, 'd-label-sm')
  );
}

/* ---------- 오차 기여도 ---------- */

// 어느 항목을 줄여야 총 오차가 줄어드는지 한눈에 보이게 한다.
// 제곱합이라 가장 큰 항목 하나가 전체를 지배하는 경우가 많다.
export function contributionBars({ items, totalUm, unit = 'µm' }) {
  const VB_W = 340;
  const rowH = 26;
  const top = 34;
  const VB_H = top + items.length * rowH + 40;
  const barL = 116;
  const barR = 284;

  const kids = [label(VB_W / 2, 18, '오차 기여도 (제곱합 기준)', 'd-label')];

  items.forEach((it, i) => {
    const y = top + i * rowH;
    kids.push(
      label(barL - 8, y + 11, it.name, 'd-label-sm', 'end'),
      s('rect', { x: barL, y, width: barR - barL, height: 14, rx: 3, class: 'd-bar-bg' }),
      s('rect', { x: barL, y, width: Math.max(1.5, ((barR - barL) * it.pct) / 100), height: 14, rx: 3, class: 'd-bar' }),
      label(barR + 6, y + 11, `${format(it.pct, 1)} %`, 'd-label-sm', 'start')
    );
  });

  kids.push(
    label(VB_W / 2, VB_H - 22, `합성 오차 ${format(totalUm, 3)} ${unit} (1σ)`, 'd-label d-accent-fill'),
    label(VB_W / 2, VB_H - 6, '가장 큰 항목부터 줄여야 총 오차가 줄어듭니다', 'd-label-sm')
  );

  return frame('오차 기여도 도해', `0 0 ${VB_W} ${VB_H}`, ...kids);
}
