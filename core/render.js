// 화면 렌더러. 계산기 정의 하나당 화면 하나를 짜지 않고,
// 이 파일 한 벌이 모든 계산기를 그린다.

import { CATEGORIES, CALCULATORS, getCalculator, byCategory, searchCalculators } from './registry.js';
import { format } from './units.js';
import {
  PROFILE_FIELDS,
  listProfiles,
  getActiveProfile,
  setActiveProfile,
  saveProfile,
  createProfile,
  deleteProfile,
  listFavorites,
  toggleFavorite,
} from './profile.js';

const app = () => document.getElementById('app');

// 국문 라벨 뒤에 붙는 통용 영문 용어. 렌즈 스펙시트가 영문이라 대조하며 쓰려면 둘 다 필요하다.
const enTag = (text) => (text ? el('span', { class: 'en' }, text) : null);

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined) node.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

// 계산기별 입력값 임시 저장. 계산기를 오갔다 돌아와도 값이 유지된다.
const DRAFT_KEY = 'oc.drafts';
const readDrafts = () => {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}');
  } catch {
    return {};
  }
};
const writeDraft = (key, values) => {
  try {
    const all = readDrafts();
    all[key] = values;
    localStorage.setItem(DRAFT_KEY, JSON.stringify(all));
  } catch {
    // 저장 실패해도 계산은 계속된다.
  }
};

// 값 우선순위: 사용자가 이 계산기에서 직접 넣은 값 > 활성 프로필 > 정의된 기본값
function initialValues(calcId, mode) {
  const draft = readDrafts()[`${calcId}:${mode.id}`] || {};
  const profile = getActiveProfile();
  const values = {};
  for (const f of mode.inputs) {
    if (draft[f.key] !== undefined) values[f.key] = draft[f.key];
    else if (f.profile && profile[f.profile] !== undefined) values[f.key] = profile[f.profile];
    else values[f.key] = f.default ?? 0;
  }
  return values;
}

/* ---------- 공통 조각 ---------- */

function profileBar() {
  const p = getActiveProfile();
  return el(
    'a',
    { class: 'profile-bar', href: '#/profile' },
    el('span', { class: 'profile-bar-icon' }, '▤'),
    el(
      'div',
      { class: 'profile-bar-text' },
      el('div', { class: 'profile-bar-name' }, `활성 장비 프로필 — ${p.name}`),
      el(
        'div',
        { class: 'profile-bar-spec' },
        `${p.sensorWpx}×${p.sensorHpx} · ${p.pixelSize} µm · F${p.fNumber} · f${p.focalLength} mm · WD ${p.workingDistance} mm`
      )
    ),
    el('span', { class: 'profile-bar-action' }, '관리')
  );
}

function calcCard(calc) {
  const favs = listFavorites();
  const cat = CATEGORIES.find((c) => c.id === calc.category);
  return el(
    'div',
    { class: 'calc-card' },
    el(
      'a',
      { class: 'calc-card-main', href: `#/calc/${calc.id}` },
      el('div', { class: 'calc-card-cat' }, cat ? cat.name : ''),
      el('div', { class: 'calc-card-name' }, calc.name, enTag(calc.en)),
      el('div', { class: 'calc-card-summary' }, calc.summary)
    ),
    el(
      'button',
      {
        class: `star ${favs.includes(calc.id) ? 'on' : ''}`,
        'aria-label': '즐겨찾기',
        onclick: (e) => {
          e.preventDefault();
          toggleFavorite(calc.id);
          route();
        },
      },
      favs.includes(calc.id) ? '★' : '☆'
    )
  );
}

/* ---------- 홈 ---------- */

function renderHome() {
  const root = el('div', { class: 'view' });
  root.append(profileBar());

  const results = el('div', { class: 'card-grid' });
  const search = el('input', {
    type: 'search',
    class: 'search',
    placeholder: '계산기 검색 — "DOF", "배율", "해상도"',
    oninput: (e) => {
      const hits = searchCalculators(e.target.value);
      results.replaceChildren(
        ...(e.target.value.trim()
          ? hits.length
            ? hits.map(calcCard)
            : [el('div', { class: 'empty' }, '일치하는 계산기가 없습니다.')]
          : [])
      );
      sections.style.display = e.target.value.trim() ? 'none' : '';
    },
  });
  root.append(search, results);

  const sections = el('div');

  const favs = listFavorites().map(getCalculator).filter(Boolean);
  if (favs.length) {
    sections.append(
      el('h2', { class: 'section-title' }, '즐겨찾기'),
      el('div', { class: 'card-grid' }, favs.map(calcCard))
    );
  }

  sections.append(el('h2', { class: 'section-title' }, '대분류'));
  sections.append(
    el(
      'div',
      { class: 'card-grid' },
      CATEGORIES.map((cat) => {
        const n = byCategory(cat.id).length;
        return el(
          'a',
          { class: `cat-card ${n ? '' : 'pending'}`, href: n ? `#/c/${cat.id}` : '#/' },
          el('div', { class: 'cat-icon' }, cat.icon),
          el('div', { class: 'cat-name' }, cat.name, enTag(cat.en)),
          el('div', { class: 'cat-desc' }, cat.desc),
          el('div', { class: 'cat-count' }, n ? `${n}개` : '준비 중')
        );
      })
    )
  );
  root.append(sections);
  return root;
}

