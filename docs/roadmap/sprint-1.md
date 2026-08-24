# B1 · 스키마와 계약 고정

← [로드맵으로](../../ROADMAP.md)

| | |
|---|---|
| 기간 | 1주 (약 15시간) |
| 선행 | 없음. **프론트 F4와 겹쳐서 진행합니다** |
| 우선순위 | P0 |

---

## 목표

엔드포인트는 거의 안 만듭니다. 대신 **앞으로 만들 모든 엔드포인트가 똑같이 따를 틀**을 세웁니다.

이 스프린트가 끝나면 "요청을 받아 DB를 건드리고 응답하는 방법"이 이 저장소에 **정확히 한 가지만** 있어야 합니다.

그리고 이번 주의 진짜 산출물은 코드가 아니라 **프론트와 합의한 계약**입니다.

## 만드는 것

- 로컬 Postgres (docker compose) + 첫 마이그레이션
- `src/contract/` — 프론트 `types/api.ts`와 1:1인 zod 스키마
- Prisma 스키마 4개 모델 + 시드
- `app.ts` / `server.ts` 분리, 플러그인 4개
- 통일된 에러 처리
- 테스트 환경 + 첫 테스트 3개
- 엔드포인트는 `/health` `/ready` `GET /pages/tree` 셋만

---

## 할 일

### 1. 로컬 DB (1시간 30분)

- [ ] `docker-compose.yml` — Postgres 17, 포트 5432, 볼륨 하나
- [ ] `.env.example`은 이미 맞습니다. `PORT` `NODE_ENV` `CORS_ORIGINS` 추가
- [ ] `npm i -D dotenv` — `prisma.config.ts`가 `dotenv/config`를 import 하는데 `package.json`에 없습니다. 지금은 다른 패키지에 딸려 온 것으로 우연히 돌고 있어서, 그 패키지가 바뀌면 깨집니다
- [ ] `package.json` 스크립트

```
db:up      docker compose up -d
db:migrate prisma migrate dev
db:studio  prisma studio
db:seed    tsx prisma/seed.ts
```

**확인** — 저장소를 새로 clone 해서 `db:up` → `db:migrate` → `dev` 세 줄로 서버가 뜨는지 직접 해봅니다.

### 2. 계약 정하기 (3시간) ★ 이 스프린트의 핵심

