# KnocSpace API

Notion 형태 워크스페이스의 백엔드. 프론트는 `knocspace-web` 레포에 따로 있다.

Node · Fastify 5 · TypeScript · Prisma 7 · PostgreSQL · zod
패키지 매니저는 **npm**.

## 설계 원칙은 KISS 와 YAGNI

**지금 필요한 것만 만든다.** 나중을 위한 자리를 미리 비워 두지 않는다.

- 쓰는 곳이 생긴 뒤에 만든다. "나중에 필요할 것 같아서"는 이유가 아니다
- 최적화는 느린 것이 측정된 뒤에 한다. 짐작으로 하지 않는다
- 같은 코드가 세 번째로 반복될 때 추상화한다. 두 번까지는 그냥 둔다
- 되돌리기 싼 결정은 미루고, 비싼 결정만 지금 정한다. 비싼 것은 밖과 주고받는 계약과 이미 쌓인 데이터의 모양뿐이다
- 고민되면 적게 만든 쪽. 모자란 것은 나중에 붙지만 미리 만든 것은 아무도 안 지운다

단순함은 코드 줄 수가 아니라 **전체에서 판단한다.** 여기서 한 줄 아끼려고 다른 쪽에 열 줄이 생기면 그건 단순해진 게 아니다.

미룬 결정은 왜 미뤘는지 해당 스프린트 문서에 한 줄 남긴다.

## 개발 순서는 ROADMAP.md를 따른다

무엇을 어떤 순서로 만드는지는 `ROADMAP.md`. 스프린트별 할 일은 `docs/roadmap/`.
백엔드 스프린트는 `B1`~`B9`, 프론트는 `F1`~`F10`으로 적는다.
작업을 시작하기 전에 지금이 어느 스프린트인지 확인한다.

## 엔드포인트 전에 api-contract.md를 읽는다

`docs/roadmap/api-contract.md`가 프론트와의 약속이다.
경로·응답 모양·에러 코드를 여기서 벗어나게 만들지 않는다.
바꿔야 하면 문서를 먼저 고치고, 프론트 `src/types/api.ts`도 같은 날 고친다.

## 타입의 출처는 src/contract/ 하나

zod 스키마로 정의하고 `z.infer`로 타입을 뽑는다. 손으로 두 번 적지 않는다.
요청 검증과 응답 직렬화 모두 이 스키마를 통과시킨다.

## 서버는 문서 본문을 열어보지 않는다

`Page.content`는 서버 입장에서 그냥 덩어리다. 크기와 겉모양만 검사한다.
B9에서 이 필드가 Yjs 데이터로 바뀌어도 나머지가 안 깨져야 한다.

## 경계

라우트는 Prisma를 모르고, 서비스는 HTTP를 모른다.

```
routes   HTTP·검증·상태 코드     → prisma 금지
service  도메인 규칙·권한        → request/reply 금지
repo     Prisma 쿼리             → 도메인 규칙 금지
lib      순수 함수               → 전부 모름
```

`process.env`는 `src/config.ts`와 `src/env-file.ts`에서만 읽는다.
`env-file.ts`는 어떤 `.env.*` 파일을 읽을지 고르려고 `APP_ENV` 하나만 본다.
서비스가 상태 코드를 정하고 싶으면 `AppError`를 던지고 error-handler가 번역한다.

## 구조

```
src/
├── contract/   프론트와의 계약 (zod)
├── plugins/    prisma · 에러 · 인증 · rate limit
├── modules/    도메인별 routes + service + repo
├── lib/        순수 함수
├── db/         PrismaClient
├── env-file.ts APP_ENV 로 .env.* 고르기
├── config.ts   env 검증
└── app.ts      Fastify 조립. server.ts는 부팅만
```

## 테스트

mock DB를 쓰지 않는다. 테스트용 Postgres를 띄우고 `app.inject()`로 요청한다.
엔드포인트 하나에 통합 테스트 하나.
