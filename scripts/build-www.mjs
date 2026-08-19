// APK 에 넣을 웹 자산을 www/ 로 모은다.
//   npm run build
//
// 저장소 루트를 그대로 webDir 로 쓰면 node_modules 와 android 까지 APK 에 딸려 들어간다.
// 그래서 필요한 것만 골라 복사한다.

import { cp, rm, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WWW = join(ROOT, 'www');

// APK 안에서는 파일이 이미 단말에 있으므로 서비스 워커가 필요 없다.
// sw.js 와 manifest.json 은 웹 배포 전용이라 제외한다.
const ENTRIES = ['index.html', 'style.css', 'core', 'calc'];
const ICONS = ['icon-192.png', 'icon-512.png', 'icon-512-maskable.png', 'icon.svg'];

await rm(WWW, { recursive: true, force: true });
await mkdir(join(WWW, 'pwa'), { recursive: true });

for (const entry of ENTRIES) {
  await cp(join(ROOT, entry), join(WWW, entry), { recursive: true });
}
for (const icon of ICONS) {
  await cp(join(ROOT, 'pwa', icon), join(WWW, 'pwa', icon));
}

// 매니페스트 링크와 서비스 워커 등록 스크립트를 걷어낸다.
// 남겨두면 앱 실행 시 404 를 물고 콘솔에 오류가 찍힌다.
const htmlPath = join(WWW, 'index.html');
let html = await readFile(htmlPath, 'utf8');
html = html
  .replace(/^.*rel="manifest".*\n/m, '')
  .replace(/\n\s*\/\/ 서비스 워커는[\s\S]*?\n\s*\}\n/, '\n');
await writeFile(htmlPath, html);

if (html.includes('serviceWorker')) {
  console.error('경고: 서비스 워커 등록 코드가 남아 있습니다. build-www.mjs 의 치환 규칙을 확인하세요.');
  process.exit(1);
}

console.log('www/ 생성 완료 — index.html, style.css, core/, calc/, pwa/ 아이콘');
