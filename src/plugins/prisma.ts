import type { FastifyInstance } from 'fastify';
import { prisma } from '../db/prisma.js';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: typeof prisma;
  }
}

/**
 * PrismaClient 를 app 에 붙이고, 앱이 닫힐 때 커넥션 풀을 정리합니다.
 *
 * 서비스가 db/prisma.ts 를 직접 import 하지 않고 app.prisma 로 받는 이유는
 * 테스트입니다. 무엇이 꽂혀 있는지가 buildApp() 한 곳에만 있습니다.
 *
 * app.register 로 감싸지 않는 이유 — register 는 새 스코프를 만들어서
 * 거기서 한 decorate 가 밖의 라우트에는 안 보입니다. fastify-plugin 으로
 * 그 스코프를 뚫는 방법이 있지만, 지금은 그냥 부르면 되는 일입니다.
 */
export function registerPrisma(app: FastifyInstance): void {
  app.decorate('prisma', prisma);

  app.addHook('onClose', async () => {
    await prisma.$disconnect();
  });
}
