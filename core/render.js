// 화면 렌더러. 계산기 정의 하나당 화면 하나를 짜지 않고,
// 이 파일 한 벌이 모든 계산기를 그린다.

import { CATEGORIES, CALCULATORS, getCalculator, byCategory, searchCalculators } from './registry.js';
import { TERMS, getTerm, annotate, searchTerms } from './glossary.js';
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

// 아는 용어에 점선 밑줄을 그어 누를 수 있게 만든다. 없으면 원래 글자 그대로 둔다.
// 계산 중에 모르는 용어를 만나면 그 자리에서 뜻을 볼 수 있어야 한다.
const withTerms = (text) => annotate(text, showTermSheet) || text;

// 라벨은 세 줄로 쌓는다.
//   영문 + 단위 (작게) / 국문 용어 (강조) / 부연 설명 (작게)
// 한 줄에 이어 붙이면 좁은 칸에서 아무 데서나 접혀 읽기 어렵다.
// 줄을 나누면 각 줄이 짧아 접힐 일 자체가 줄어든다.
function stackedLabel({ en, unit, label, hint, optional }, prefix) {
  const top = [];
  if (en) top.push(en);
  if (unit) top.push(el('span', { class: `${prefix}-unit` }, en ? ` ${unit}` : unit));

  return [
    top.length ? el('span', { class: `${prefix}-en` }, ...top) : null,
    el(
      'span',
      { class: `${prefix}-label` },
      withTerms(label),
      optional ? el('span', { class: 'field-opt' }, ' 선택') : null
    ),
    hint ? el('span', { class: 'field-hint' }, hint) : null,
  ];
}

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

