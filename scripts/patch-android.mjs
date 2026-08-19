// cap sync 직후 android/ 에 이 환경에서 필요한 설정을 다시 심는다.
//
// android/ 는 .gitignore 대상이고 cap add/sync 가 덮어쓰므로,
// 손으로 고친 설정은 매번 날아간다. 그래서 스크립트로 되살린다.
//
// 심는 것 두 가지:
//   1. 경로 검사 우회 — 저장소가 "기타 소스" 아래에 있어 AGP 가 빌드를 거부한다
//   2. JDK 경로     — Capacitor 7 은 Java 21 이상을 요구한다. 시스템 JDK 17 로는
//                     "invalid source release: 21" 로 실패하므로, Android Studio 가
//                     번들한 JBR 을 명시적으로 지정한다

import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT, findJdk } from './env.mjs';

const PROPS = join(ROOT, 'android', 'gradle.properties');

const jdk = findJdk();

if (!existsSync(PROPS)) {
  console.error('android/gradle.properties 가 없습니다. 먼저 npx cap add android 를 실행하세요.');
  process.exit(1);
}

// Gradle properties 는 역슬래시를 이스케이프해야 한다.
const settings = {
  'android.overridePathCheck': 'true',
  'org.gradle.java.home': jdk.replace(/\\/g, '\\\\'),
};

let text = await readFile(PROPS, 'utf8');
const added = [];
for (const [key, value] of Object.entries(settings)) {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key.replace(/\./g, '\\.')}=.*$`, 'm');
  if (re.test(text)) text = text.replace(re, line);
  else {
    text += `${text.endsWith('\n') ? '' : '\n'}${line}\n`;
    added.push(key);
  }
}
await writeFile(PROPS, text);

console.log(`gradle.properties 정리 완료 (JDK: ${jdk})`);
if (added.length) console.log(`  추가됨: ${added.join(', ')}`);
