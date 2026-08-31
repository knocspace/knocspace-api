import type { FastifyInstance } from 'fastify';

/**
 * 요청 id 를 응답 헤더로 돌려줍니다.
 *
 * 발급과 전파는 Fastify 가 이미 합니다 — app.ts 의 requestIdHeader 설정으로
 * 들어온 x-request-id 를 그대로 쓰고, 없으면 genReqId 가 만듭니다.
 * 로그의 reqId 도 같은 값입니다.
 *
 * 돌려주는 이유 — 프론트가 "이 요청이 실패했다"를 보고할 때 이 값이 있으면
 * 서버 로그에서 그 한 건을 바로 찾습니다. onRequest 에 붙여서 정상 응답이든
 * 에러 응답이든 빠짐없이 실립니다.
 */
export function registerRequestId(app: FastifyInstance): void {
  app.addHook('onRequest', async (request, reply) => {
    reply.header('x-request-id', request.id);
  });
}