/* ---------- 대분류 ---------- */

function renderCategory(catId) {
  const cat = CATEGORIES.find((c) => c.id === catId);
  if (!cat) return renderHome();
  const list = byCategory(catId);
  return el(
    'div',
    { class: 'view' },
    el('a', { class: 'back', href: '#/' }, '← 전체'),
    el('h1', { class: 'page-title' }, cat.name),
    el('p', { class: 'page-desc' }, cat.desc),
    el(
      'div',
      { class: 'card-grid' },
      list.length ? list.map(calcCard) : el('div', { class: 'empty' }, '아직 등록된 계산기가 없습니다.')
    )
  );
}

/* ---------- 계산기 상세 ---------- */

function renderCalculator(calcId, modeId) {
  const calc = getCalculator(calcId);
  if (!calc) return renderHome();
  const mode = calc.modes.find((m) => m.id === modeId) || calc.modes[0];
  const values = initialValues(calc.id, mode);

  const outputBox = el('div', { class: 'output-grid' });
  const warnBox = el('div', { class: 'warn-box' });

  function recompute() {
    let out;
    try {
      out = mode.compute(values);
    } catch {
      out = {};
    }

    outputBox.replaceChildren(
      ...mode.outputs.map((o) =>
        el(
          'div',
          { class: `metric ${o.primary ? 'primary' : ''}` },
          el('div', { class: 'metric-label' }, o.label, enTag(o.en)),
          el(
            'div',
            { class: 'metric-value' },
            format(out[o.key], o.digits),
            o.unit ? el('span', { class: 'metric-unit' }, ' ' + o.unit) : null
          )
        )
      )
    );

    const warns = mode.warn ? mode.warn(values, out) || [] : [];
    warnBox.replaceChildren(
      ...warns.map((w) => el('div', { class: `warn warn-${w.level}` }, w.text))
    );
  }

  const inputGrid = el(
    'div',
    { class: 'input-grid' },
    mode.inputs.map((f) => {
      const input = el('input', {
        type: 'number',
        inputmode: 'decimal',
        value: values[f.key],
        step: f.step ?? 'any',
        min: f.min,
        oninput: (e) => {
          const n = parseFloat(e.target.value);
          values[f.key] = Number.isFinite(n) ? n : 0;
          writeDraft(`${calc.id}:${mode.id}`, values);
          recompute();
        },
      });
      return el(
        'label',
        { class: `field ${f.profile ? 'from-profile' : ''}` },
        el(
          'span',
          { class: 'field-label' },
          f.label,
          enTag(f.en),
          f.unit ? el('span', { class: 'field-unit' }, ` ${f.unit}`) : null,
          f.optional ? el('span', { class: 'field-opt' }, ' 선택') : null
        ),
        input
      );
    })
  );

  const favs = listFavorites();
  const header = el(
    'div',
    { class: 'calc-header' },
    el(
      'div',
      {},
      el('h1', { class: 'page-title' }, calc.name, enTag(calc.en)),
      el('p', { class: 'page-desc' }, calc.summary)
    ),
    el(
      'button',
      {
        class: `star big ${favs.includes(calc.id) ? 'on' : ''}`,
        'aria-label': '즐겨찾기',
        onclick: (e) => {
          toggleFavorite(calc.id);
          e.target.classList.toggle('on');
          e.target.textContent = e.target.classList.contains('on') ? '★' : '☆';
        },
      },
      favs.includes(calc.id) ? '★' : '☆'
    )
  );

  const modeTabs =
    calc.modes.length > 1
      ? el(
          'div',
          { class: 'tabs' },
          calc.modes.map((m) =>
            el(
              'a',
              { class: `tab ${m.id === mode.id ? 'on' : ''}`, href: `#/calc/${calc.id}/${m.id}` },
              m.name,
              enTag(m.en)
            )
          )
        )
      : null;

  const saveBtn = el(
    'button',
    {
      class: 'ghost-btn',
      onclick: () => {
        const p = { ...getActiveProfile() };
        let n = 0;
        for (const f of mode.inputs) {
          if (f.profile) {
            p[f.profile] = values[f.key];
            n++;
          }
        }
        saveProfile(p);
        saveBtn.textContent = `프로필에 ${n}개 항목 저장됨`;
        setTimeout(() => (saveBtn.textContent = '현재 값을 프로필에 저장'), 1800);
      },
    },
    '현재 값을 프로필에 저장'
  );

  const related = (calc.related || []).map(getCalculator).filter(Boolean);

  recompute();

  return el(
    'div',
    { class: 'view' },
    el('a', { class: 'back', href: `#/c/${calc.category}` }, '← ' + (CATEGORIES.find((c) => c.id === calc.category)?.name || '전체')),
    header,
    modeTabs,
    el(
      'div',
      { class: 'calc-body' },
      el(
        'section',
        { class: 'panel' },
        el('h2', { class: 'panel-title' }, '입력'),
        inputGrid,
        el('div', { class: 'panel-foot' }, saveBtn)
      ),
      el(
        'section',
        {},
        outputBox,
        warnBox,
        mode.formula ? el('div', { class: 'formula' }, mode.formula) : null,
        related.length
          ? el(
              'div',
              { class: 'related' },
              el('span', { class: 'related-label' }, '이어서 확인'),
              related.map((r) => el('a', { class: 'chip', href: `#/calc/${r.id}` }, r.name))
            )
          : null
      )
    )
  );
}

