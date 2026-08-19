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

    dimH(lensX, objectX, axisY + objectHalf + 48, `작동거리 Working Distance  ${format(wd, 1)} mm`, {
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
