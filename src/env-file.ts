import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config } from 'dotenv';

/**
 * 어떤 .env 파일을 읽을지 고릅니다.
 *
 *   APP_ENV 없음   → .env.local   (로컬 개발 기본값)
 *   APP_ENV=test   → .env.test
 *   APP_ENV=prod   → .env.prod
 *
 * 고르는 기준은 셸의 APP_ENV 입니다. 파일 안에 적힌 값으로는
 * 파일을 고를 수 없기 때문입니다 (읽기 전에는 알 수 없으므로).
 *
 * 파일이 없어도 실패하지 않습니다. 운영에서는 파일 없이 플랫폼이
 * 환경변수를 직접 주입하는 쪽이 흔하고, 그 경우가 더 안전합니다.
 * 이미 설정된 값은 파일이 덮어쓰지 않습니다 — 셸 쪽이 항상 이깁니다.
 *
 * 값이 올바른지는 여기서 보지 않습니다. 검증은 config.ts 몫입니다.
 */
export function loadEnvFile(cwd: string = process.cwd()): string | null {
  const appEnv = process.env['APP_ENV'] ?? 'local';
  const path = resolve(cwd, `.env.${appEnv}`);

  if (!existsSync(path)) return null;

  config({ path, quiet: true });
  return path;
}
