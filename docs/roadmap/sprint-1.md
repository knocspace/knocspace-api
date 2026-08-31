# B1 · 페이지를 만들고 목록에서 본다

← [로드맵으로](../../ROADMAP.md)

|          |                                         |
| -------- | --------------------------------------- |
| 선행     | 없음. **프론트 F4와 겹쳐서 진행합니다** |
| 우선순위 | P0                                      |
| 도메인   | `Page` 하나                             |

---

## 이번 스프린트 목표

> 새 페이지를 만들면 사이드바 목록에 나타나고, 그 페이지를 열면 내용이 보입니다.

이번에 만드는 API는 3개입니다.

| 메서드 | 경로         | 역할               |
| ------ | ------------ | ------------------ |
| `POST` | `/pages`     | 페이지 만들기      |
| `GET`  | `/pages`     | 사이드바 목록 조회 |
| `GET`  | `/pages/:id` | 페이지 상세 조회   |

여기에 `/health`(이미 있습니다)와 `/docs`(Swagger UI)가 붙습니다. 서버 기본 경로는 `/api/v1`입니다.

**만들고 · 목록에서 보고 · 열어보는** 한 덩어리입니다. 셋 중 하나라도 빠지면 프론트에서 확인할 수 있는 게 없습니다.

`PATCH` · `DELETE`, 페이지 이동/정렬은 **B2**에서 합니다.

---

## 전체 작업 순서

| #   | 작업              | Spring 으로 보면                  |          |
| --- | ----------------- | --------------------------------- | -------- |
| 1   | DB 모델 정의      | `@Entity`                         | 완료     |
| 2   | API 계약 정의     | Request/Response DTO + Validation | **다음** |
| 3   | DB 반영 및 연결   | Flyway + 초기 데이터 + DB 접근    | 완료     |
| 4   | Fastify 공통 설정 | 애플리케이션 설정 / Bean / Filter | 완료     |
| 5   | 공통 에러 처리    | `@RestControllerAdvice`           | 완료     |
| 6   | Page API 구현     | Controller → Service → Repository |          |
| 7   | Swagger           | springdoc-openapi                 |          |
| 8   | 테스트            | 통합 테스트                       |          |
| 9   | README / 마무리   | 실행 방법 및 검증                 |          |

DB 를 먼저 굳히고(1·3) 서버 뼈대를 세운 뒤(4·5) 그 위에 API 를 얹는 순서입니다.

> Fastify · Prisma 자체의 개념은 별도 문서인 [Fastify 서버가 뜨는 과정](../fastify-startup.md),
> [Prisma 핵심 개념](../prisma-core-concepts.md) 에서 확인합니다.
> 이 문서에서는 **B1에서 무엇을 구현해야 하는지**만 정리합니다.

계약(`contract/`)과 스키마는 **이 기능을 만들면서 함께** 굳힙니다. 계약만 먼저 굳히고 기능을 뒤로 미루지 않습니다. 쓰는 곳 없이 만든 계약은 맞는지 확인할 방법이 없습니다.

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

## 이미 끝난 준비

- [x] `docker-compose.yml`(Postgres 17) · `.env.example` · `.gitignore`(`.env*` + `!.env.example`)
- [x] `src/env-file.ts` — 읽을 `.env.*` 파일을 `APP_ENV` 로 고릅니다
- [x] `npm i -D dotenv` · `npm i @prisma/client @prisma/adapter-pg`
- [x] `db:up` `db:migrate` `db:studio` `db:seed` 스크립트
- [x] `src/contract/error.ts` — `ApiErrorCode` · 에러 본문 스키마 · 코드↔HTTP 상태 표
- [x] `CLAUDE.md`

---

## 1. DB 모델 정의

> **Spring 의 `@Entity` 를 정의하는 단계**

파일:

```
prisma/schema.prisma
```

이번에는 `Page`, `Workspace` 두 모델만 정의합니다. **Prisma를 먼저 굳히고 zod를 뒤에 맞춥니다.**

- [x] `Page` `Workspace` 두 모델만
- [x] `Page.id` → `String @id` — 클라이언트가 만든 id를 그대로 씁니다
- [x] `content` → `Json`
- [x] `version` → `Int @default(1)`
- [x] `icon` → nullable
- [x] `createdBy` `updatedBy` → 우선 `String` 컬럼만. 프론트 `Page` 타입에 F1부터 있는 필드입니다
- [x] `(workspaceId, parentId, position)` 인덱스 — 목록 조회가 이 순서로 정렬합니다

```
schema.prisma
   ↓
Page / Workspace 의 DB 구조 정의
```

