// 안드로이드 하드웨어 뒤로가기 처리.
//
// 기본 동작은 웹뷰 히스토리를 따라가다가 더 갈 곳이 없으면 앱을 종료한다.
// 계산기 화면에서 바로 앱이 꺼지는 일이 없도록, 화면 계층을 따라
// 계산기 → 대분류 → 홈 순으로 올라가고 홈에서만 종료를 묻는다.

import { getCalculator } from './registry.js';

// 지금 화면의 상위 화면. 홈이면 null 을 돌려준다.
export function parentHash(hash) {
  const [seg, a] = hash.replace(/^#\/?/, '').split('/');
  if (seg === 'calc') {
    const calc = getCalculator(a);
    return calc ? `#/c/${calc.category}` : '#/';
  }
  if (seg === 'c' || seg === 'profile') return '#/';
  return null;
}

let openDialog = null;

// 열려 있는 대화상자를 닫는다. 닫을 것이 있었으면 true.
export function closeDialog() {
  if (!openDialog) return false;
  openDialog.remove();
  openDialog = null;
  return true;
}

export function confirmExit(onConfirm) {
  closeDialog();

  const button = (text, cls, onClick) => {
    const b = document.createElement('button');
    b.className = cls;
    b.textContent = text;
    b.addEventListener('click', onClick);
    return b;
  };

  const box = document.createElement('div');
  box.className = 'dialog-box';
  box.setAttribute('role', 'alertdialog');
  box.setAttribute('aria-labelledby', 'dialog-title');

  const title = document.createElement('p');
  title.className = 'dialog-title';
  title.id = 'dialog-title';
  title.textContent = '앱을 종료하겠습니까?';

  const actions = document.createElement('div');
  actions.className = 'dialog-actions';
  actions.append(
    button('취소', 'ghost-btn', () => closeDialog()),
    button('종료', 'ghost-btn danger', () => {
      closeDialog();
      onConfirm();
    })
  );

  box.append(title, actions);

  const backdrop = document.createElement('div');
  backdrop.className = 'dialog-backdrop';
  backdrop.addEventListener('click', (e) => {
    // 바깥을 눌러도 닫힌다. 상자 안을 누른 것은 무시한다.
    if (e.target === backdrop) closeDialog();
  });
  backdrop.append(box);

  document.body.append(backdrop);
  openDialog = backdrop;
  box.querySelector('.ghost-btn').focus();
}

export function start() {
  // Capacitor 가 없는 웹에서는 브라우저 뒤로가기가 그대로 동작하므로 두면 된다.
  const capApp = window.Capacitor?.Plugins?.App;
  if (!capApp) return;

  capApp.addListener('backButton', () => {
    if (closeDialog()) return;

    const parent = parentHash(location.hash);
    if (parent !== null) {
      location.hash = parent;
      return;
    }
    confirmExit(() => capApp.exitApp());
  });
}
