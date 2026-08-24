# B1 · Page 모양 고정

← [로드맵으로](../../ROADMAP.md)

| | |
|---|---|
| 선행 | 없음. **프론트 F4와 겹쳐서 진행합니다** |
| 우선순위 | P0 |

**이 스프린트에서 설계하는 도메인은 `Page` 하나입니다.**
`Page` 한 덩어리가 어떻게 생겼는지를 Prisma와 zod 양쪽에 똑같이 고정하고, 그 계약대로 요청 → DB → 응답이 한 바퀴 도는지 엔드포인트 하나로 확인합니다.

---

## 이번에 생기는 API

| 메서드 | 경로 | 응답 | 왜 지금 |
|---|---|---|---|
| GET | `/health` | `200` | 이미 있습니다 |
| GET | `/ready` | `200` | DB 연결까지 확인. 배포 시 트래픽 투입 판단용 |
| GET | `/pages/tree` | `PageSummary[]` | **계약대로 한 바퀴 도는지 확인하는 용도.** 이거 하나만 만듭니다 |

페이지 CRUD 나머지(`POST` `PATCH` `DELETE` `GET /pages/:id`)는 전부 **B2**입니다. 여기서 만들지 않습니다.

## 이번에 생기는 파일

```
prisma/
├── schema.prisma        ← 1  Page · Workspace 두 모델
├── migrations/          ← 3  init
└── seed.ts              ← 3  워크스페이스 1 + 페이지 5
src/
├── contract/page.ts     ← 2  위 모델과 1:1인 zod
├── contract/index.ts    ← 2  밖으로 나가는 유일한 출구
├── db/prisma.ts         ← 3  PrismaClient 인스턴스 하나
├── config.ts            ← 4  env 검증
├── app.ts               ← 4  buildApp(). listen 안 함
├── plugins/             ← 4·5  prisma · request-id · error-handler
├── lib/AppError.ts      ← 5
├── lib/position.ts      ← 6  position 재배치
├── modules/pages/       ← 6  routes · service · repo
└── test/                ← 7  db.ts · app.ts
```

오른쪽 숫자가 아래 단계 번호입니다.

## 도메인 범위

`Workspace`는 `Page`가 소속을 가리킬 곳이라 같이 만들지만 **설계할 것이 없습니다.** B4 전까지 시드로 만든 1개로 고정이고, 고르는 화면도 엔드포인트도 없습니다.

`User` · `WorkspaceMember` · `contract/user.ts`는 **B4**입니다. B1~B3 엔드포인트 중 `User` 행을 읽는 것이 하나도 없고, B4에서 비밀번호 해시와 `color`가 붙으면서 어차피 마이그레이션이 한 번 더 필요합니다.

다만 컬럼 이름(`createdBy` `updatedBy`)과 시드 값(`local-user`)은 지금 고정합니다 — 값이 찬 테이블에 NOT NULL 컬럼을 나중에 끼워넣는 쪽이 비싸고, FK를 나중에 거는 건 `ALTER TABLE` 한 줄입니다.

---

## 이미 끝난 것

- [x] `docker-compose.yml`(Postgres 17) · `.env.example` · `.gitignore`(`.env*` + `!.env.example`)
- [x] `src/env-file.ts` — 읽을 `.env.*` 파일을 `APP_ENV` 로 고릅니다
- [x] `npm i -D dotenv` · `npm i @prisma/client @prisma/adapter-pg`
- [x] `db:up` `db:migrate` `db:studio` `db:seed` 스크립트
- [x] `src/contract/error.ts` — `ApiErrorCode` · 에러 본문 스키마 · 코드↔HTTP 상태 표
- [x] `CLAUDE.md`

---

## 1. `Page` 필드 확정 → `prisma/schema.prisma`

★ 이 스프린트의 핵심. **Prisma를 먼저 굳히고 zod를 뒤에 맞춥니다.**

