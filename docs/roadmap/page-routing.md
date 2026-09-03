# Page URL · API Path 설계

← [로드맵으로](../../ROADMAP.md)

> Notion의 페이지 URL과 공식 API 구조를 기준으로, **브라우저에 보이는 Page URL**과
> **서버 API Path**를 분리해서 정합니다.

---

## 1. 먼저 구분할 것

페이지를 열 때 쓰이는 경로는 두 종류입니다.

```
사용자
  ↓
브라우저 Page URL
  ↓
Frontend Router
  ↓
Server API Path
  ↓
Page 조회
```

둘은 역할이 다릅니다.

| 구분 | 역할 | 예시 |
|---|---|---|
| 브라우저 Page URL | 사용자가 페이지에 접근하는 주소 | `/프로젝트-정리-{pageId}` |
| Server API Path | 프론트가 서버에 Page 데이터를 요청하는 주소 | `GET /api/v1/pages/{pageId}` |

**브라우저 URL을 그대로 서버 API Path로 쓰지 않습니다.**

---

## 2. Notion은 어떻게 되어 있나

### 브라우저 Page URL

Notion의 일반적인 페이지 URL에는 제목이 포함될 수 있고, 뒤에 Page ID가 붙습니다.

```
https://www.notion.so/Bug-bash-be633bf1dfa0436db259571129a590e5
                      └ title ┘ └───────── pageId ──────────┘
```

Page ID 자체는 UUID 형태입니다.

```
be633bf1-dfa0-436d-b259-571129a590e5
```

URL에서는 `-`가 제거된 32자리 형태로 나타날 수 있습니다.

```
be633bf1dfa0436db259571129a590e5
```

핵심은 **title이 Page의 식별자가 아니라 Page ID가 실제 식별자**라는 것입니다.

또한 Notion URL이 항상 title을 요구하지도 않습니다.

```
https://www.notion.so/e604f78c414548c6b7d51adea4fadddd
```

처럼 Page ID만으로 된 URL도 동작합니다. 즉 브라우저 URL에서의 규칙은 이렇습니다.

```
title   → 사람이 알아보기 위한 표시
pageId  → 실제 Page 식별
```

### 서버 API Path

Notion 공식 API에서는 title을 Path에 쓰지 않습니다.

```http
POST /v1/pages
GET  /v1/pages/{page_id}
```

예:

```http
GET /v1/pages/be633bf1-dfa0-436d-b259-571129a590e5
```

즉 서버에서는 **Page ID만 가지고 Page를 조회**합니다.

---

## 3. knocspace 기준

브라우저 URL과 서버 API를 분리합니다.

### 브라우저 Page URL

사용자에게 보이는 URL은 다음 형태로 가져갑니다.

```
/{title}-{pageId}
```

예:

```
/프로젝트-정리-be633bf1dfa0436db259571129a590e5
/My-Project-be633bf1dfa0436db259571129a590e5
```

URL 에 들어가는 pageId 는 하이픈이 없는 32자리 표기입니다. **서버는 하이픈 있는
정규형만 받습니다.** 32자리를 정규형으로 되돌리는 것은 프론트 라우터의 몫이고,
그래야 서버가 같은 페이지를 두 가지 문자열로 보지 않습니다.

여기서 title 부분은 **URL 가독성을 위한 값**입니다.

```
프로젝트-정리-be633bf1dfa0436db259571129a590e5
└───┬────┘ └───────────┬────────────┘
   title              pageId
  표시 목적           식별 목적
```

한글 title도 그대로 씁니다. 공백만 `-`로 바꿉니다.

```
프로젝트 정리  →  프로젝트-정리
```

브라우저·HTTP 계층에서 한글이 percent encoding되어 전달될 수 있지만,
애플리케이션에서 **별도의 영문 slug를 만들지는 않습니다.**

### 서버 API Path

서버 API에는 title을 넣지 않습니다. 기본 경로는 `/api/v1`입니다.

```http
POST /api/v1/pages
GET  /api/v1/pages
GET  /api/v1/pages/{pageId}
```

상세 조회 예:

```http
GET /api/v1/pages/be633bf1-dfa0-436d-b259-571129a590e5
```

역할이 이렇게 나뉩니다.

```
브라우저
/프로젝트-정리-be633bf1dfa0436db259571129a590e5
        ↓
Frontend Router — pageId 추출
        ↓
Server API
GET /api/v1/pages/be633bf1-dfa0-436d-b259-571129a590e5
        ↓
DB
Page.id = be633bf1-dfa0-436d-b259-571129a590e5
```