// 값을 이리저리 바꿔보다 원래대로 못 돌아가는 상황을 막는다.
const clearDraft = (key) => {
  try {
    const all = readDrafts();
    delete all[key];
    localStorage.setItem(DRAFT_KEY, JSON.stringify(all));
  } catch {
    // 무시. 어차피 화면은 기본값으로 다시 그린다.
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

/* ---------- 검색창 ---------- */

const ICON_SEARCH =
  '<svg viewBox="0 0 20 20" aria-hidden="true">' +
  '<circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" stroke-width="1.8"/>' +
  '<line x1="12.7" y1="12.7" x2="17.5" y2="17.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' +
  '</svg>';

const ICON_CLEAR =
  '<svg viewBox="0 0 20 20" aria-hidden="true">' +
  '<line x1="5.5" y1="5.5" x2="14.5" y2="14.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' +
  '<line x1="14.5" y1="5.5" x2="5.5" y2="14.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' +
  '</svg>';

// 검색은 입력하는 대로 즉시 걸리므로 버튼이 검색을 "실행" 하지는 않는다.
// 대신 여기가 검색창임을 알리는 표시가 되고, 입력이 있으면 지우기로 바뀐다.
function searchBox(placeholder, onSearch) {
  const input = el('input', {
    type: 'search',
    class: 'search',
    placeholder,
    oninput: () => sync(),
  });

  const button = el('button', {
    class: 'search-btn',
    type: 'button',
    'aria-label': '검색',
    html: ICON_SEARCH,
    onclick: () => {
      if (input.value) input.value = '';
      input.focus();
      sync();
    },
  });

  function sync() {
    const filled = input.value.trim() !== '';
    button.innerHTML = filled ? ICON_CLEAR : ICON_SEARCH;
    button.setAttribute('aria-label', filled ? '검색어 지우기' : '검색');
    button.classList.toggle('on', filled);
    onSearch(input.value);
  }

  return el('div', { class: 'search-row' }, input, button);
}

/* ---------- 용어 팝업 ---------- */

let termSheet = null;

export function closeTermSheet() {
  if (!termSheet) return false;
  termSheet.remove();
  termSheet = null;
  return true;
}

// 용어를 누르면 뜻을 바로 띄운다. 화면을 떠나지 않으므로 계산하던 값이 그대로 남는다.
function showTermSheet(entry) {
  closeTermSheet();

  const calc = entry.calc ? getCalculator(entry.calc) : null;
  const actions = el(
    'div',
    { class: 'sheet-actions' },
    el('a', { class: 'ghost-btn', href: `#/terms/${entry.id}`, onclick: () => closeTermSheet() }, '용어 설명 열기'),
    calc
      ? el('a', { class: 'ghost-btn', href: `#/calc/${calc.id}`, onclick: () => closeTermSheet() }, `${calc.name} 계산기`)
      : null,
    el('button', { class: 'ghost-btn', onclick: () => closeTermSheet() }, '닫기')
  );

  const sheet = el(
    'div',
    { class: 'sheet' },
    el('div', { class: 'sheet-term' }, entry.term, enTag(entry.en)),
    el('p', { class: 'sheet-short' }, entry.short),
    actions
  );

  const backdrop = el('div', {
    class: 'sheet-backdrop',
    onclick: (e) => {
      if (e.target === backdrop) closeTermSheet();
    },
  });
  backdrop.append(sheet);
  document.body.append(backdrop);
  termSheet = backdrop;
}

/* ---------- 용어 설명 ---------- */

function termCard(entry) {
  const cat = CATEGORIES.find((c) => c.id === entry.category);
  return el(
    'a',
    { class: 'term-card', href: `#/terms/${entry.id}` },
    el('div', { class: 'term-card-head' }, el('span', { class: 'term-card-name' }, entry.term), enTag(entry.en)),
    el('div', { class: 'term-card-short' }, entry.short),
    cat ? el('div', { class: 'term-card-cat' }, cat.name) : null
  );
}

function renderTerms() {
  const root = el('div', { class: 'view' });
  root.append(
    el('a', { class: 'back', href: '#/' }, '← 전체'),
    el('h1', { class: 'page-title' }, '용어 설명', enTag('Glossary')),
    el('p', { class: 'page-desc' }, `광학·카메라·엔코더·정렬·공정능력 용어 ${TERMS.length}개. 계산기 화면에서 점선 밑줄이 있는 용어를 누르면 바로 열립니다.`)
  );

  const list = el('div', { class: 'card-grid' }, TERMS.map(termCard));
  const search = searchBox('용어 검색 — "DOF", "분주비", "회절"', (raw) => {
    const q = raw.trim();
    const hits = q ? searchTerms(q) : TERMS;
    list.replaceChildren(
      ...(hits.length ? hits.map(termCard) : [el('div', { class: 'empty' }, '일치하는 용어가 없습니다.')])
    );
  });

  root.append(search, list);
  return root;
}

function renderTermDetail(id) {
  const entry = getTerm(id);
  if (!entry) return renderTerms();

  const cat = CATEGORIES.find((c) => c.id === entry.category);
  const calc = entry.calc ? getCalculator(entry.calc) : null;
  const related = (entry.related || []).map(getTerm).filter(Boolean);

  return el(
    'div',
    { class: 'view' },
    el('a', { class: 'back', href: '#/terms' }, '← 용어 설명'),
    el('h1', { class: 'page-title' }, entry.term, enTag(entry.en)),
    el('p', { class: 'page-desc' }, cat ? cat.name : ''),
    el(
      'section',
      { class: 'panel' },
      el('p', { class: 'term-short' }, entry.short),
      el('p', { class: 'term-body' }, withTerms(entry.body))
    ),
    calc
      ? el(
          'div',
          { class: 'related' },
          el('span', { class: 'related-label' }, '계산해 보기'),
          el('a', { class: 'chip', href: `#/calc/${calc.id}` }, calc.name)
        )
      : null,
    related.length
      ? el(
          'div',
          { class: 'related' },
          el('span', { class: 'related-label' }, '같이 보면 좋은 용어'),
          related.map((r) => el('a', { class: 'chip', href: `#/terms/${r.id}` }, r.term))
        )
      : null
  );
}

/* ---------- 홈 ---------- */

function renderHome() {
  const root = el('div', { class: 'view' });
  root.append(profileBar());

  const results = el('div');
  const search = searchBox('계산기 · 용어 검색 — "DOF", "배율", "분주비"', (raw) => {
    {
      const q = raw.trim();
      sections.style.display = q ? 'none' : '';
      if (!q) return results.replaceChildren();

      // 계산기와 용어를 함께 찾는다. 뜻만 알고 싶을 때도 같은 칸에서 해결된다.
      const calcs = searchCalculators(q);
      const terms = searchTerms(q);
      const blocks = [];
      if (calcs.length) {
        blocks.push(el('h2', { class: 'section-title' }, '계산기'), el('div', { class: 'card-grid' }, calcs.map(calcCard)));
      }
      if (terms.length) {
        blocks.push(el('h2', { class: 'section-title' }, '용어'), el('div', { class: 'card-grid' }, terms.map(termCard)));
      }
      results.replaceChildren(...(blocks.length ? blocks : [el('div', { class: 'empty' }, '일치하는 항목이 없습니다.')]));
    }
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

  sections.append(
    el('h2', { class: 'section-title' }, '용어'),
    el(
      'a',
      { class: 'glossary-card', href: '#/terms' },
      el('span', { class: 'glossary-icon' }, '＃'),
      el(
        'span',
        { class: 'glossary-text' },
        el('span', { class: 'glossary-name' }, '용어 설명', enTag('Glossary')),
        el('span', { class: 'glossary-desc' }, `${TERMS.length}개 용어 · 계산기에서 점선 밑줄을 누르면 바로 열립니다`)
      )
    )
  );

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
  const diagramBox = el('div', { class: 'diagram-box' });
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
          // 입력 칸과 같은 순서로 쌓는다 — 영문, 국문 용어, 값.
          o.en ? el('div', { class: 'metric-en' }, o.en) : null,
          el('div', { class: 'metric-label' }, withTerms(o.label)),
          el(
            'div',
            { class: 'metric-value' },
            format(out[o.key], o.digits),
            o.unit ? el('span', { class: 'metric-unit' }, ' ' + o.unit) : null
          )
        )
      )
    );

    // 도해는 입력이 잘못돼도 화면 전체를 죽이면 안 된다. 못 그리면 비워 둔다.
    let figures = [];
    try {
      figures = mode.diagram ? mode.diagram(values, out) || [] : [];
    } catch {
      figures = [];
    }
    diagramBox.replaceChildren(...figures.filter(Boolean));

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
      // 라벨과 설명을 한 덩어리로 묶어 입력 상자 위에 둔다.
      // 이 덩어리가 남는 높이를 흡수하므로, 라벨이 두 줄로 접히거나 설명이 붙어도
      // 같은 행의 입력 상자들이 항상 같은 높이에 정렬된다.
      return el(
        'label',
        { class: `field ${f.profile ? 'from-profile' : ''}` },
        el(
          'span',
          { class: 'field-head' },
          // 이름만으로 헷갈리는 항목에는 hint 로 한 줄 설명이 함께 붙는다.
          stackedLabel(f, 'field')
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

  const resetBtn = el(
    'button',
    {
      class: 'ghost-btn',
      onclick: () => {
        clearDraft(`${calc.id}:${mode.id}`);
        route();
      },
    },
    '기본값으로 되돌리기'
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
        el('div', { class: 'panel-foot' }, saveBtn, resetBtn)
      ),
      el(
        'section',
        {},
        outputBox,
        diagramBox,
        warnBox,
        // 수식은 여러 줄로 나눠 적는다. 한 줄에 쉼표로 이어 붙이면 읽히지 않는다.
        mode.formula
          ? el(
              'div',
              { class: 'formula' },
              (Array.isArray(mode.formula) ? mode.formula : [mode.formula]).map((text) =>
                el('div', { class: 'formula-line' }, withTerms(text))
              )
            )
          : null,
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
          { class: 'field-head' },
          stackedLabel(f, 'field')
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
  else if (seg === 'terms') view = a ? renderTermDetail(a) : renderTerms();
  else if (seg === 'profile') view = renderProfile();
  else view = renderHome();
  closeTermSheet();
  app().replaceChildren(view);
  window.scrollTo(0, 0);
}

export function start() {
  window.addEventListener('hashchange', route);
  route();
}
