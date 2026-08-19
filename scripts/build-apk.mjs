// Gradle 로 APK 를 빌드한다.
//   node scripts/build-apk.mjs [debug|release]
//
// package.json 에서 "cd android && gradlew.bat" 로 엮으면 cmd 와 sh 에서 동작이 갈린다
// (sh 는 현재 디렉터리를 실행 경로로 잡지 않는다). Node 에서 직접 띄워 셸 차이를 없앤다.

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, findJdk, findAndroidSdk, installedPlatforms } from './env.mjs';

const variant = process.argv[2] === 'release' ? 'release' : 'debug';
const task = variant === 'release' ? 'assembleRelease' : 'assembleDebug';

const ANDROID = join(ROOT, 'android');
const gradlew = join(ANDROID, 'gradlew.bat');

if (!existsSync(gradlew)) {
  console.error('android/ 가 없습니다. 먼저 npm run android:init 을 실행하세요.');
  process.exit(1);
}

const jdk = findJdk();
const sdk = findAndroidSdk();

console.log(`JDK          ${jdk}`);
console.log(`Android SDK  ${sdk}`);
console.log(`platforms    ${installedPlatforms(sdk).join(', ') || '(없음)'}`);
console.log(`task         ${task}\n`);

// Node 20 부터 .bat/.cmd 는 shell 없이 spawn 하면 EINVAL 로 거부된다(CVE-2024-27980).
// 셸을 거치므로 공백이 든 경로는 직접 따옴표로 감싼다.
const result = spawnSync(`"${gradlew}"`, [task], {
  cwd: ANDROID,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, JAVA_HOME: jdk, ANDROID_HOME: sdk, ANDROID_SDK_ROOT: sdk },
});

if (result.error) {
  console.error(`Gradle 실행 실패: ${result.error.message}`);
  process.exit(1);
}
process.exit(result.status ?? 1);
