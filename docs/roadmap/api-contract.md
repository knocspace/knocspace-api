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
| id | 문자열. 서버가 형식을 강제하지 않고 길이만 제한 (1~64자) |
| 인증 | `Authorization: Bearer <accessToken>` (B4부터) |
| 요청 추적 | 모든 응답에 `x-request-id` |

### 성공 응답

**봉투(envelope)를 씌우지 않습니다.** 리소스를 그대로 돌려줍니다.

```json
{ "id": "p_a1", "title": "회의록", "version": 3, ... }
```

목록은 배열 그대로입니다. 페이지네이션이 필요해지는 곳(B5 검색, B7 행 조회)만 `{ items, nextCursor }`를 씁니다.

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

### 페이지 — B2

| 메서드 | 경로 | 요청 | 응답 | B |
|---|---|---|---|---|
| GET | `/pages/tree` | — | `PageSummary[]` | B2 |
| GET | `/pages/:id` | — | `Page` | B2 |
| POST | `/pages` | `CreatePageInput` | `201 Page` | B2 |
| PATCH | `/pages/:id` | `UpdatePageInput` (+ `If-Match`) | `Page` | B2·B3 |
| DELETE | `/pages/:id` | — | `204` | B2 |

- `GET /pages/tree` 는 `deletedAt`이 있는 페이지를 **빼고** 돌려줍니다. 정렬은 `(parentId, position, id)`
- `POST /pages` 는 `input.id`가 이미 있으면 새로 만들지 않고 **기존 페이지를 그대로 돌려줍니다**(멱등). 자동 저장 중 재시도가 페이지를 두 개 만들면 안 됩니다
- `PATCH`는 **본문에 있는 필드만** 바꿉니다. `"parentId": null`은 "최상위로 옮기기", 필드가 아예 없으면 "안 건드림"입니다
- `DELETE`는 `deletedAt`만 채웁니다. 실제로 지우는 것은 `/purge`(B5)입니다

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
| `GET /pages/trash` · `POST /pages/:id/restore` · `DELETE /pages/:id/purge` | B5 |
| `GET /search?q=&scope=&limit=` | B5 |
| `POST /uploads` · `POST /uploads/:id/complete` | B6 |
| `/databases/*` · `POST /databases/:id/rows/query` | B7 |
| `WS /collab?room=page:{id}` | B8 |

### 운영

| 경로 | 내용 |
|---|---|
| `GET /health` | 프로세스가 살아 있는지. DB를 건드리지 않습니다 |
| `GET /ready` | DB 연결까지 확인. 배포 시 트래픽 투입 판단용 |

---

## 결정이 필요한 것

프론트 `types/api.ts`를 그대로는 서버로 옮길 수 없습니다. **B1에서 프론트와 함께 결정하고, 결정한 내용을 이 문서에 확정으로 옮겨 적습니다.**

### 1. `ApiErrorCode`에 없는 코드가 있습니다

프론트 정의는 `not_found | version_conflict | unauthorized | forbidden | network | unknown` 여섯 개입니다. 서버는 **`validation`(400), `too_large`(413), `rate_limited`(429)** 를 보내야 합니다.

**권장** — 프론트 `ApiErrorCode`에 세 개를 추가합니다. 지금 안 넣으면 F9에서 이 세 가지가 전부 `unknown`으로 뭉개져서, 사용자가 "뭐가 잘못됐는지" 모릅니다.

### 2. `baseVersion`을 어디로 보낼지

프론트 시그니처는 `updatePage(id, patch, { baseVersion })`로, 본문(`patch`)과 옵션이 분리돼 있습니다.

**권장 — `If-Match: "3"` 헤더.** 본문은 `UpdatePageInput`과 정확히 같은 모양으로 남고, 옵션→헤더 변환은 프론트 `api/client.ts` 안에서 끝납니다. F9의 "화면 코드 0줄 수정" 기준을 그대로 지킬 수 있습니다.

- 헤더가 없으면 충돌 검사를 하지 않습니다 (제목만 고치는 경우)
- 값이 서버 `version`과 다르면 `409`, 이때 응답 본문에 **서버의 현재 `Page`를 같이 담습니다.** 프론트 충돌 다이얼로그의 "서버 것 불러오기"가 요청을 한 번 더 하지 않아도 되게.

### 3. `position` 은 소수를 계속 끼워넣을 수 없습니다

두 형제 사이 중간값을 반복해서 넣으면 `float64`는 **50번 안쪽에서 두 값이 같아집니다.** 트리 드래그 이동(F5)에서 실제로 발생합니다.

**권장** — `Float`를 유지하되 규칙 두 개를 둡니다.

1. 새 위치는 앞뒤 평균. 형제가 없으면 `1024`, 맨 뒤면 `마지막 + 1024`
2. 앞뒤 간격이 `1e-6` 미만이면 **그 부모의 형제 전체를 `1024` 간격으로 다시 매깁니다**(rebalance). 같은 트랜잭션 안에서 하고, 응답에 바뀐 형제들을 함께 돌려줍니다

문자열 fractional index는 더 튼튼하지만 `position: number` 계약을 깨야 해서 지금은 안 씁니다.

### 4. 페이지를 지우면 자손은 어떻게 되나

프론트 F5 완료 조건은 "복구하면 원래 부모 아래로 돌아간다"입니다.

**권장** — 자손 전부에 `deletedAt`을 같은 값으로 찍되, **휴지통 목록에는 지운 뿌리만 보여줍니다.** 자손은 `parentId`를 그대로 두므로 복구는 뿌리 하나의 `deletedAt`만 지우면 끝납니다. `deletedAt` 값이 같은지로 "같이 지워진 것"을 판별합니다.

### 5. 로그인이 B4인데 `createdBy`는 처음부터 있습니다

**권장** — B1 마이그레이션에서 워크스페이스 1개와 사용자 1명(`local-user`)을 시드로 넣고, B4 전까지 모든 요청이 그 사용자로 동작합니다. B4에서 시드를 지우는 게 아니라 **실제 계정으로 승격**시킵니다. 데이터를 버리지 않기 위해서입니다.

### 6. 그 외 확정해 둘 잔가지

| 항목 | 권장 |
|---|---|
| `content` 최대 크기 | 1MB. 넘으면 `413 too_large` |
| `title` 최대 길이 | 512자. 넘으면 자르지 않고 `400` |
| `BlockDoc.schemaVersion` | 서버는 값만 저장하고 해석하지 않습니다. 모르는 값이어도 거절하지 않습니다 |
| `hasChildren` | 삭제되지 않은 자식이 1개 이상 있는지 |
| `PageSummary.icon` | B6 전까지 항상 `null`. 필드는 지금부터 있습니다 |
| `User.color` | 가입 시 고정 팔레트에서 배정. B8 커서 색으로 그대로 씁니다 |
| 트리 응답 상한 | 워크스페이스당 5000행. 넘으면 B5에서 지연 로딩으로 바꿉니다 |

---

← [백엔드 범위](scope.md) · 다음 → [서버 구조](architecture.md)
