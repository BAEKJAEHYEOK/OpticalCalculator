// 빌드된 APK 를 찾기 쉬운 이름으로 dist/ 에 복사한다.
// Gradle 산출물은 android/app/build/outputs/apk/... 깊숙이 묻혀 있어
// 동료에게 전달할 때마다 경로를 뒤져야 한다.

import { copyFile, mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');

const { version } = JSON.parse(
  await import('node:fs/promises').then((fs) => fs.readFile(join(ROOT, 'package.json'), 'utf8'))
);

const SOURCES = [
  ['debug', join(ROOT, 'android/app/build/outputs/apk/debug/app-debug.apk')],
  ['release', join(ROOT, 'android/app/build/outputs/apk/release/app-release.apk')],
  ['release', join(ROOT, 'android/app/build/outputs/apk/release/app-release-unsigned.apk')],
];

await mkdir(DIST, { recursive: true });

let found = 0;
for (const [kind, src] of SOURCES) {
  if (!existsSync(src)) continue;
  const dest = join(DIST, `OpticalCalculator-${version}-${kind}.apk`);
  await copyFile(src, dest);
  const { size } = await stat(dest);
  console.log(`dist/OpticalCalculator-${version}-${kind}.apk  ${(size / 1024 / 1024).toFixed(2)} MB`);
  found++;
}

if (!found) {
  console.error('APK 를 찾지 못했습니다. Gradle 빌드가 성공했는지 확인하세요.');
  process.exit(1);
}
