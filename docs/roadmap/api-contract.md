# API 계약

← [로드맵으로](../../ROADMAP.md)

프론트 `src/types/api.ts`와 이 서버 사이의 약속입니다. **엔드포인트를 만들거나 고치기 전에 항상 여기를 먼저 봅니다.**

---

## 유일한 출처

타입은 두 곳에 적으면 반드시 어긋납니다. 규칙 하나만 지킵니다.

> **`knocspace-api/src/contract/` 가 원본이고, 프론트 `src/types/api.ts` 가 사본입니다.**

- 서버는 `contract/`의 zod 스키마로 **요청을 검증하고 응답을 만듭니다**
- 프론트는 같은 내용을 타입으로만 가집니다 (런타임 검증은 F9에서 붙습니다)
- 한쪽만 고치지 않습니다. 계약 변경은 [양쪽을 같은 날](conventions.md#api-변경-규칙) 반영합니다

```ts
// src/contract/page.ts — 타입을 손으로 두 번 적지 않습니다
export const PageSummary = z.object({ ... });
export type PageSummary = z.infer<typeof PageSummary>;
```

---

## 공통 규약

| 항목 | 값 |
|---|---|
| 기본 경로 | `/api/v1` |
| 형식 | JSON. 요청·응답 모두 `application/json` |
| 날짜 | ISO-8601 UTC, `Z` 로 끝남 (`2026-08-24T01:23:45.678Z`) |
| id | 문자열. 클라이언트가 만들어 보냅니다. 서버는 형식을 강제하지 않고 `[A-Za-z0-9_-]{1,64}` 만 확인합니다 |
| 인증 | `Authorization: Bearer <accessToken>` (B4부터) |
| 요청 추적 | 모든 응답에 `x-request-id` |

### 성공 응답

**봉투(envelope)를 씌우지 않습니다.** 리소스를 그대로 돌려줍니다.

```json
{ "id": "p_a1", "title": "회의록", "version": 3, ... }
```

목록은 배열 그대로입니다. 페이지네이션이 필요해지는 곳(B6 행 조회, B7 검색)만 `{ items, nextCursor }`를 씁니다.

### 에러 응답

```json
{ "error": { "code": "version_conflict", "message": "다른 곳에서 먼저 저장했어요" } }
```

| HTTP | `code` | 언제 |
|---|---|---|
| 400 | `validation` | 요청 본문·쿼리가 스키마와 다름 |
| 401 | `unauthorized` | 토큰 없음·만료 |
| 403 | `forbidden` | 권한 부족 (편집 권한 없이 수정) |
| 404 | `not_found` | 없거나, 볼 권한이 없음 |
| 409 | `version_conflict` | `baseVersion`이 서버 `version`과 다름 |
| 413 | `too_large` | 본문 크기 초과 |
| 429 | `rate_limited` | 요청 과다 |
| 500 | `unknown` | 서버 오류. `message`에 내부 사정을 담지 않습니다 |

`network`는 서버가 보내지 않습니다. 프론트가 요청 자체를 실패했을 때 쓰는 코드입니다.

**404와 403의 구분** — 볼 권한이 없는 리소스는 `404`를 돌려줍니다. `403`을 주면 "그 id가 존재한다"는 사실이 새어 나갑니다. `403`은 **볼 수는 있는데 고칠 수 없을 때만** 씁니다.

---

## 엔드포인트

`B` 열은 어느 스프린트에서 생기는지입니다.

### 페이지 — B1·B2

| 메서드 | 경로 | 요청 | 응답 | B |
|---|---|---|---|---|
| GET | `/pages` | — | `PageSummary[]` | B1 |
| GET | `/pages/:id` | — | `Page` | B1 |
| POST | `/pages` | `CreatePageInput` | `201 Page` | B1 |
| PATCH | `/pages/:id` | `UpdatePageInput` (+ `If-Match`) | `Page` | B2·B3 |
| DELETE | `/pages/:id` | — | `204` | B2 |

- `GET /pages` 는 `deletedAt`이 있는 페이지를 **빼고** 돌려줍니다. 정렬은 `(parentId, position, id)`
  - 응답은 중첩 트리가 아니라 **평평한 배열**입니다. 트리로 조립하는 건 프론트가 합니다
  - 쿼리 파라미터는 없습니다. 부분 로딩(`?parentId=`)이나 휴지통(`?deleted=`)이 필요해지면 **같은 경로에 조건을 붙입니다.** 목록마다 경로를 새로 파지 않습니다
- `POST /pages` 는 `input.id`가 이미 있으면 새로 만들지 않고 **기존 페이지를 그대로 돌려줍니다**(멱등). 자동 저장 중 재시도가 페이지를 두 개 만들면 안 됩니다
  - 이 조회도 **내 워크스페이스 안에서만** 합니다(B4부터). 남의 워크스페이스 id를 찍어 보낸 요청에 그 페이지를 돌려주면 남의 문서가 그대로 나갑니다
- `PATCH`는 **본문에 있는 필드만** 바꿉니다. `"parentId": null`은 "최상위로 옮기기", 필드가 아예 없으면 "안 건드림"입니다
- `DELETE`는 `deletedAt`만 채웁니다. 실제로 지우는 것은 `/purge`(B7)입니다

### 인증 — B4

| 메서드 | 경로 | 내용 |
|---|---|---|
| POST | `/auth/login` | `{ email, password }` → `{ accessToken, user }` + refresh 쿠키 |
| POST | `/auth/refresh` | 쿠키로 갱신 → `{ accessToken }` |
| POST | `/auth/logout` | 쿠키 폐기 → `204` |
| GET | `/auth/me` | `User` |
| GET | `/workspaces/me` | 내가 속한 워크스페이스 목록 |

### 그 이후

| 경로 | B |
|---|---|
| `/databases/*` — `Database` `Property` `Row` CRUD | B5 |
| `POST /databases/:id/rows/query` | B6 |
| `GET /pages/trash` · `POST /pages/:id/restore` · `DELETE /pages/:id/purge` | B7 |
| `GET /search?q=&scope=&limit=` | B7 |
| `POST /uploads` · `POST /uploads/:id/complete` | B8 |
| `WS /collab?room=page:{id}` | B9 |
| `POST /workspaces` · `PATCH /workspaces/:id` · `DELETE /workspaces/:id` | 회원가입이 생길 때 |

워크스페이스를 만드는 경로가 B4에도 없는 이유는 [B4 — 워크스페이스를 만드는 API는 B4에 없습니다](sprint-4.md#워크스페이스를-만드는-api는-b4에-없습니다)에 적었습니다. 프론트에 워크스페이스를 만드는 화면이 생기면 그때 이 표에서 위로 올리고 모양을 정합니다.

여기 경로는 **아직 확정이 아닙니다.** 특히 휴지통 세 개는 B7을 시작할 때 `GET /pages?deleted=true` 쪽으로 맞출지 그때 정합니다 — 쓰는 화면이 없는 지금 정하면 근거가 없습니다.

### 운영

| 경로 | 내용 | B |
|---|---|---|
| `GET /health` | 프로세스가 살아 있는지. DB를 건드리지 않습니다 | B0 |
| `GET /docs` · `GET /docs/json` | Swagger UI와 OpenAPI 문서. `contract/` 스키마에서 생성합니다 | B1 |
| `GET /ready` | DB 연결까지 확인. 배포 시 트래픽 투입 판단용 | 배포가 생길 때 |

---

## 결정이 필요한 것

프론트 `types/api.ts`를 그대로는 서버로 옮길 수 없습니다. **B1에서 프론트와 함께 결정하고, 결정한 내용을 이 문서에 확정으로 옮겨 적습니다.**

6개 중 5개는 확정했고, 1개(`If-Match` 헤더)만 아래 이유로 아직 보류입니다.

### 1. `ApiErrorCode` — 확정

서버는 `validation`(400) · `too_large`(413) · `rate_limited`(429) 세 개를 프론트 여섯 개(`not_found | version_conflict | unauthorized | forbidden | network | unknown`)에 추가로 보냅니다.

`network`는 서버가 보내지 않는 클라이언트 전용 코드라 서버 `contract/error.ts`에는 넣지 않습니다. 프론트 `ApiErrorCode`에는 세 개를 추가했습니다.

### 2. `baseVersion`을 어디로 보낼지 — 보류

프론트 시그니처는 `updatePage(id, patch, { baseVersion })`로, 본문(`patch`)과 옵션이 분리돼 있습니다.

잠정안(코드에는 아직 반영 안 함) — `If-Match: "3"` 헤더. 본문은 `UpdatePageInput`과 정확히 같은 모양으로 남고, 옵션→헤더 변환은 프론트 `api/client.ts` 안에서 끝납니다.

- 헤더가 없으면 충돌 검사를 하지 않습니다 (제목만 고치는 경우)
- 값이 서버 `version`과 다르면 `409`, 이때 응답 본문에 **서버의 현재 `Page`를 같이 담습니다.** 프론트 충돌 다이얼로그의 "서버 것 불러오기"가 요청을 한 번 더 하지 않아도 되게.

### 3. `position` 은 소수를 계속 끼워넣을 수 없습니다 — 확정

두 형제 사이 중간값을 반복해서 넣으면 `float64`는 **50번 안쪽에서 두 값이 같아집니다.** 트리 드래그 이동(F5)에서 실제로 발생합니다.

**`Float` 그대로 갑니다.** 문자열 fractional index([참고](https://liveblocks.io/blog/how-crdts-and-sync-engines-keep-realtime-lists-ordered-with-fractional-indexing))는 여러 사람이 **동시에** 같은 리스트를 재배치해도 충돌 없이 병합되게 하는 CRDT 해법입니다. 지금은 F8이 단일 사용자 드래그 이동이라 그 문제 자체가 없고, KISS·YAGNI 원칙상 아직 없는 동시 편집 요구를 미리 설계하지 않습니다. B9에서 실시간 협업 편집이 붙을 때, 페이지 순서도 동시에 바뀌는 시나리오가 실제로 생기면 그때 다시 판단합니다.

1. `Float` 유지. 새 위치는 앞뒤 평균. 형제가 없으면 `1024`, 맨 뒤면 `마지막 + 1024`
2. 앞뒤 간격이 `1e-6` 미만이면 그 부모의 형제 전체를 `1024` 간격으로 다시 매깁니다(rebalance)

### 4. 페이지를 지우면 자손은 어떻게 되나 — 확정

자손 전부에 `deletedAt`을 같은 값으로 찍되, **휴지통 목록에는 지운 뿌리만 보여줍니다.** 자손은 `parentId`와 `position`을 그대로 두므로 복구는 뿌리 하나의 `deletedAt`만 지우면 끝나고, 원래 위치까지 그대로 보존됩니다. `deletedAt` 값이 같은지로 "같이 지워진 것"을 판별합니다.

**노션 실측 대비** — 노션도 부모를 지우면 자손 전체가 같이 휴지통에 들어가고, 부모를 복구하면 자손 전체가 함께 돌아오는 것까지는 같은 원칙입니다. 다만 노션은 복구된 항목을 원래 자리가 아니라 담긴 컨테이너의 **맨 아래로** 옮깁니다 — 우리는 `position`을 안 건드리므로 그 처리가 필요 없고, 원래 자리까지 정확히 복구됩니다.

### 5. 로그인이 B4인데 `createdBy`는 처음부터 있습니다 — 확정

`Page.createdBy` `Page.updatedBy`는 B1부터 필수 필드로 존재하지만, **B1에서는 `String` 컬럼일 뿐 `User`를 참조하지 않습니다.** 시드는 이 두 칸에 `local-user` 문자열을 넣습니다.

`User` `WorkspaceMember` 모델과 FK는 B4에서 함께 만듭니다. B1~B3 엔드포인트 중 `User` 행을 읽는 것이 하나도 없고, B4에서 비밀번호 해시와 `color`가 붙으면서 어차피 마이그레이션이 한 번 더 필요합니다.

지금 고정하는 것은 **컬럼 이름과 시드 값**입니다 — 값이 찬 테이블에 NOT NULL 컬럼을 나중에 끼워넣는 쪽이 비싸고, FK를 나중에 거는 건 `ALTER TABLE` 한 줄입니다. B4에서 `local-user`를 실제 계정으로 승격시키면 기존 페이지의 `createdBy`/`updatedBy`는 값 변경 없이 그대로 유지됩니다.

### 6. 그 외 확정한 잔가지

| 항목 | 확정 |
|---|---|
| `content` 최대 크기 | 1MB. 넘으면 `413 too_large` |
| `title` 최대 길이 | 512자. 넘으면 자르지 않고 `400` |
| `BlockDoc.schemaVersion` | 서버는 값만 저장하고 해석하지 않습니다. 모르는 값이어도 거절하지 않습니다 |
| `hasChildren` | 삭제되지 않은 자식이 1개 이상 있는지 |
| `PageSummary.icon` | B8 전까지 항상 `null`. 필드는 지금부터 있습니다 |
| `User.color` | 가입 시 고정 팔레트에서 배정. B9 커서 색으로 그대로 씁니다 |
| 트리 응답 상한 | 워크스페이스당 5000행. 넘으면 B7에서 지연 로딩으로 바꿉니다 |

**노션 실측 대비** — 노션 공개 API는 리치 텍스트 블록당 2,000자·요청당 최대 100블록(≈200KB)으로 제한합니다. `content` 1MB, `title` 512자는 그보다 넉넉하게 잡은 값입니다. 트리 응답 상한만 다른 방향인데, 노션은 사이드바를 **처음부터 지연 로딩**해서 전체 트리를 한 번에 안 가져오지만, 지금은 사이드바 컴포넌트를 다시 짜야 하는 비용 때문에 5000행까지는 한 번에 가져오는 단순한 방식을 쓰고 B7에서 지연 로딩으로 전환하기로 미뤘습니다.

---

← [백엔드 범위](scope.md) · 다음 → [서버 구조](architecture.md)
