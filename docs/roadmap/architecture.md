# 서버 구조

← [로드맵으로](../../ROADMAP.md)

파일을 어디에 만들지, 무엇이 무엇을 알아도 되는지에 대한 기준입니다.

---

## 폴더 구조

```
src/
├── server.ts      부팅만. 여기엔 로직이 없습니다
├── app.ts         Fastify 조립. 테스트가 이걸 그대로 씁니다
├── config.ts      env 읽기와 검증. process.env 를 부르는 유일한 곳
├── contract/      프론트와의 약속 (zod). 유일한 출처
├── plugins/       가로지르는 관심사
├── modules/       도메인별 route + service + repository
├── lib/           순수 함수 (Fastify도 Prisma도 모름)
└── db/            PrismaClient 인스턴스와 트랜잭션 헬퍼
```

### 각 폴더에 들어가는 것

**`src/contract/`** — [API 계약](api-contract.md)의 코드판. `page.ts` `auth.ts` `error.ts`. 프론트에 그대로 넘길 수 있는 상태로 유지합니다.

**`src/plugins/`** — 요청마다 도는 공통 처리.

```
prisma.ts         app.db 로 붙임
error-handler.ts  모든 오류를 계약된 JSON 한 형태로
request-id.ts     x-request-id 발급·전파
auth.ts           Bearer 검증 → request.user       (B4)
rate-limit.ts                                      (B4)
```

**`src/modules/`** — 도메인 하나가 폴더 하나입니다.

```
pages/
  pages.routes.ts   HTTP만. 파싱 → service 호출 → 상태 코드
  pages.service.ts  도메인 규칙. Fastify를 모릅니다
  pages.repo.ts     Prisma 쿼리
  pages.test.ts
auth/  search/  files/  databases/  collab/
```

**`src/lib/`** — 테스트하기 쉬운 순수 함수. `position.ts`(순서 계산·재배치), `tree.ts`(순환 검사), `id.ts`, `password.ts`.

**`src/db/`** — `PrismaClient`를 만드는 유일한 곳.

---

## 지켜야 할 경계

이 표가 지켜지면 B8에서 저장 방식이 바뀌어도 라우트를 안 고칩니다.

| 레이어 | 아는 것 | 몰라야 하는 것 |
|---|---|---|
| `routes` | HTTP, contract, service | Prisma, 도메인 규칙 |
| `service` | 도메인 규칙, repo, contract 타입 | `request` / `reply`, HTTP 상태 코드 |
| `repo` | Prisma, 테이블 모양 | 도메인 규칙, HTTP |
| `lib` | 값과 계산 | 전부 |

**확인 방법** — 스프린트가 끝날 때 아래가 전부 0이어야 합니다.

```bash
grep -rn "prisma\." src/modules/*/*.routes.ts
```
```bash
grep -rnE "\b(request|reply)\b" src/modules/*/*.service.ts
```
```bash
grep -rn "process.env" src --include=*.ts | grep -v "src/config.ts"
```

서비스가 HTTP 상태 코드를 정하고 싶어지면, 그건 도메인 오류로 던지고 `error-handler`가 번역합니다.

```ts
// service
throw new AppError('version_conflict', '다른 곳에서 먼저 저장했어요', { current });
// error-handler 가 409 로 바꿉니다
```

---

## 요청 하나가 지나가는 길

```
요청
 → request-id       추적 id 발급
 → auth             토큰 → request.user            (B4)
 → routes           zod 로 params·body 검증
 → service          권한 확인 → 도메인 규칙 → repo
 → repo             Prisma
 → routes           contract 스키마로 응답 직렬화
 → error-handler    던져진 오류를 계약된 JSON 으로
```

응답도 **contract 스키마를 통과시켜서** 내보냅니다. 안 그러면 `passwordHash` 같은 게 어느 날 조용히 섞여 나갑니다.

---

## 트랜잭션과 동시성

| 상황 | 방법 |
|---|---|
| 페이지 저장 | `UPDATE ... WHERE id = ? AND version = ?` → 0행이면 `version_conflict` |
| 페이지 이동 + 순서 재배치 | 한 트랜잭션. 형제 전체를 다시 매기는 경우 포함 |
| 삭제 (자손 포함) | 한 트랜잭션. 재귀 CTE 한 번으로 자손을 모읍니다 |
| 같은 페이지 연속 저장 | 잠그지 않습니다. 낙관적 버전 검사로 충분합니다 |

