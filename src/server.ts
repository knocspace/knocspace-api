import Fastify from 'fastify';
import cors from '@fastify/cors';

const app = Fastify({ logger: true });

// 프론트(vite dev 서버)에서 부를 수 있게 열어둡니다
await app.register(cors, { origin: ['http://localhost:5173'] });

app.get('/health', async () => ({
  status: 'ok',
  uptime: process.uptime(),
}));

const port = Number(process.env.PORT ?? 3000);

try {
  await app.listen({ port, host: '127.0.0.1' });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
