// 계산기 레지스트리.
// 계산기는 "화면"이 아니라 "정의 객체"다. 여기에 하나 등록하면
// 홈·대분류·검색·즐겨찾기·상세 화면이 모두 자동으로 따라온다.

import { lensCalculators } from '../calc/lens.js';

export const CATEGORIES = [
  { id: 'lens', name: '렌즈', en: 'Lens', icon: '◎', desc: 'Lens Selection · DOF · F-number · Diffraction' },
  { id: 'camera', name: '카메라 · 센서', en: 'Camera · Sensor', icon: '▣', desc: 'Sensor Size · Bandwidth · Motion Blur · Line Rate' },
  { id: 'lighting', name: '조명', en: 'Lighting', icon: '✦', desc: 'Illuminance · Inverse Square · Exposure · Strobe' },
  { id: 'geometry', name: '기하 · 정렬', en: 'Geometry', icon: '⊾', desc: 'AOV · Pixel↔mm · Perspective Error · Telecentric' },
  { id: 'wave', name: '파동 · 재료', en: 'Wave · Material', icon: '∿', desc: "Snell's Law · Critical Angle · Index · Grating" },
];

// 모드에 속하는 필드. 새 필드를 추가하면 여기에도 넣어야 단일 모드 계산기에 전달된다.
const MODE_KEYS = ['formula', 'inputs', 'outputs', 'compute', 'warn', 'diagram'];

// 모드가 없는 계산기는 단일 모드로 감싼다. 렌더러는 항상 modes 만 보면 된다.
function normalize(def) {
  if (def.modes) return def;
  const mode = { id: 'default', name: '' };
  const rest = {};
  for (const [key, value] of Object.entries(def)) {
    if (MODE_KEYS.includes(key)) mode[key] = value;
    else rest[key] = value;
  }
  return { ...rest, modes: [mode] };
}

const RAW = [...lensCalculators];

export const CALCULATORS = RAW.map(normalize);

export const getCalculator = (id) => CALCULATORS.find((c) => c.id === id);

export const byCategory = (categoryId) => CALCULATORS.filter((c) => c.category === categoryId);

export function categoryCount(categoryId) {
  return byCategory(categoryId).length;
}

// 이름·요약·태그·모드명을 하나의 문자열로 합쳐 부분 일치로 찾는다.
// 계산기가 수십 개 규모라 인덱스를 따로 만들 필요는 없다.
export function searchCalculators(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return CALCULATORS.filter((c) => {
    const cat = CATEGORIES.find((cat) => cat.id === c.category);
    const hay = [
      c.name,
      c.en || '',
      c.summary,
      ...(c.tags || []),
      ...c.modes.map((m) => `${m.name} ${m.en || ''}`),
      // 입력·출력 라벨까지 검색 대상에 넣는다. "Airy" 나 "CoC" 로도 찾히게 하려는 것이다.
      ...c.modes.flatMap((m) => [...m.inputs, ...m.outputs].map((f) => `${f.label} ${f.en || ''}`)),
      cat ? `${cat.name} ${cat.en || ''}` : '',
    ]
      .join(' ')
      .toLowerCase();
    return hay.includes(q);
  });
}