**`SELECT` 후 `UPDATE`로 버전을 확인하지 않습니다.** 두 요청이 같은 버전을 읽고 둘 다 성공합니다. 조건을 `UPDATE` 문 안에 넣어야 합니다.

---

## 데이터 모델 (B1에서 확정)

```
Workspace  1 ── n  Membership  n ── 1  User
Workspace  1 ── n  Page  ── self(parentId)
```

| 테이블 | 눈여겨볼 점 |
|---|---|
| `Page.id` | 클라이언트가 만든 문자열을 그대로 PK로 씁니다 |
| `Page.content` | `Jsonb`. 서버는 열어보지 않습니다 |
| `Page.version` | 저장할 때마다 +1 |
| `Page.deletedAt` | soft delete. 조회는 전부 이 조건이 붙습니다 (B2부터) |
| `Page.position` | `Float`. 재배치 규칙은 [계약 문서](api-contract.md#3-position-은-소수를-계속-끼워넣을-수-없습니다) |

인덱스는 **지금 도는 쿼리가 타는 것 하나**로 시작합니다. 목록 조회의 정렬 순서입니다.

```prisma
@@index([workspaceId, parentId, position])
```

더 붙이는 건 [성능 목표](#성능-목표)를 실제로 못 맞추는 게 확인된 뒤입니다. `CREATE INDEX`는 언제든 한 줄이고, 안 타는 인덱스는 쓰기만 느리게 합니다.

**스키마의 자세한 필드는 여기 적지 않습니다.** `prisma/schema.prisma`가 유일한 출처입니다.

---

## 설정

`src/config.ts` 하나에서 `process.env`를 읽고 zod로 검증합니다. **값이 없으면 부팅을 실패시킵니다.** 런타임에 `undefined`가 흘러다니는 것보다 낫습니다.

| 변수 | 용도 | 생기는 시점 |
|---|---|---|
| `DATABASE_URL` | Postgres | B1 |
| `PORT` · `NODE_ENV` | | B1 |
| `CORS_ORIGINS` | 쉼표 구분 | B1 |
| `JWT_SECRET` · `REFRESH_SECRET` | | B4 |
| `S3_*` | 파일 저장소 | B6 |

`.env.example`에는 **무엇을 채워야 하는지만** 적습니다. 실제 값은 절대 커밋하지 않습니다.

---

## 로그와 관측

Fastify 기본 로거(pino)를 씁니다. 별도 도구는 안 넣습니다.

- 모든 로그에 `requestId`가 붙습니다
- **본문·토큰·비밀번호는 로그에 남기지 않습니다.** `content`는 크기만 찍습니다
- 4xx는 `warn`, 5xx는 `error`. 정상 요청은 `info` 한 줄
- 개발에선 `pino-pretty`

---

## 테스트

| 종류 | 대상 | 방법 | 시작 |
|---|---|---|---|
| 유닛 | `lib/` — 순서 계산, 순환 검사 | Vitest, DB 없음 | B1 |
| 통합 | 라우트 한 개 | `app.inject()` + 실제 테스트 DB | B1 |
| 계약 | 응답이 `contract` 스키마를 만족하는가 | 통합 테스트에서 `parse()` | B1 |
| 부하 | 자동 저장 지속 | autocannon 스크립트 | B3 |

- **테스트는 mock DB를 쓰지 않습니다.** Postgres를 하나 더 띄웁니다. Prisma를 mock 하면 통과하는데 실제로는 안 도는 코드가 생깁니다
- 테스트마다 트랜잭션 롤백이 아니라 **테이블 truncate**로 격리합니다. 코드가 트랜잭션을 직접 쓰기 때문입니다
- 커버리지 목표는 두지 않습니다. 규칙 하나만 지킵니다 — **엔드포인트 하나에 통합 테스트 하나.**

---

## 성능 목표

측정 없이 최적화하지 않습니다. 이 숫자를 못 맞추는 게 확인되면 그때 손댑니다.

| 항목 | 목표 |
|---|---|
| `GET /pages` (1000행) | p95 200ms |
| `GET /pages/:id` | p95 100ms |
| `PATCH /pages/:id` (100KB 본문) | p95 150ms |
| 자동 저장 지속 (800ms 간격 × 10분) | 실패 0, 지연 증가 없음 |
| 콜드 스타트 | 3초 이내 |

---

← [API 계약](api-contract.md) · 다음 → [B1](sprint-1.md)
