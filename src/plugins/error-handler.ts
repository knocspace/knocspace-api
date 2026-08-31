import type { FastifyError, FastifyInstance, FastifyReply } from 'fastify';
import { ZodError } from 'zod';
import { Prisma } from '../generated/prisma/client.js';
import { ERROR_STATUS, type ApiErrorCode } from '../contract/error.js';
import { AppError } from '../lib/AppError.js';

/**
 * 나가는 오류를 { error: { code, message } } 한 모양으로 만듭니다.
 *
 * 프론트는 code 로 분기하고 message 를 그대로 보여줍니다. 그래서
 * 어떤 경로로 실패했든 이 모양이어야 합니다 — 404 도, 500 도, 없는 경로도.
 */
function send(reply: FastifyReply, code: ApiErrorCode, message: string) {
  return reply.status(ERROR_STATUS[code]).send({ error: { code, message } });
}

// "title: 문자열이어야 합니다, content.blocks: 필수입니다"
function describe(error: ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.map(String).join('.');
      return path ? `${path}: ${issue.message}` : issue.message;
    })
    .join(', ');
}

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError, request, reply) => {
    // 서비스가 의도적으로 던진 것
    if (error instanceof AppError) {
      return send(reply, error.code, error.message);
    }

    // 라우트 스키마 검증 실패. 어느 필드가 왜 틀렸는지 message 에 담습니다
    if (error.validation) {
      return send(reply, 'validation', error.message);
    }

    // 서비스가 직접 parse() 한 경우
    if (error instanceof ZodError) {
      return send(reply, 'validation', describe(error));
    }

    // 없는 행을 update·delete 했을 때 Prisma 가 주는 코드
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return send(reply, 'not_found', '없는 리소스입니다');
    }

    // 여기까지 왔으면 우리가 예상하지 못한 것입니다.
    // 상세는 로그에만 남기고 밖으로는 내보내지 않습니다
    request.log.error({ err: error }, '처리하지 못한 오류');
    return send(reply, 'unknown', '서버에서 오류가 났습니다');
  });

  app.setNotFoundHandler((request, reply) =>
    send(reply, 'not_found', `${request.method} ${request.url} 은 없는 경로입니다`),
  );
}