프론트 `src/types/api.ts`를 그대로 옮기면 안 되는 지점이 여섯 군데 있습니다. 근거와 권장안은 [API 계약 — 결정이 필요한 것](api-contract.md#결정이-필요한-것)에 정리돼 있습니다.

- [ ] 여섯 항목을 프론트 쪽과 결정합니다
- [ ] 결정 결과를 `api-contract.md`에 **확정으로 고쳐 적습니다** (권장안 문단을 지우고 결론만 남깁니다)
- [ ] 프론트 `src/types/api.ts`에 같은 변경을 반영합니다 — 같은 날에

그다음 코드로 옮깁니다.

- [ ] `src/contract/error.ts` — `ApiErrorCode`, 에러 본문 스키마, 코드↔HTTP 상태 표
- [ ] `src/contract/page.ts` — `PageSummary` `Page` `BlockDoc` `CreatePageInput` `UpdatePageInput`
- [ ] `src/contract/user.ts` — `User` (B4에 쓰지만 지금 정의합니다)
- [ ] `src/contract/index.ts` — 여기서만 밖으로 내보냅니다

타입을 손으로 두 번 적지 않습니다.

```ts
export const Page = PageSummary.extend({ ... });
export type Page = z.infer<typeof Page>;
```

### 3. Prisma 스키마 (2시간)

- [ ] `Workspace` `User` `Membership` `Page` 네 모델
- [ ] `Page.id`는 `String @id` — **`@default(cuid())`를 붙이지 않습니다.** 클라이언트가 만든 id를 씁니다
- [ ] `content Json` · `version Int @default(1)` · `deletedAt DateTime?`
- [ ] 인덱스 두 개 ([구조 문서](architecture.md#데이터-모델-b1에서-확정))
- [ ] `prisma migrate dev --name init`
- [ ] `prisma/seed.ts` — 워크스페이스 1개, `local-user` 1명, 샘플 페이지 5개(2단계 중첩)

시드의 샘플 페이지는 프론트 `api/seed.ts`와 **같은 모양**으로 만듭니다. F9에서 화면이 똑같이 보여야 전환이 됐는지 눈으로 알 수 있습니다.

### 4. 앱 조립 (2시간)

- [ ] `src/app.ts` — `buildApp()`이 Fastify 인스턴스를 만들어 돌려줍니다. **listen 하지 않습니다**
- [ ] `src/server.ts` — `buildApp()` → `listen` → 종료 신호 처리(`SIGTERM`에 DB 연결 정리)
- [ ] `src/config.ts` — zod로 env 검증. 없으면 부팅 실패
- [ ] `plugins/prisma.ts` · `plugins/request-id.ts` · `plugins/error-handler.ts`
- [ ] CORS를 `config.corsOrigins`에서 읽게 (지금 `server.ts`에 하드코딩돼 있습니다)
- [ ] `GET /ready` 추가 — `SELECT 1`까지 확인

`app.ts`를 분리하는 이유는 테스트 때문입니다. 통합 테스트가 서버를 띄우지 않고 `app.inject()`로 요청을 보냅니다.

### 5. 에러 처리 (2시간)

- [ ] `lib/AppError.ts` — `code` + `message` + 부가 데이터
- [ ] `setErrorHandler` — 세 갈래
  - `AppError` → 계약된 코드와 상태
  - zod 검증 실패 → `400 validation`. **어느 필드가 왜 틀렸는지 담습니다**
  - 그 외 → `500 unknown`. 상세는 로그에만, 응답엔 안 담습니다
- [ ] `setNotFoundHandler` — 없는 경로도 같은 JSON 모양으로
- [ ] Prisma 오류 번역 — `P2025`(없음) → `not_found`, `P2002`(중복) → 상황별

### 6. 첫 엔드포인트 (1시간 30분)

`GET /pages/tree` 하나만 만듭니다. 전체 흐름이 실제로 도는지 확인하는 게 목적입니다.

- [ ] `modules/pages/pages.routes.ts` — 검증과 상태 코드만
- [ ] `modules/pages/pages.service.ts` — 워크스페이스의 안 지워진 페이지를 순서대로
- [ ] `modules/pages/pages.repo.ts` — Prisma 쿼리
- [ ] 응답을 `contract`의 `PageSummary.array()`로 통과시켜 내보냅니다

### 7. 테스트 환경 (2시간)

- [ ] `npm i -D @vitest/coverage-v8` · `vitest.config.ts`
- [ ] 테스트용 DB — 별도 데이터베이스 이름(`knocspace_test`) + `.env.test`
- [ ] `src/test/db.ts` — 각 테스트 전에 테이블 truncate
- [ ] `src/test/app.ts` — `buildApp()`을 감싼 헬퍼
- [ ] `package.json`에 `"test": "vitest"`, `"test:run": "vitest run"`
- [ ] 첫 테스트 3개
  - `GET /pages/tree` 가 시드 5개를 순서대로 돌려준다
  - 없는 경로는 계약된 에러 JSON 모양으로 404를 준다
  - `position` 중간 삽입을 50번 반복해도 순서가 안 뒤집힌다 (`lib/position.ts`)

세 번째가 중요합니다. [계약 문서 3번](api-contract.md#3-position-은-소수를-계속-끼워넣을-수-없습니다)에서 정한 재배치 규칙이 실제로 도는지 지금 확인해 둡니다. F5에서 발견하면 늦습니다.

### 8. 마무리 (1시간)

- [ ] `README.md` 작성 — 실행 방법, 폴더 구조, 계약 문서 링크
- [ ] `CLAUDE.md` 작성 — 이 저장소의 규칙 (경계, 계약 우선, 테스트)
- [ ] 커밋 나누기

```
chore: 로컬 Postgres 와 개발 스크립트
feat: 프론트와 합의한 API 계약 스키마
feat: 데이터 모델과 첫 마이그레이션
refactor: 앱 조립과 부팅 분리
feat: 통일된 에러 처리
feat: 페이지 트리 조회
test: 테스트 환경 구성
docs: README 와 CLAUDE.md
```

---

## 완료 조건

- [ ] `npm run typecheck` · `npm run build` · `npm run test:run` 세 개 통과
- [ ] clone 한 새 폴더에서 명령 세 줄로 서버가 뜬다
- [ ] 모든 오류 응답이 `{ error: { code, message } }` 한 모양이다 — 404, 400, 500 전부
- [ ] `src/config.ts` 밖에서 `process.env`를 부르는 곳 0개
- [ ] `pages.routes.ts` 안에 `prisma.` 0개
- [ ] `src/contract/`를 프론트에 그대로 넘길 수 있다
- [ ] **프론트 `types/api.ts`와 필드 이름·널 허용·선택 여부가 100% 일치한다** — 표로 한 줄씩 대조
- [ ] [API 계약](api-contract.md)의 결정 사항 6건이 전부 "권장"이 아니라 "확정"으로 바뀌어 있다

[공통 완료 조건](conventions.md)도 함께 확인합니다.

---

## 끝나면 할 수 있는 것

프론트에서 보이는 변화는 없습니다. `curl localhost:3000/api/v1/pages/tree`가 시드 페이지 5개를 돌려줍니다.

대신 **F9에서 뭘 만들어야 하는지가 애매하지 않게 됩니다.**

---

← [서버 구조](architecture.md) · 다음 → [B2](sprint-2.md)
