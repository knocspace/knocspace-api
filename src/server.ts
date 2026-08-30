import { buildApp } from './app.js';
import { config } from './config.js';

/**
 * 부팅만 합니다. 여기엔 로직이 없습니다.
 *
 * 무엇을 붙일지는 app.ts, 값이 맞는지는 config.ts 가 이미 정했습니다.
 * 이 파일이 하는 일은 포트를 열고 닫는 것뿐입니다.
 */
const app = await buildApp();

// app.close() 가 Fastify onClose 훅을 돕니다.
// DB 커넥션 정리는 plugins/prisma.ts 가 그 훅에 붙습니다
const shutdown = (signal: string) => {
  app.log.info({ signal }, '종료합니다');
  void app
    .close()
    .then(() => process.exit(0))
    .catch((error: unknown) => {
      app.log.error(error);
      process.exit(1);
    });
};

process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));

try {
  await app.listen({ port: config.port, host: '127.0.0.1' });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
