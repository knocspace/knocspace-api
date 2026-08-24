# KnocSpace API 개발 로드맵

백엔드는 **도메인 단위로**, 프론트(`knocspace`)는 화면 단위로 각자 갑니다. 이 저장소는 도메인을 하나씩 완성해서 프론트가 갈아끼울 수 있게 내놓습니다.

- 스프린트 1개 = **1주**, 1인 개발 기준
- 백엔드 스프린트는 `B1`~`B9`, 프론트 스프린트는 `F1`~`F10`으로 적습니다
- 기준일: 2026-08-25

---

## 지금 어디까지 왔나

```
[■□□□□□□□□]  B0 완료 · B1 대기
```

Fastify가 뜨고 `/health`가 응답합니다. **그게 전부입니다.** DB 테이블이 하나도 없습니다.

| | |
|---|---|
| 있는 것 | Fastify 5 부팅, CORS, `/health`, Prisma 7 설치, `prisma.config.ts`, tsconfig(strict) |
| 없는 것 | 스키마·마이그레이션·로컬 DB, 계약 타입, 라우트, 에러 처리, 인증, 테스트 |
| DB 상태 | `schema.prisma`에 datasource만 있고 model 0개 |

스택: Node · Fastify 5 · TypeScript 7 · Prisma 7 · PostgreSQL · zod 4 · Vitest 4

---

## 두 레포가 맞물리는 방식

```
B1 ─ B2 ─ B3          B4          B5 ─ B6          B7   B8   B9
Page 도메인           User 도메인  Database 도메인  검색 파일 협업
 │    │    │           │           │    │           │    │    │
F1 ─ F2 ─ F3 ────────► F4 ───────► F5 ─ F6 ─ F7 ──► F8 ─ F9 ─ F10
공통재료  화면(mock)   Page API    User  DB 표·보드
```

**프론트는 F3까지 mock으로 완결됩니다.** 백엔드가 밀려도 3주간은 서로 안 기다립니다.

| 프론트가 기다리는 것 | 백엔드 |
|---|---|
| F4 — Page API 연결 | **B3 완료** (Page CRUD + 저장) |
| F5 — User API 연결 | **B4 완료** (인증·워크스페이스) |
| F6 — 표 | **B5 완료** (Database 도메인) |
| F7 — 보드 | B6 (쿼리) |
| F8·F9 | B7 검색 · B8 파일. 없으면 mock으로 화면만 진행 |
| F10 | B9 WebSocket 서버. 없으면 진행 불가 |

두 가지만 기억하면 됩니다.

**1. F4에는 로그인이 없습니다.** B3까지는 인증 없이 붙을 개발용 워크스페이스가 열려 있어야 합니다. `local-defaults.ts`가 B4까지 사는 이유입니다.

**2. 데이터베이스만은 프론트가 앞질러 갈 수 없습니다.** Page·User와 달리 도메인이 새로 설계돼야 해서, 프론트가 mock을 먼저 만들면 그 mock이 곧 도메인이 됩니다. **B5 설계는 F5가 도는 동안 프론트와 같이 합니다.**

자세한 항목은 프론트 `docs/roadmap/backend-sync.md`에 있습니다. 여기서 다시 적지 않습니다.

---

## 전체 스프린트

| # | 이름 | 끝나면 되는 것 | 상태 |
|---|---|---|---|
| B0 | 서버 뼈대 | `/health`가 응답 | ✅ 완료 |
| [B1](docs/roadmap/sprint-1.md) | 페이지 만들기와 보기 | 페이지를 만들고 · 트리에 그리고 · 열어봄 | ▶ 다음 |
| [B2](docs/roadmap/sprint-2.md) | 페이지 고치고 옮기고 지우기 | 프론트 `api/pages.ts` mock을 전부 대체 |  |
| [B3](docs/roadmap/sprint-3.md) | 저장과 충돌 | 자동 저장이 실서버로 붙음 |  |
| [B4](docs/roadmap/sprint-4.md) | 인증과 워크스페이스 | 로그인해서 워크스페이스를 나눠 씀 |  |
| [B5~B9](docs/roadmap/later-sprints.md) | DB · 검색 · 파일 · 협업 | 아래 표 참고 |  |

### 첫 목표 이후

| # | 이름 | 짝이 되는 프론트 |
|---|---|---|
| B5 | 데이터베이스 — 도메인과 CRUD | F6 표 |
| B6 | 데이터베이스 — 쿼리 | F7 보드 |
| B7 | 검색과 휴지통 | F8 |
| B8 | 파일 업로드 | F9 |
| B9 | 실시간 협업 서버 | F10 |

---

## 우선순위

| 등급 | 뜻 | 해당 |
|---|---|---|
| **P0** | 없으면 프론트가 실서버로 못 감 | B1~B4 |
| **P1** | 실사용에 곧 필요 | 데이터베이스, 검색, 휴지통, 파일 업로드 |
| **P2** | 있으면 좋음 | 실시간 협업 |
| **P3** | 계획 밖 | 댓글, 버전 히스토리, 공개 발행, 웹훅, 관리자 API |

---

## 문서 지도

| 문서 | 언제 읽나 |
|---|---|
| [백엔드 범위](docs/roadmap/scope.md) | "이건 지금 만드나?" 판단할 때 |
| [서버 구조](docs/roadmap/architecture.md) | 파일을 어디에 만들지 정할 때 |
| [API 계약](docs/roadmap/api-contract.md) | 엔드포인트를 만들거나 고치기 전에 (항상) |
| [B1](docs/roadmap/sprint-1.md) ~ [B4](docs/roadmap/sprint-4.md) | 해당 스프린트 시작할 때 |
| [B5~B9 개요](docs/roadmap/later-sprints.md) | 먼 계획을 볼 때 |
| [공통 규칙과 리스크](docs/roadmap/conventions.md) | 스프린트를 끝내기 전에 |

프론트 로드맵은 `knocspace`의 `ROADMAP.md`, 연동 계약은 같은 레포 `docs/roadmap/backend-sync.md`, 디자인 규칙은 `DESIGN.md`에 있습니다. 여기서 다시 적지 않습니다.

---

## 시작 전에 정해야 할 것

프론트 `types/api.ts`를 그대로 받으면 서버를 만들 수 없는 지점이 있습니다. **B1에서 프론트와 함께 결정합니다.**

| 항목 | 언제까지 | 내용 |
|---|---|---|
| 에러 응답 모양 | B1 | `ApiError`를 JSON으로 어떻게 보낼지. `validation`·`rate_limited` 코드가 빠져 있음 |
| `baseVersion` 전달 방법 | B1 | 본문 vs `If-Match` 헤더 |
| `position` 재배치 규칙 | B1 | 소수 끼워넣기는 50번쯤에서 정밀도가 바닥납니다 |
| 삭제 시 자손 처리 | B1 | 휴지통에 뿌리만 보일지, 전부 보일지 |
| MVP 기간의 사용자 | B1 | 로그인이 B4인데 `createdBy`는 F2부터 있음. F4에는 로그인이 없습니다 |

전부 [API 계약 — 결정이 필요한 것](docs/roadmap/api-contract.md#결정이-필요한-것)에 근거와 권장안이 있습니다.

---

**다음 할 일 → [B1](docs/roadmap/sprint-1.md)**