---

## 4. title이 바뀌면

Page를 식별하는 기준은 `pageId`이므로 title 변경과 Page ID는 독립입니다.

```
변경 전  /프로젝트-정리-{pageId}
변경 후  /2026년-프로젝트-정리-{pageId}
```

둘 다 같은 `pageId`를 가리킵니다. 따라서 DB 조회는 항상 `Page.id = pageId` 기준입니다.

**title로 Page를 조회하지 않습니다.**

---

## 5. Page ID 규칙

Page ID 는 UUID 를 씁니다. Notion 과 같은 형식이고, 클라이언트가 만들어 보냅니다.

```
be633bf1-dfa0-436d-b259-571129a590e5
```

```
Page
├── id      UUID
├── title   String
└── ...
```

---

## 6. 최종 기준

| 항목 | knocspace 기준 |
|---|---|
| Page 실제 식별자 | `pageId` |
| Page ID 형식 | UUID |
| title | 표시용 값 |
| 브라우저 URL | `/{title}-{pageId}` |
| 한글 title | 허용, 공백은 `-`로 표기 |
| 상세 조회 API | `GET /api/v1/pages/{pageId}` |
| 서버가 받는 pageId | 하이픈 있는 정규형만 (`z.uuid()`) |
| API Path에 title 포함 | 하지 않음 |
| title로 DB 조회 | 하지 않음 |
| title 변경 시 Page ID 변경 | 하지 않음 |

핵심은 다음 한 줄입니다.

> **브라우저 URL은 사람이 읽기 좋게 `title + pageId`를 쓰고, 서버 API와 DB에서는 `pageId`만 Page 식별자로 쓴다.**

---

## 7. 계약에 반영한 것

이 문서의 기준은 [API 계약](api-contract.md#공통-규약)·[B1](sprint-1.md)·[서버 구조](architecture.md)에 들어가 있습니다.

| | |
|---|---|
| `id` 형식 | UUID. 서버는 하이픈 있는 정규형만 받습니다 (`z.uuid()`) |
| 만드는 쪽 | 클라이언트. 그대로 둡니다 |
| `prisma/schema.prisma` | 안 바뀝니다. `Page.id` 는 `String @id` 이고 `@default` 가 없습니다 |

바뀐 것은 **형식뿐입니다.** 만드는 쪽을 서버로 옮기지 않은 이유는 두 가지가
클라이언트가 요청을 보내기 전에 id 를 알고 있는 것을 전제하기 때문입니다.

- [`POST /pages` 의 멱등 규칙](api-contract.md#엔드포인트) — 같은 id 가 이미 있으면 새로 만들지 않고 기존 페이지를 돌려줍니다. 보낼 id 를 클라이언트가 정해야 성립합니다
- 페이지를 만들자마자 `/{title}-{pageId}` 로 이동합니다. 서버 응답을 기다려야 주소를 안다면 이 URL 설계가 한 박자 늦습니다

서버가 만들게 하려면 이 둘을 같이 뜯어야 하는데, 지금 그럴 이유가 없습니다.

`String @id` 에 `@default(uuid())` 를 붙이지도 않습니다. 붙이면 id 없이 들어온
요청도 행이 만들어져서 "클라이언트가 만든다"는 규칙에 구멍이 납니다.

### UUID 가 권한 확인을 대신하지 않습니다

`POST /pages` 는 보낸 id 로 기존 페이지가 있는지 **먼저 확인합니다.** 이 조회는
워크스페이스를 가리지 않는 전역 PK 조회라, [B4 에서 `workspaceId` 조건을
붙입니다](sprint-4.md). id 가 UUID 가 되어 찍어 맞히기는 어려워졌지만 그 조건은
그대로 필요합니다. 어려운 것과 막힌 것은 다르고, 공유 링크로 새어 나간 id
하나면 같은 일이 벌어집니다.

형식 검증은 이 조회보다 앞에 섭니다. 정규형이 아닌 id 는 DB 를 보기 전에
`400 validation` 으로 끊깁니다.

남은 것은 프론트 `src/types/api.ts` 동기화입니다. 계약을 고친 날과
[같은 날](conventions.md#api-변경-규칙) 맞춥니다.

---

## 참고한 Notion 공식 문서

- Page object — `https://developers.notion.com/reference/page`
- Working with page content — `https://developers.notion.com/guides/data-apis/working-with-page-content`
- Retrieve a page — `https://developers.notion.com/reference/retrieve-a-page`
