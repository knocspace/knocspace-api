import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { config } from './config.js';

/**
 * Fastify 인스턴스를 조립해서 돌려줍니다. 여기서 listen 하지 않습니다.
 *
 * 나눈 이유는 테스트입니다. 통합 테스트가 포트를 열지 않고
 * buildApp() → app.inject() 로 요청합니다. listen 이 여기 섞이면
 * 테스트마다 포트를 잡아야 하고 병렬로 돌릴 때 서로 부딪힙니다.
 *
 * 플러그인·라우트를 붙이는 곳도 여기 하나입니다. 무엇이 켜져 있는지
 * 이 함수만 읽으면 됩니다.
 */
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    // 테스트 로그는 끕니다. 실패한 테스트가 로그에 묻힙니다
    logger: config.nodeEnv !== 'test',
  });

  await app.register(cors, { origin: config.corsOrigins });

  app.get('/health', async () => ({
    status: 'ok',
    uptime: process.uptime(),
  }));

  return app;
}