아직 실제 PostgreSQL 테이블이 생긴 것은 아닙니다. 실제 DB 반영은 **3번 Migration**에서 합니다.

---

## 2. API 계약 정의

> **Spring 의 Request/Response DTO + Validation 을 정의하는 단계**

파일:

```
src/contract/
├── page.ts
└── index.ts
```

만들 계약:

- [ ] `PageSummary` · `Page` · `BlockDoc` · `CreatePageInput`
- [ ] `id`는 `[A-Za-z0-9_-]{1,64}` — 클라이언트가 만든 값이 URL·로그에 그대로 들어갑니다
- [ ] `src/contract/index.ts` — 여기서만 밖으로 내보냅니다
- [ ] 프론트 `src/types/api.ts`에 확정 사항 반영 — **같은 날에**

zod 스키마 하나로 요청 검증과 TypeScript 타입을 같이 관리합니다. 타입을 손으로 두 번 적지 않습니다.

```ts
export const Page = PageSummary.extend({
  // ...
});

export type Page = z.infer<typeof Page>;
```

즉:

```
schema.prisma
= DB 에 어떻게 저장할지

zod contract
= API 에서 무엇을 받고 무엇을 반환할지
```

---

## 3. DB 반영 및 연결

> **Spring 의 Flyway + 초기 데이터 + DB 접근 설정 단계**

파일:

```
prisma/migrations/
prisma/seed.ts
src/db/prisma.ts
src/local-defaults.ts
```

1번의 `schema.prisma` 를 실제 PostgreSQL 에 반영하고, 애플리케이션에서 쓸 DB 접근 창구를 만듭니다.

- [x] `prisma migrate dev --name init` → `20260831115805_init`
- [x] `src/db/prisma.ts` → `PrismaClient` 인스턴스 하나
- [x] `src/local-defaults.ts` → `LOCAL_WORKSPACE_ID` · `LOCAL_USER_ID`(`local-user`). B4에서 삭제
- [x] `prisma/seed.ts` → 워크스페이스 1개

```
schema.prisma
   ↓
Prisma Migration
   ↓
PostgreSQL Table
```

인증이 B4라 워크스페이스와 사용자는 `local-defaults.ts` 상수로 임시 고정합니다.

---

## 4. Fastify 서버 공통 설정

> **Spring Boot 에서 서버 공통 설정과 공통 기능을 등록하는 단계**

파일:

```
src/app.ts
src/server.ts
src/config.ts
src/plugins/
```

앱 조립(`app.ts`)과 서버 실행(`server.ts`)을 나눕니다. 테스트가 서버를 안 띄우고 `app.inject()` 로 요청합니다.

- [x] `app.ts` → `buildApp()`. 여기서 `listen()` 하지 않음
- [x] `server.ts` → `listen()` · `SIGTERM`/`SIGINT` → `app.close()`
- [x] `config.ts` → `loadEnvFile()` + zod env 검증. 실패하면 부팅 실패
- [x] CORS → `config.corsOrigins`
- [x] `plugins/prisma.ts` → `app.prisma` 등록, 정리는 `onClose` 훅
- [x] `plugins/request-id.ts` → 응답에 `x-request-id`

```
buildApp()
   ↓
Plugin / Route 등록
   ↓
app.listen()
   ↓
HTTP 요청 대기
```

---

## 5. 공통 에러 처리

> **Spring 의 `@RestControllerAdvice` + `@ExceptionHandler` 를 만드는 단계**

파일:

```
src/lib/AppError.ts
src/plugins/error-handler.ts
```

모든 API 에러를 한 형태로 통일합니다.

```json
{
  "error": {
    "code": "not_found",
    "message": "페이지를 찾을 수 없습니다."
  }
}
```

- [x] `AppError` → `code` + `message`
- [x] `AppError` → 계약된 code / HTTP 상태
- [x] 라우트 검증 실패(`error.validation`) → `400 validation`
- [x] `ZodError` → `400 validation`. 어느 필드가 왜 틀렸는지 `message` 에
- [x] 그 외 → `500 unknown`. 상세는 로그에만
- [x] `setNotFoundHandler()` → 없는 경로도 같은 에러 JSON
- [x] Prisma `P2025` → `404 not_found`

---

## 6. Page API 구현

> **Spring 의 Controller → Service → Repository 를 구현하는 단계**

파일:

```
src/modules/pages/
├── pages.routes.ts
├── pages.service.ts
└── pages.repo.ts
```

Route 에서 직접 Prisma 를 호출하지 않습니다.

