// 빌드에 필요한 도구 경로를 찾는다.
// PATH 나 환경변수 설정에 기대지 않는다 — 새 PC 에서 클론하자마자 돌아가야 한다.

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// 쓸 수 있는 JDK 범위가 위아래로 막혀 있다.
//   아래 - Capacitor 7 이 Java 21 이상을 요구한다. 17 이면 "invalid source release: 21"
//   위   - Gradle 8.11 이 Java 24 이상의 클래스 파일을 읽지 못한다.
//          Android Studio 번들 JBR(25)을 쓰면 "Unsupported class file major version 69"
// 그래서 21~23 을 찾아 쓴다.
const MIN_MAJOR = 21;
const MAX_MAJOR = 23;

// JDK 홈의 release 파일에 JAVA_VERSION 이 적혀 있다.
// java -version 은 stdout 이 아니라 stderr 로 나와 잡기 번거로우므로 파일을 읽는다.
function javaMajor(home) {
  try {
    const text = readFileSync(join(home, 'release'), 'utf8');
    const m = text.match(/JAVA_VERSION="?(\d+)/);
    if (m) return Number(m[1]);
  } catch {
    // release 파일이 없으면 아래에서 실행해 확인한다.
  }
  try {
    const res = spawnSync(join(home, 'bin', 'java.exe'), ['-version'], { encoding: 'utf8' });
    const m = `${res.stdout || ''}${res.stderr || ''}`.match(/version "(\d+)/);
    return m ? Number(m[1]) : null;
  } catch {
    return null;
  }
}

// 설치 위치가 버전마다 달라 고정 경로로는 못 찾는다. 상위 폴더를 훑는다.
function candidateHomes() {
  const roots = [
    'C:\\Program Files\\Microsoft',
    'C:\\Program Files\\Eclipse Adoptium',
    'C:\\Program Files\\Java',
    'C:\\Program Files\\Amazon Corretto',
  ];
  const found = [];
  for (const root of roots) {
    try {
      for (const name of readdirSync(root)) {
        if (/^jdk/i.test(name)) found.push(join(root, name));
      }
    } catch {
      // 없는 폴더는 건너뛴다.
    }
  }
  return found;
}

export function findJdk() {
  const explicit = [process.env.CAPACITOR_JAVA_HOME, process.env.JAVA_HOME].filter(Boolean);
  const all = [...explicit, ...candidateHomes(), 'C:\\Program Files\\Android\\Android Studio\\jbr'];

  const usable = [];
  for (const home of all) {
    if (!existsSync(join(home, 'bin', 'javac.exe'))) continue;
    const major = javaMajor(home);
    if (major !== null && major >= MIN_MAJOR && major <= MAX_MAJOR) usable.push({ home, major });
  }

  if (!usable.length) {
    const seen = all
      .filter((h) => existsSync(join(h, 'bin', 'javac.exe')))
      .map((h) => `  ${h} → Java ${javaMajor(h) ?? '?'}`)
      .join('\n');
    throw new Error(
      `Java ${MIN_MAJOR}~${MAX_MAJOR} 을 찾지 못했습니다.\n` +
        (seen ? `찾은 JDK:\n${seen}\n\n` : '') +
        'winget install --id Microsoft.OpenJDK.21 -e\n' +
        '로 설치하거나 CAPACITOR_JAVA_HOME 으로 경로를 지정하세요.'
    );
  }

  // 여러 개면 낮은 쪽이 안전하다.
  usable.sort((a, b) => a.major - b.major);
  return usable[0].home;
}

export function findAndroidSdk() {
  const candidates = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk'),
  ].filter(Boolean);

  const found = candidates.find((p) => existsSync(join(p, 'platforms')));
  if (!found) {
    throw new Error(
      'Android SDK 를 찾지 못했습니다.\n' +
        'Android Studio 첫 실행 마법사를 Standard 로 완료했는지 확인하세요.'
    );
  }
  return found;
}

// 설치된 플랫폼 목록. compileSdk 와 맞지 않으면 Gradle 이 자동으로 받아온다.
export function installedPlatforms(sdk) {
  try {
    return readdirSync(join(sdk, 'platforms'));
  } catch {
    return [];
  }
}