- [x] `Page` `Workspace` 두 모델만
- [x] `Page.id`는 `String @id` — `@default(cuid())`를 **붙이지 않습니다**
- [x] `content Json` · `version Int @default(1)` · `deletedAt DateTime?`
- [x] `createdBy` `updatedBy`는 `String` 컬럼만
- [x] 인덱스 두 개 ([구조 문서](architecture.md#데이터-모델-b1에서-확정))

> `id`에 기본값을 안 주는 이유 — 클라이언트가 만든 id를 그대로 씁니다. 오프라인에서 페이지를 만들고 나중에 올려도 id가 안 바뀝니다.

## 2. 같은 필드를 zod로 → `src/contract/page.ts`

- [ ] `PageSummary` `Page` `BlockDoc` `CreatePageInput` `UpdatePageInput`
- [ ] `src/contract/index.ts` — 여기서만 밖으로 내보냅니다
- [ ] 프론트 `src/types/api.ts`에 확정 사항 반영 — **같은 날에**

타입을 손으로 두 번 적지 않습니다.

```ts
export const Page = PageSummary.extend({ ... });
export type Page = z.infer<typeof Page>;
```

> 프론트와의 합의는 [API 계약](api-contract.md#결정이-필요한-것)에 있습니다. 여섯 항목 중 넷은 확정. 남은 하나 `baseVersion`을 어디로 보낼지(`If-Match` 헤더)는 **B3**에서 실제 저장 충돌을 붙여 보고 정합니다.

## 3. DB에 올리기 → `migrations/` · `seed.ts` · `db/prisma.ts`

- [ ] `prisma migrate dev --name init`
- [ ] `src/db/prisma.ts` — 어댑터를 물린 `PrismaClient` 인스턴스 **하나**
- [ ] `prisma/seed.ts` — 워크스페이스 1개, 페이지 5개(2단계 중첩), `createdBy`/`updatedBy`에 `local-user`

> 인스턴스를 하나만 두는 이유 — 여러 번 `new` 하면 커넥션 풀이 그만큼 생깁니다.
> 시드는 프론트 `api/seed.ts`와 **같은 모양**으로. F9에서 화면이 똑같이 보여야 전환이 됐는지 눈으로 압니다.

## 4. 앱 뼈대 → `app.ts` · `config.ts` · `plugins/`

- [ ] `src/app.ts` — `buildApp()`이 Fastify 인스턴스를 돌려줍니다. **listen 하지 않습니다**
- [ ] `src/server.ts` — `buildApp()` → `listen` → `SIGTERM`에 DB 연결 정리
- [ ] `src/config.ts` — `loadEnvFile()` 부르고 zod로 env 검증. 없으면 부팅 실패
- [ ] `plugins/prisma.ts` · `plugins/request-id.ts`
- [ ] CORS를 `config.corsOrigins`에서 (지금 `server.ts`에 하드코딩돼 있습니다)
- [ ] `GET /ready` — `SELECT 1`까지 확인

> `app.ts`를 나누는 이유는 테스트 때문입니다. 통합 테스트가 서버를 안 띄우고 `app.inject()`로 요청합니다.

## 5. 에러를 한 모양으로 → `lib/AppError.ts` · `plugins/error-handler.ts`

- [ ] `lib/AppError.ts` — `code` + `message` + 부가 데이터
- [ ] `setErrorHandler` 세 갈래
  - `AppError` → 계약된 코드와 상태
  - zod 검증 실패 → `400 validation`. **어느 필드가 왜 틀렸는지 담습니다**
  - 그 외 → `500 unknown`. 상세는 로그에만
- [ ] `setNotFoundHandler` — 없는 경로도 같은 JSON 모양으로
- [ ] Prisma 오류 번역 — `P2025` → `not_found`, `P2002` → 상황별

## 6. `GET /pages/tree` → `modules/pages/`

- [ ] `pages.routes.ts` — 검증과 상태 코드만
- [ ] `pages.service.ts` — 안 지워진 페이지를 `(parentId, position, id)` 순서로
- [ ] `pages.repo.ts` — Prisma 쿼리
- [ ] 응답을 `PageSummary.array()`로 통과시켜 내보냅니다
- [ ] `lib/position.ts` — 중간 삽입과 재배치

## 7. 테스트 → `src/test/`

- [ ] `npm i -D @vitest/coverage-v8` · `vitest.config.ts`
- [ ] 테스트 DB — `knocspace_test` + `.env.test`, `APP_ENV=test`로 고릅니다
- [ ] `src/test/db.ts` 매 테스트 전 truncate · `src/test/app.ts` `buildApp()` 헬퍼
- [ ] `"test": "vitest"` · `"test:run": "vitest run"`
- [ ] `GET /pages/tree` 가 시드 5개를 순서대로 돌려준다
- [ ] 없는 경로가 계약된 에러 JSON 모양으로 404를 준다
- [ ] `position` 중간 삽입을 50번 반복해도 순서가 안 뒤집힌다

> 데이터베이스는 `prisma migrate`가 없으면 직접 만듭니다. 따로 만들 필요 없습니다.
> 세 번째 테스트가 중요합니다. [계약 문서 3번](api-contract.md#3-position-은-소수를-계속-끼워넣을-수-없습니다)의 재배치 규칙이 실제로 도는지 지금 확인해 둡니다. F5에서 발견하면 늦습니다.

## 8. 마무리

- [ ] `README.md` — 실행 방법, 폴더 구조, 계약 문서 링크
- [ ] 커밋 나누기

```
feat: 데이터 모델과 첫 마이그레이션
feat: 프론트와 합의한 페이지 계약 스키마
refactor: 앱 조립과 부팅 분리
feat: 통일된 에러 처리
feat: 페이지 트리 조회
test: 테스트 환경 구성
docs: README
```

---

## 완료 조건

- [ ] `npm run typecheck` · `npm run build` · `npm run test:run` 세 개 통과
- [ ] clone 한 새 폴더에서 `.env.local` 을 채운 뒤 `db:up` → `db:migrate` → `dev` 세 줄로 서버가 뜬다
- [ ] 모든 오류 응답이 `{ error: { code, message } }` 한 모양이다 — 404, 400, 500 전부
- [ ] `src/config.ts` 와 `src/env-file.ts` 밖에서 `process.env`를 부르는 곳 0개
- [ ] `pages.routes.ts` 안에 `prisma.` 0개
- [ ] **프론트 `types/api.ts`의 페이지 타입과 필드 이름·널 허용·선택 여부가 100% 일치한다** — 표로 한 줄씩 대조
- [ ] [API 계약](api-contract.md)의 결정 사항이 "권장"이 아니라 "확정"으로 바뀌어 있다

[공통 완료 조건](conventions.md)도 함께 확인합니다.

---

## 끝나면

프론트에서 보이는 변화는 없습니다. `curl localhost:3000/api/v1/pages/tree`가 시드 페이지 5개를 돌려줍니다.

대신 **B2에서 만들 페이지 CRUD가 어떤 모양이어야 하는지가 더 이상 애매하지 않습니다.**

---

← [서버 구조](architecture.md) · 다음 → [B2](sprint-2.md)