- [ ] `pages.routes.ts` → 검증 · 상태 코드 (`PageController`)
- [ ] `pages.service.ts` → 도메인 규칙 (`PageService`)
- [ ] `pages.repo.ts` → Prisma 쿼리 (`PageRepository`)
- [ ] `lib/position.ts` → `nextPosition(siblings)`. 형제가 없으면 `1024`, 있으면 `마지막 + 1024`

```
HTTP Request
   ↓
Route → Service → Repository → Prisma
   ↓
PostgreSQL
```

**`POST /pages`**

- [ ] `id` 없음 → 서버에서 생성
- [ ] 같은 `id` 있음 → 기존 Page 반환, `200`
- [ ] 새로 생성 → `201`
- [ ] `title` 기본값 → `""`
- [ ] 없는 `parentId` → `404`
- [ ] 새 페이지 위치 → 형제 맨 뒤
- [ ] `workspaceId` · `createdBy` · `updatedBy` → `local-defaults.ts` 값

프론트가 낙관적 업데이트 후 재시도해도 페이지가 두 개 생기지 않게 멱등하게 처리합니다.

**`GET /pages`**

- [ ] 정렬 → `(parentId, position, id)`
- [ ] 응답 → `PageSummary.array()` 로 통과시켜 반환
- [ ] Query Parameter → 없음

**`GET /pages/:id`**

- [ ] 있으면 → `Page`
- [ ] 없으면 → `404 not_found`

중간 삽입 · 재정렬 · 순환 차단은 B2 입니다.

---

## 7. Swagger 설정

> **Spring 의 springdoc-openapi 설정 단계**

프론트가 계약을 확인하려고 이 저장소를 클론하지 않아도 되게 합니다. Swagger 스키마를 별도로 작성하지 않고 **2번에서 만든 zod 계약을 그대로 사용**합니다. 손으로 적는 순간 계약 출처가 둘이 됩니다.

```
zod contract
   ├─ 요청 검증
   ├─ 응답 스키마
   └─ Swagger
```

- [ ] `npm i @fastify/swagger @fastify/swagger-ui fastify-type-provider-zod`
- [ ] `src/plugins/swagger.ts` — `@fastify/swagger`에 `jsonSchemaTransform`을 물립니다
- [ ] `app.ts`에 `validatorCompiler` · `serializerCompiler`를 물리고 타입 프로바이더를 `ZodTypeProvider`로
- [ ] 라우트 `schema`에 `contract/` 스키마를 **그대로** 넣습니다 (`body: CreatePageInput`, `response: { 201: Page }`)
- [ ] 에러 응답은 `ApiErrorBody`로
- [ ] `/docs`(UI) · `/docs/json`(OpenAPI 문서)

API 스펙의 기준을 하나로 유지하는 것이 목적입니다. 문서만 따로 갱신하는 일이 구조적으로 안 생깁니다.

> 버전은 `fastify-type-provider-zod@7` — peer가 `zod >=4.1.5` · `fastify ^5.5` · `@fastify/swagger >=9.5.1`이라 지금 의존성과 맞습니다. 여기가 안 맞으면 라우트 스키마를 손으로 적게 되고, 그러면 이 단계를 하는 의미가 없습니다.
>
> 프로덕션에서 UI를 끌지는 지금 정하지 않습니다. 배포가 아직 없습니다.

---

## 8. 테스트

> **Page API 의 주요 규칙을 통합 테스트하는 단계**

환경:

```
Vitest
knocspace_test
.env.test
```

- [ ] `vitest.config.ts`
- [ ] 테스트 DB — `knocspace_test` + `.env.test`, `APP_ENV=test`로 고릅니다
- [ ] `src/test/db.ts` 매 테스트 전 truncate · `src/test/app.ts` `buildApp()` 헬퍼
- [ ] `"test": "vitest"` · `"test:run": "vitest run"`

확인할 내용 — 엔드포인트 하나에 하나씩, 그리고 규칙마다 하나씩:

- [ ] `POST /pages` → `201`, 응답이 `Page.parse()`를 통과한다
- [ ] 같은 ID 로 두 번 생성 → 두 번째 `200`, DB 에는 하나
- [ ] `GET /pages` → `(parentId, position, id)` 정렬 확인
- [ ] `GET /pages/:id` → 생성한 Page 와 같다
- [ ] 없는 Page → `404`
- [ ] 없는 Route → 공통 에러 JSON

> mock DB 를 쓰지 않습니다. 테스트 DB 는 `prisma migrate`가 없으면 직접 만듭니다.
>
> **`position` 중간 삽입 50회 테스트는 B2입니다.** 재배치 코드가 B2에 생기므로 지금은 테스트할 대상이 없습니다.

---

## 9. 마무리