/* ---------- 프로필 관리 ---------- */

function renderProfile() {
  const profiles = listProfiles();
  const active = getActiveProfile();
  const draft = { ...active };

  const fields = el(
    'div',
    { class: 'input-grid' },
    PROFILE_FIELDS.map((f) =>
      el(
        'label',
        { class: 'field' },
        el(
          'span',
          { class: 'field-label' },
          f.label,
          enTag(f.en),
          f.unit ? el('span', { class: 'field-unit' }, ` ${f.unit}`) : null
        ),
        el('input', {
          type: 'number',
          inputmode: 'decimal',
          value: draft[f.key],
          step: 'any',
          oninput: (e) => {
            const n = parseFloat(e.target.value);
            draft[f.key] = Number.isFinite(n) ? n : 0;
          },
        })
      )
    )
  );

  const nameInput = el('input', {
    type: 'text',
    value: draft.name,
    oninput: (e) => (draft.name = e.target.value),
  });

  return el(
    'div',
    { class: 'view' },
    el('a', { class: 'back', href: '#/' }, '← 전체'),
    el('h1', { class: 'page-title' }, '장비 프로필'),
    el('p', { class: 'page-desc' }, '여기 저장한 값이 모든 계산기의 기본값으로 들어갑니다.'),
    el(
      'div',
      { class: 'tabs' },
      profiles.map((p) =>
        el(
          'button',
          {
            class: `tab ${p.id === active.id ? 'on' : ''}`,
            onclick: () => {
              setActiveProfile(p.id);
              route();
            },
          },
          p.name
        )
      ),
      el(
        'button',
        {
          class: 'tab',
          onclick: () => {
            createProfile(`프로필 ${profiles.length + 1}`);
            route();
          },
        },
        '+ 추가'
      )
    ),
    el(
      'section',
      { class: 'panel' },
      el('label', { class: 'field' }, el('span', { class: 'field-label' }, '프로필 이름'), nameInput),
      fields,
      el(
        'div',
        { class: 'panel-foot' },
        el(
          'button',
          {
            class: 'ghost-btn',
            onclick: (e) => {
              saveProfile(draft);
              e.target.textContent = '저장됨';
              setTimeout(() => (e.target.textContent = '저장'), 1500);
            },
          },
          '저장'
        ),
        profiles.length > 1
          ? el(
              'button',
              {
                class: 'ghost-btn danger',
                onclick: () => {
                  deleteProfile(active.id);
                  route();
                },
              },
              '이 프로필 삭제'
            )
          : null
      )
    )
  );
}

/* ---------- 라우팅 ---------- */

export function route() {
  const hash = location.hash.replace(/^#\/?/, '');
  const [seg, a, b] = hash.split('/');
  let view;
  if (seg === 'c') view = renderCategory(a);
  else if (seg === 'calc') view = renderCalculator(a, b);
  else if (seg === 'profile') view = renderProfile();
  else view = renderHome();
  app().replaceChildren(view);
  window.scrollTo(0, 0);
}

export function start() {
  window.addEventListener('hashchange', route);
  route();
}
