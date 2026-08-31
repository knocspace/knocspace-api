# B1 · 페이지를 만들고 목록에서 본다

← [로드맵으로](../../ROADMAP.md)

| | |
|---|---|
| 선행 | 없음. **프론트 F4와 겹쳐서 진행합니다** |
| 우선순위 | P0 |
| 도메인 | `Page` 하나 |

---

## 이번 스프린트

> **끝나면 되는 것** — 새 페이지를 만들면 사이드바 목록에 나타나고, 그 페이지를 열면 내용이 보입니다.

계약(`contract/`)과 스키마는 **이 기능을 만들면서 함께** 굳힙니다. 계약만 먼저 굳히고 기능을 뒤로 미루지 않습니다. 쓰는 곳 없이 만든 계약은 맞는지 확인할 방법이 없습니다.

---

## 이번에 생기는 API

| 메서드 | 경로 | 응답 | 왜 지금 |
|---|---|---|---|
| `POST` | `/pages` | `201 Page` | 페이지 만들기 |
| `GET` | `/pages` | `PageSummary[]` | 사이드바 목록 |
| `GET` | `/pages/:id` | `Page` | 페이지 열기 |
| `GET` | `/health` | `200` | 이미 있습니다 |
| `GET` | `/docs` | Swagger UI | 프론트가 계약을 눈으로 확인 |

**만들고 · 목록에서 보고 · 열어보는** 한 덩어리입니다. 셋 중 하나라도 빠지면 프론트에서 확인할 수 있는 게 없습니다.

`PATCH` · `DELETE`는 **B2**입니다. 고치기·옮기기·지우기가 한 묶음이고, 셋 다 순서 재배치와 순환 차단이라는 같은 규칙 위에 있습니다.

---

## 이번에 안 만들고 미루는 것

