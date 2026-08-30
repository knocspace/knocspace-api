import { z } from 'zod';
import { loadEnvFile } from './env-file.js';

/**
 * 환경변수를 읽고 검증하는 곳입니다.
 *
 * process.env 를 부르는 곳은 여기와 env-file.ts 둘뿐입니다.
 * 나머지 코드는 이 파일이 내보내는 config 객체만 봅니다.
 *
 * 값이 없거나 모양이 틀리면 여기서 던집니다. 첫 요청이 들어올 때가 아니라
 * 뜰 때 죽어야 무엇이 빠졌는지 바로 보입니다.
 */
loadEnvFile();

const Env = z.object({
  // 모양까지 보지 않습니다. 틀린 접속 정보는 Prisma 가 더 정확하게 말해줍니다
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  // 쉼표로 구분된 한 줄로 들어와서 배열로 나갑니다. 쓰는 쪽은 이미 배열을 받습니다
  CORS_ORIGINS: z
    .string()
    .default('')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0),
    ),
});

// .env.example 을 복사해 오면 키는 있고 값만 비어 있습니다.
// 빈 문자열은 안 적은 것으로 봅니다 — 그래야 기본값과 "필수" 메시지가 제대로 나옵니다
const present = Object.fromEntries(
  Object.entries(process.env).filter(([, value]) => value !== undefined && value !== ''),
);

const parsed = Env.safeParse(present);

if (!parsed.success) {
  const lines = parsed.error.issues.map(
    (issue) => `  ${issue.path.join('.')}: ${issue.message}`,
  );
  throw new Error(`환경변수가 올바르지 않습니다\n${lines.join('\n')}`);
}

export const config = {
  databaseUrl: parsed.data.DATABASE_URL,
  port: parsed.data.PORT,
  nodeEnv: parsed.data.NODE_ENV,
  corsOrigins: parsed.data.CORS_ORIGINS,
} as const;
