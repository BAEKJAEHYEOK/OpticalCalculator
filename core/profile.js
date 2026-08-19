// 장비 프로필. 카메라/렌즈 스펙은 여러 계산기에서 공통으로 쓰이므로
// 한 곳에 저장해 두고 각 계산기가 기본값으로 끌어다 쓴다.

const STORE_KEY = 'oc.profiles';
const ACTIVE_KEY = 'oc.activeProfile';

// 프로필 필드 정의. 계산기 입력의 profile 키가 여기를 가리킨다.
export const PROFILE_FIELDS = [
  { key: 'sensorWpx', label: '가로 화소수', en: 'Width', unit: 'px' },
  { key: 'sensorHpx', label: '세로 화소수', en: 'Height', unit: 'px' },
  { key: 'pixelSize', label: '픽셀 크기', en: 'Pixel Size', unit: 'µm' },
  { key: 'fNumber', label: 'F수', en: 'F-number', unit: '' },
  { key: 'focalLength', label: '초점거리', en: 'Focal Length', unit: 'mm' },
  { key: 'workingDistance', label: '작동거리', en: 'WD', unit: 'mm' },
];

const DEFAULT_PROFILE = {
  id: 'default',
  name: '기본 프로필',
  sensorWpx: 5120,
  sensorHpx: 5120,
  pixelSize: 4.5,
  fNumber: 5.6,
  focalLength: 50,
  workingDistance: 300,
};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 사파리 프라이빗 모드 등에서 저장 실패. 계산 자체는 계속 동작해야 하므로 무시한다.
  }
}

export function listProfiles() {
  const list = read(STORE_KEY, null);
  if (!Array.isArray(list) || list.length === 0) return [{ ...DEFAULT_PROFILE }];
  return list;
}

export function getActiveProfile() {
  const list = listProfiles();
  const id = read(ACTIVE_KEY, null);
  return list.find((p) => p.id === id) || list[0];
}

export function setActiveProfile(id) {
  write(ACTIVE_KEY, id);
}

export function saveProfile(profile) {
  const list = listProfiles();
  const idx = list.findIndex((p) => p.id === profile.id);
  if (idx >= 0) list[idx] = profile;
  else list.push(profile);
  write(STORE_KEY, list);
}

export function createProfile(name) {
  const profile = { ...getActiveProfile(), id: `p${Date.now()}`, name };
  saveProfile(profile);
  setActiveProfile(profile.id);
  return profile;
}

export function deleteProfile(id) {
  const list = listProfiles().filter((p) => p.id !== id);
  write(STORE_KEY, list.length ? list : [{ ...DEFAULT_PROFILE }]);
  if (read(ACTIVE_KEY, null) === id) setActiveProfile(listProfiles()[0].id);
}

// 즐겨찾기는 프로필과 무관한 사용자 취향이라 별도 키에 둔다.
const FAV_KEY = 'oc.favorites';

export const listFavorites = () => read(FAV_KEY, []);

export function toggleFavorite(id) {
  const favs = listFavorites();
  const next = favs.includes(id) ? favs.filter((f) => f !== id) : [...favs, id];
  write(FAV_KEY, next);
  return next;
}