| 미룬 것 | 언제 | 왜 |
|---|---|---|
| `PATCH` · `DELETE /pages/:id` | B2 | 고치기·옮기기·지우기가 한 기능 묶음입니다 |
| `UpdatePageInput` | B2 | `PATCH` 없이 적으면 `.optional()`/`.nullable()` 구분이 맞는지 확인할 방법이 없습니다 |
| `positionBetween` · `rebalance` | B2 | B1은 **맨 뒤에 붙이기**만 합니다. 중간에 끼워넣는 요청 자체가 없습니다 |
| `lib/tree.ts` 순환 차단 | B2 | 부모를 바꾸는 요청이 B2에 생깁니다 |
| `Page.deletedAt` 컬럼 | B2 | 지우는 기능이 B2입니다. nullable 컬럼 추가는 백필이 없어 마이그레이션 한 줄입니다 |
| `(workspaceId, deletedAt)` 인덱스 | 느린 게 측정될 때 | 이 인덱스를 탈 쿼리가 아직 없습니다. `CREATE INDEX`는 언제든 한 줄입니다 |
| 목록 필터(`?parentId=` 등) | 필요해질 때 | 지금은 프론트가 전부 받아서 조립합니다. 조건이 필요한 화면이 아직 없습니다 |
| `GET /ready` | 배포가 생길 때 | 지금 이걸 호출할 오케스트레이터가 없습니다. `SELECT 1` 한 줄이라 그때 붙여도 5분입니다 |
| 시드 페이지 5개 | — | `POST /pages`가 있으니 시드는 워크스페이스 1개면 됩니다. 목록 확인은 테스트가 직접 만들어서 합니다 |
| `baseVersion` 전달 방법 | B3 | 실제 저장 충돌을 붙여 보고 정합니다 ([계약 2번](api-contract.md#2-baseversion-을-어디로-보낼지--보류)) |
| `User` · `WorkspaceMember` | B4 | 아래 [도메인 범위](#도메인-범위) |

---

## 도메인 범위

**`Workspace`** — `Page`가 소속을 가리킬 곳이라 같이 만들지만 **설계할 것이 없습니다.** B4 전까지 시드로 만든 1개로 고정이고, 고르는 화면도 엔드포인트도 없습니다.

**`User` · `WorkspaceMember`** — B4입니다. B1~B3 엔드포인트 중 `User` 행을 읽는 것이 하나도 없고, B4에서 비밀번호 해시와 `color`가 붙으면서 어차피 마이그레이션이 한 번 더 필요합니다.

다만 컬럼 이름(`createdBy` `updatedBy`)과 값(`local-user`)은 지금 고정합니다 — 값이 찬 테이블에 NOT NULL 컬럼을 나중에 끼워넣는 쪽이 비싸고, FK를 나중에 거는 건 `ALTER TABLE` 한 줄입니다.

---

## 이번에 생기는 파일

```
prisma/
├── schema.prisma        ← 1  Page · Workspace 두 모델
├── migrations/          ← 3  init
└── seed.ts              ← 3  워크스페이스 1개
src/
├── contract/page.ts     ← 2  위 모델과 1:1인 zod
├── contract/index.ts    ← 2  밖으로 나가는 유일한 출구
├── db/prisma.ts         ← 3  PrismaClient 인스턴스 하나
├── local-defaults.ts    ← 3  LOCAL_WORKSPACE_ID · LOCAL_USER_ID. B4에서 삭제
├── config.ts            ← 4  env 검증
├── app.ts               ← 4  buildApp(). listen 안 함
├── plugins/             ← 4·5·7  prisma · request-id · error-handler · swagger
├── lib/AppError.ts      ← 5
├── lib/position.ts      ← 6  nextPosition 하나
├── modules/pages/       ← 6  routes · service · repo
└── test/                ← 8  db.ts · app.ts
```

오른쪽 숫자가 아래 단계 번호입니다.

## 이미 끝난 것

- [x] `docker-compose.yml`(Postgres 17) · `.env.example` · `.gitignore`(`.env*` + `!.env.example`)
- [x] `src/env-file.ts` — 읽을 `.env.*` 파일을 `APP_ENV` 로 고릅니다
- [x] `npm i -D dotenv` · `npm i @prisma/client @prisma/adapter-pg`
- [x] `db:up` `db:migrate` `db:studio` `db:seed` 스크립트
- [x] `src/contract/error.ts` — `ApiErrorCode` · 에러 본문 스키마 · 코드↔HTTP 상태 표
- [x] `CLAUDE.md`

---

# 할 일

## 1. `Page` 필드 확정 → `prisma/schema.prisma`

★ 이 스프린트의 핵심. **Prisma를 먼저 굳히고 zod를 뒤에 맞춥니다.**

- [x] `Page` `Workspace` 두 모델만
- [x] `Page.id`는 `String @id` — 클라이언트가 만든 id를 그대로 씁니다
- [x] `content Json` · `version Int @default(1)` · `icon String?`
- [x] `createdBy` `updatedBy`는 `String` 컬럼만 — 프론트 `Page` 타입에 F1부터 있는 필드입니다
- [x] 인덱스는 `(workspaceId, parentId, position)` 하나 — 목록 조회가 이 순서로 정렬합니다

## 2. 같은 필드를 zod로 → `src/contract/page.ts`

- [ ] `PageSummary` · `Page` · `BlockDoc` · `CreatePageInput`
- [ ] `id`는 `[A-Za-z0-9_-]{1,64}` — 클라이언트가 만든 값이 URL·로그에 그대로 들어갑니다
- [ ] `src/contract/index.ts` — 여기서만 밖으로 내보냅니다
- [ ] 프론트 `src/types/api.ts`에 확정 사항 반영 — **같은 날에**

타입을 손으로 두 번 적지 않습니다.

```ts
export const Page = PageSummary.extend({ ... });
export type Page = z.infer<typeof Page>;
```

## 3. DB에 올리기 → `migrations/` · `seed.ts` · `db/prisma.ts`

- [x] `prisma migrate dev --name init` → `20260831115805_init`
- [x] `src/db/prisma.ts` — 어댑터를 물린 `PrismaClient` 인스턴스 **하나**
- [x] `src/local-defaults.ts` — `LOCAL_WORKSPACE_ID` · `LOCAL_USER_ID`(`local-user`). 시드가 써서 4번에서 당겨왔습니다
- [x] `prisma/seed.ts` — 워크스페이스 1개. id는 `local-defaults.ts`의 상수

> 인스턴스를 하나만 두는 이유 — 여러 번 `new` 하면 커넥션 풀이 그만큼 생깁니다.
>
> **`local-defaults.ts`가 있는 이유** — 인증이 B4라 지금은 워크스페이스와 사용자를 고를 방법이 없습니다. env로 빼지 않고 상수 파일 하나에 둡니다. B4에서 이 파일을 지우면 임시 분기가 남김없이 사라집니다([B4](sprint-4.md)에 그 항목이 있습니다).
>
> 시드를 `prisma.config.ts`에 걸지 않았습니다 — 완료 조건이 네 줄이라 `db:seed`가 언제 도는지 보이는 쪽을 택했습니다. 필요해지면 한 줄입니다.
>
> 옛 `init`이 DB에만 남아 있어 `migrate reset`으로 비우고 다시 만들었습니다. 적용된 마이그레이션 폴더는 지우지 않습니다 — DB의 `_prisma_migrations` 기록과 짝입니다.

## 4. 앱 뼈대 → `app.ts` · `config.ts` · `plugins/`

- [x] `src/app.ts` — `buildApp()`이 Fastify 인스턴스를 돌려줍니다. **listen 하지 않습니다**
- [x] `src/server.ts` — `buildApp()` → `listen` → `SIGTERM`·`SIGINT`에 `app.close()`
- [x] `src/config.ts` — `loadEnvFile()` 부르고 zod로 env 검증. 없으면 부팅 실패
- [x] CORS를 `config.corsOrigins`에서
- [x] `plugins/prisma.ts` — `app.prisma`로 붙이고, 정리는 `onClose` 훅에 (`server.ts`가 부르는 `app.close()`가 이 훅을 돕니다)
- [x] `plugins/request-id.ts` — 응답에 `x-request-id`를 실어 보냅니다. 발급·전파는 `app.ts`의 `requestIdHeader`가 이미 합니다

> **`app.ts`를 나누는 이유는 테스트입니다.** 통합 테스트가 서버를 안 띄우고 `app.inject()`로 요청합니다.
>
> `npm run dev`부터 `listen`까지 무엇이 어떤 순서로 불리는지는 [Fastify 서버가 뜨는 과정](../fastify-startup.md)에 적어 두었습니다.
>
> `local-defaults.ts`는 3번에서 만들었습니다 — 시드가 그 상수를 먼저 필요로 했습니다.

## 5. 에러를 한 모양으로 → `lib/AppError.ts` · `plugins/error-handler.ts`

- [ ] `lib/AppError.ts` — `code` + `message` + 부가 데이터
- [ ] `setErrorHandler` 세 갈래
  - `AppError` → 계약된 코드와 상태
  - zod 검증 실패 → `400 validation`. **어느 필드가 왜 틀렸는지 담습니다**
  - 그 외 → `500 unknown`. 상세는 로그에만
- [ ] `setNotFoundHandler` — 없는 경로도 같은 JSON 모양으로
- [ ] Prisma 오류 번역 — `P2025` → `not_found`

> `P2002`(unique 충돌)는 지금 안 넣습니다. B1에서 중복될 수 있는 값은 `Page.id` 하나인데, 그건 아래 멱등 규칙이 먼저 잡습니다.

## 6. 세 엔드포인트 → `modules/pages/`

- [ ] `pages.routes.ts` — 검증과 상태 코드만
- [ ] `pages.service.ts` — 도메인 규칙
- [ ] `pages.repo.ts` — Prisma 쿼리
- [ ] `lib/position.ts` — `nextPosition(siblings)` 하나. 형제가 없으면 `1024`, 있으면 `마지막 + 1024`

### `POST /pages`

- [ ] `input.id`가 없으면 서버가 만듭니다 (프론트는 항상 보내지만, 계약상 선택입니다)
- [ ] **`input.id`가 이미 있으면 `200`으로 기존 페이지를 돌려줍니다.** 새로 만들지도, `409`를 주지도 않습니다
- [ ] `title` 기본값은 빈 문자열. `제목 없음`은 화면 문구이지 데이터가 아닙니다
- [ ] `parentId`가 없는 id면 `404`
- [ ] 새 페이지는 형제 맨 뒤로
- [ ] `workspaceId` · `createdBy` · `updatedBy`는 `local-defaults.ts` 값

> 멱등이 필요한 이유 — 프론트는 낙관적 업데이트를 하므로 이미 화면에 페이지를 그려 놓고 요청을 보냅니다. 네트워크가 끊겨 재시도하면 페이지가 두 개 생깁니다.

### `GET /pages`

- [ ] `(parentId, position, id)` 순서로
- [ ] 응답을 `PageSummary.array()`로 통과시켜 내보냅니다
- [ ] 쿼리 파라미터는 **없습니다.** 필터가 필요한 화면이 생기면 그때 붙입니다

### `GET /pages/:id`

- [ ] 없는 id면 `404 not_found`

## 7. 계약을 문서로 → Swagger

프론트가 계약을 확인하려고 이 저장소를 클론하지 않아도 되게 합니다. **OpenAPI를 손으로 적지 않습니다** — `contract/`의 zod 스키마에서 뽑습니다. 손으로 적는 순간 계약 출처가 둘이 됩니다.

- [ ] `npm i @fastify/swagger @fastify/swagger-ui fastify-type-provider-zod`
- [ ] `src/plugins/swagger.ts` — `@fastify/swagger`에 `jsonSchemaTransform`을 물립니다
- [ ] `app.ts`에 `validatorCompiler` · `serializerCompiler`를 물리고 타입 프로바이더를 `ZodTypeProvider`로
- [ ] 라우트 `schema`에 `contract/` 스키마를 **그대로** 넣습니다 (`body: CreatePageInput`, `response: { 201: Page }`)
- [ ] 에러 응답은 `ApiErrorBody`로
- [ ] `/docs`(UI) · `/docs/json`(OpenAPI 문서). 서버 기본 경로는 `/api/v1`

> 요청 검증·응답 직렬화·문서가 **같은 스키마 하나**를 씁니다. 문서만 따로 갱신하는 일이 구조적으로 안 생깁니다.
>
> 버전은 `fastify-type-provider-zod@7` — peer가 `zod >=4.1.5` · `fastify ^5.5` · `@fastify/swagger >=9.5.1`이라 지금 의존성과 맞습니다. 여기가 안 맞으면 라우트 스키마를 손으로 적게 되고, 그러면 이 단계를 하는 의미가 없습니다.
>
> 프로덕션에서 UI를 끌지는 지금 정하지 않습니다. 배포가 아직 없습니다.

## 8. 테스트 → `src/test/`

**환경**

- [ ] `vitest.config.ts`
- [ ] 테스트 DB — `knocspace_test` + `.env.test`, `APP_ENV=test`로 고릅니다
- [ ] `src/test/db.ts` 매 테스트 전 truncate · `src/test/app.ts` `buildApp()` 헬퍼
- [ ] `"test": "vitest"` · `"test:run": "vitest run"`

**엔드포인트 하나에 하나씩, 그리고 규칙마다 하나씩**

- [ ] `POST /pages` → 만든 페이지가 `201`로 돌아오고 `Page.parse()`를 통과한다
- [ ] 같은 id로 두 번 만들면 `200`이고 페이지는 하나다
- [ ] `GET /pages` → 만든 페이지들이 `(parentId, position, id)` 순서로 온다
- [ ] `GET /pages/:id` → 방금 만든 값과 같다. 없는 id면 `404`
- [ ] 없는 경로가 계약된 에러 JSON 모양으로 404를 준다

> 데이터베이스는 `prisma migrate`가 없으면 직접 만듭니다. 따로 만들 필요 없습니다.
>
> **`position` 중간 삽입 50회 테스트는 B2입니다.** 재배치 코드가 B2에 생기므로 지금은 테스트할 대상이 없습니다.

## 9. 마무리

- [ ] `README.md` — 실행 방법, 폴더 구조, 계약 문서 링크, `/docs` 링크
- [ ] 커밋 나누기

```
feat: Page 와 Workspace 데이터 모델          ← 완료
refactor: 앱 조립과 부팅 분리                ← 완료
feat: 첫 마이그레이션과 시드                 ← 완료
feat: prisma 와 request-id 를 app 에 붙인다  ← 완료
feat: 프론트와 합의한 페이지 계약 스키마
feat: 통일된 에러 처리
feat: 페이지 생성과 조회
feat: contract 스키마로 OpenAPI 문서 생성
test: 테스트 환경 구성
docs: README
```

---

## 완료 조건

**돈다**

- [ ] `npm run typecheck` · `npm run build` · `npm run test:run` 세 개 통과
- [ ] clone 한 새 폴더에서 `.env.local`을 채운 뒤 `db:up` → `db:migrate` → `db:seed` → `dev` 네 줄로 서버가 뜬다
- [ ] `POST /pages`로 만든 페이지가 `GET /pages`와 `GET /pages/:id` 양쪽에 나온다

**계약이 하나다**

- [ ] `/docs`에서 세 엔드포인트가 요청·응답 스키마와 함께 보이고, 그 스키마를 손으로 적은 곳이 0개다
- [ ] **프론트 `types/api.ts`의 페이지 타입과 필드 이름·널 허용·선택 여부가 100% 일치한다** — 표로 한 줄씩 대조
- [ ] [API 계약](api-contract.md)의 결정 사항이 "권장"이 아니라 "확정"으로 바뀌어 있다

**경계가 지켜졌다**

- [ ] 모든 오류 응답이 `{ error: { code, message } }` 한 모양이다 — 404, 400, 500 전부
- [ ] `src/config.ts`와 `src/env-file.ts` 밖에서 `process.env`를 부르는 곳 0개
- [ ] `pages.routes.ts` 안에 `prisma.` 0개

[공통 완료 조건](conventions.md)도 함께 확인합니다.

---

## 끝나면

프론트가 mock 대신 이 서버로 **페이지를 만들고 · 목록에 그리고 · 열어볼 수 있습니다.** 아직 고치거나 지울 수는 없습니다.

계약도 같이 굳었습니다. **B2에서 만들 수정·이동·삭제가 어떤 모양이어야 하는지가 더 이상 애매하지 않습니다.**

---

← [서버 구조](architecture.md) · 다음 → [B2](sprint-2.md)
