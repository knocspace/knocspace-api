import type { ApiErrorCode } from '../contract/error.js';

/**
 * 서비스가 던지는 오류.
 *
 * 서비스는 HTTP 를 모릅니다. 상태 코드 대신 계약된 code 를 던지고,
 * 몇 번으로 나갈지는 plugins/error-handler.ts 가 contract/error.ts 의
 * 표를 보고 정합니다.
 *
 * message 는 사용자에게 그대로 보입니다. 내부 사정을 담지 않습니다.
 */
export class AppError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
