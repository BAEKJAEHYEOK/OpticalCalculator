// 빌드에 필요한 도구 경로를 찾는다.
// PATH 나 환경변수 설정에 기대지 않는다 — 새 PC 에서 클론하자마자 돌아가야 한다.

import { existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Capacitor 7 은 Java 21 이상을 요구한다. 시스템 JDK 17 로는
// "invalid source release: 21" 로 실패한다.
export function findJdk() {
  const candidates = [
    process.env.CAPACITOR_JAVA_HOME,
    'C:\\Program Files\\Android\\Android Studio\\jbr',
    'C:\\Program Files\\Microsoft\\jdk-21',
    'C:\\Program Files\\Eclipse Adoptium\\jdk-21',
    process.env.JAVA_HOME,
  ].filter(Boolean);

  const found = candidates.find((p) => existsSync(join(p, 'bin', 'javac.exe')));
  if (!found) {
    throw new Error(
      'Java 21 이상을 찾지 못했습니다.\n' +
        'Android Studio 를 설치했는지 확인하거나 CAPACITOR_JAVA_HOME 으로 JDK 경로를 지정하세요.'
    );
  }
  return found;
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