README 에 다음을 정리합니다.

- [ ] 실행 방법
- [ ] 폴더 구조
- [ ] DB Migration / Seed 방법
- [ ] API 계약 문서 위치
- [ ] Swagger `/docs`

커밋 나누기:

```
feat: Page 와 Workspace 데이터 모델          ← 완료
refactor: 앱 조립과 부팅 분리                ← 완료
feat: 첫 마이그레이션과 시드                 ← 완료
feat: prisma 와 request-id 를 app 에 붙인다  ← 완료
feat: 통일된 에러 처리                       ← 완료
feat: 프론트와 합의한 페이지 계약 스키마
feat: 페이지 생성과 조회
feat: contract 스키마로 OpenAPI 문서 생성
test: 테스트 환경 구성
docs: README
```

---

## 이번 스프린트에서 하지 않는 것

| 미룬 것                           | 언제              | 왜                                                                                                     |
| --------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------ |
| `PATCH` · `DELETE /pages/:id`     | B2                | 고치기·옮기기·지우기가 한 기능 묶음입니다                                                              |
| `UpdatePageInput`                 | B2                | `PATCH` 없이 적으면 `.optional()`/`.nullable()` 구분이 맞는지 확인할 방법이 없습니다                   |
| `positionBetween` · `rebalance`   | B2                | B1은 **맨 뒤에 붙이기**만 합니다. 중간에 끼워넣는 요청 자체가 없습니다                                 |
| `lib/tree.ts` 순환 차단           | B2                | 부모를 바꾸는 요청이 B2에 생깁니다                                                                     |
| `Page.deletedAt` 컬럼             | B2                | 지우는 기능이 B2입니다. nullable 컬럼 추가는 백필이 없어 마이그레이션 한 줄입니다                      |
| `(workspaceId, deletedAt)` 인덱스 | 느린 게 측정될 때 | 이 인덱스를 탈 쿼리가 아직 없습니다. `CREATE INDEX`는 언제든 한 줄입니다                               |
| 목록 필터(`?parentId=` 등)        | 필요해질 때       | 지금은 프론트가 전부 받아서 조립합니다. 조건이 필요한 화면이 아직 없습니다                             |
| `GET /ready`                      | 배포가 생길 때    | 지금 이걸 호출할 오케스트레이터가 없습니다. `SELECT 1` 한 줄이라 그때 붙여도 5분입니다                 |
| `baseVersion` 전달 방법           | B3                | 실제 저장 충돌을 붙여 보고 정합니다 ([계약 2번](api-contract.md#2-baseversion-을-어디로-보낼지--보류)) |
| `User` · `WorkspaceMember` · 인증 | B4                | 아래 도메인 범위                                                                                       |

### 도메인 범위

**`Workspace`** — `Page`가 소속을 가리킬 곳이라 같이 만들지만 **설계할 것이 없습니다.** B4 전까지 시드로 만든 1개로 고정이고, 고르는 화면도 엔드포인트도 없습니다.

**`User` · `WorkspaceMember`** — B4입니다. B1~B3 엔드포인트 중 `User` 행을 읽는 것이 하나도 없고, B4에서 비밀번호 해시와 `color`가 붙으면서 어차피 마이그레이션이 한 번 더 필요합니다.

다만 컬럼 이름(`createdBy` `updatedBy`)과 값(`local-user`)은 지금 고정합니다 — 값이 찬 테이블에 NOT NULL 컬럼을 나중에 끼워넣는 쪽이 비싸고, FK를 나중에 거는 건 `ALTER TABLE` 한 줄입니다.

---

## 완료 조건

**돈다**

- [ ] `npm run typecheck` · `npm run build` · `npm run test:run` 세 개 통과
- [ ] clone 한 새 폴더에서 아래 순서로 서버가 뜬다

```
.env.local 작성
   ↓
db:up
   ↓
db:migrate
   ↓
db:seed
   ↓
npm run dev
```

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

프론트에서 다음이 됩니다.

```
페이지 생성
   ↓
POST /pages
   ↓
사이드바 목록 조회
   ↓
GET /pages
   ↓
페이지 클릭
   ↓
GET /pages/:id
   ↓
페이지 내용 표시
```

mock 대신 이 서버로 **페이지를 만들고 · 목록에 그리고 · 열어볼 수 있습니다.** 수정 · 삭제 · 이동은 다음 스프린트입니다.

계약도 같이 굳었습니다. **B2에서 만들 수정·이동·삭제가 어떤 모양이어야 하는지가 더 이상 애매하지 않습니다.**

---

← [서버 구조](architecture.md) · 다음 → [B2](sprint-2.md)
