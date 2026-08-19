// 계산 결과 도해.
// 용어가 그림의 어느 구간을 가리키는지 보여주고, 그 구간에 계산된 값을 함께 적는다.
// 값 없이 도형만 그리면 의미가 없으므로 라벨은 항상 "용어 + 수치 + 단위" 형태로 쓴다.

import { format } from './units.js';

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
export function fovRect(fovW, fovH, { targetW, targetH, axis, note } = {}) {
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
    dimH(x0, x0 + w, y0 - 14, `FOV (W)  ${format(fovW, 1)} mm`, { accent: true }),
    dimV(y0, y0 + h, x0 - 16, `FOV (H)  ${format(fovH, 1)} mm`, { accent: true }),
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

// 가로 위치는 WD 에 대한 f 의 비율만 반영한다. 센서·대상 크기까지 실제 축척으로
// 그리면 납작해져 읽히지 않으므로 세로는 개략적으로 잡는다.
export function opticalLayout({ wd, f, fovH, sensorH, m }) {
  const VB_W = 380;
  const VB_H = 215;
  const axisY = 92;
  const sensorX = 46;
  const lensX = 150;
  const objectX = 340;

  const span = objectX - lensX;
  const fPx = Math.max(20, Math.min(span * 0.8, (f / wd) * span));

  const sensorHalf = 26;
  const objectHalf = 46;

  const kids = [
    // 광축
    s('line', { x1: sensorX, y1: axisY, x2: objectX, y2: axisY, class: 'd-axis' }),

    // 대상에서 나온 광선이 렌즈를 지나 센서에 거꾸로 맺힌다.
    s('line', { x1: objectX, y1: axisY - objectHalf, x2: lensX, y2: axisY - objectHalf * 0.45, class: 'd-ray' }),
    s('line', { x1: lensX, y1: axisY - objectHalf * 0.45, x2: sensorX, y2: axisY + sensorHalf, class: 'd-ray' }),
    s('line', { x1: objectX, y1: axisY + objectHalf, x2: lensX, y2: axisY + objectHalf * 0.45, class: 'd-ray' }),
    s('line', { x1: lensX, y1: axisY + objectHalf * 0.45, x2: sensorX, y2: axisY - sensorHalf, class: 'd-ray' }),

    // 센서
    s('rect', { x: sensorX - 5, y: axisY - sensorHalf, width: 10, height: sensorHalf * 2, class: 'd-sensor' }),
    label(sensorX, axisY - sensorHalf - 10, '센서', 'd-label-sm'),
    label(sensorX, axisY + sensorHalf + 18, `${format(sensorH, 2)} mm`, 'd-label-sm'),

    // 렌즈
    s('ellipse', { cx: lensX, cy: axisY, rx: 7, ry: 34, class: 'd-lens' }),
    label(lensX, axisY - 44, '렌즈', 'd-label-sm'),

    // 대상
    s('rect', { x: objectX - 5, y: axisY - objectHalf, width: 10, height: objectHalf * 2, class: 'd-object' }),
    label(objectX, axisY - objectHalf - 10, '대상', 'd-label-sm'),

    // 초점거리는 렌즈에서 시작하는 구간으로 표시한다.
    dimH(lensX, lensX + fPx, axisY - 62, `f  ${format(f, 2)} mm`, { accent: true }),

    // 작동거리는 렌즈에서 대상까지
    dimH(lensX, objectX, axisY + objectHalf + 34, `WD  ${format(wd, 1)} mm`, { below: true }),

    label(VB_W / 2, VB_H - 8, `배율 ${format(m, 4)} ×  ·  시야 세로 ${format(fovH, 1)} mm  ·  개략도(축척 아님)`, 'd-label-sm'),
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
