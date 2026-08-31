# Prisma 핵심 개념 정리

> Spring / JPA 경험을 기준으로 `schema.prisma`, `migrate`, `seed`,
> `PrismaClient`와 주요 CRUD 메서드를 연결해서 정리한다.

---

## 1. 전체 구조

```text
schema.prisma
     │
     │ 데이터 모델 정의
     │ (JPA의 @Entity와 유사)
     ▼
Prisma Migrate
     │
     │ Migration SQL 생성 및 적용
     │ (Flyway와 유사)
     ▼
PostgreSQL
     │
     │ 테이블 생성 / 변경
     ▼
Prisma Seed
     │
     │ 초기 데이터 생성
     ▼
PostgreSQL + 초기 데이터
     ▲
     │
     │ 조회 / 생성 / 수정 / 삭제
     │
PrismaClient
     ▲
     │
Repository
     ▲
     │
Service
     ▲
     │
Fastify Route
```

---

# 2. `schema.prisma`

`schema.prisma`는 Prisma에서 사용할 **데이터 모델과 DB 매핑 정보를
정의하는 파일**이다.

Spring / JPA의 `@Entity`와 비슷하게 생각할 수 있다.

## JPA

```java
@Entity
@Table(name = "page")
public class Page {

    @Id
    private String id;

    private String title;

    private Integer version;
}
```

## Prisma

```prisma
model Page {
  id      String @id
  title   String
  version Int    @default(1)
}
```

개념적으로:

```text
JPA
@Entity Page

      ≈

Prisma
model Page
```

다만 완전히 같은 것은 아니다.

JPA에서는 Java 클래스 자체가 Entity지만, Prisma에서는 별도의 DSL인
`schema.prisma`에서 모델을 선언한다.

```text
schema.prisma
     │
     ├── DB 구조 정의에 사용
     │
     └── Prisma Client 생성의 기준
```

---

# 3. Prisma Migrate

`schema.prisma`를 작성했다고 PostgreSQL의 테이블이 바로 만들어지는 것은
아니다.

예를 들어:

```prisma
model Page {
  id    String @id
  title String
}
```

를 작성한 뒤:

```bash
prisma migrate dev --name init
```

을 실행하면 Prisma가 Migration을 생성한다.

```text
prisma/
├── schema.prisma
└── migrations/
    └── 20260831115805_init/
        └── migration.sql
```

`migration.sql`에는 대략 다음과 같은 DDL이 들어간다.

```sql
CREATE TABLE "Page" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);
```

그리고 해당 SQL을 PostgreSQL에 적용한다.

```text
schema.prisma
     │
     │ prisma migrate
     ▼
변경사항 분석
     │
     ▼
migration.sql
     │
     ▼
PostgreSQL
     │
     ▼
실제 Table 생성 / 변경
```

## Flyway와 비교

개념적으로 Flyway와 상당히 비슷하다.

```text
Flyway

V1__init.sql
V2__add_version.sql
V3__add_index.sql
```

Prisma에서는:

```text
Prisma Migrate

20260831115805_init/
20260901090000_add_version/
20260901100000_add_index/
```

처럼 Migration 이력을 관리한다.

따라서:

> **Prisma Migrate = Prisma Schema와 연계된 DB Migration 도구**

라고 이해하면 된다.

---

# 4. Migration 파일을 임의로 삭제하면 안 되는 이유

Prisma는 DB 내부의 `_prisma_migrations` 테이블을 통해 적용된 Migration을
관리한다.

```text
프로젝트

migrations/
├── 001_init/
└── 002_add_version/


PostgreSQL

_prisma_migrations
────────────────────
001_init
002_add_version
```

이미 적용된 Migration 파일을 프로젝트에서 임의로 삭제하면:

```text
프로젝트

migrations/
└── 001_init/


PostgreSQL

_prisma_migrations
────────────────────
001_init
002_add_version
```

처럼 파일과 DB의 Migration 이력이 서로 달라질 수 있다.

이런 불일치를 **drift**라고 한다.

따라서 이미 적용된 Migration은 일반적으로 삭제하는 것이 아니라 새로운
Migration으로 변경사항을 추가한다.

---

# 5. Prisma Seed

Migration은 **DB 구조**를 만든다.

하지만 테이블을 생성했다고 해서 데이터가 들어있는 것은 아니다.

이때 사용하는 것이 Seed다.

> **Seed = 애플리케이션에 필요한 초기 데이터를 DB에 넣는 작업**

예를 들어:

```text
Workspace
Role
Permission
관리자 계정
공통 코드
개발용 초기 데이터
```

등을 Seed로 넣을 수 있다.

예:

```ts
await prisma.workspace.upsert({
  where: {
    id: LOCAL_WORKSPACE_ID,
  },
  update: {},
  create: {
    id: LOCAL_WORKSPACE_ID,
    name: "Local Workspace",
  },
});
```

흐름은:

```text
Migration

Workspace Table
┌────┬──────┐
│    │      │
└────┴──────┘

       ↓ Seed

Workspace Table
┌─────────┬─────────────────┐
│ id      │ name            │
├─────────┼─────────────────┤
│ local-1 │ Local Workspace │
└─────────┴─────────────────┘
```

---

# 6. Migration과 Seed 차이

구분 Migration Seed

---

목적 DB 구조 변경 초기 데이터 생성
대상 Table, Column, Index 등 Row / 데이터
대표 SQL `CREATE TABLE`, `ALTER TABLE` `INSERT`
Prisma `prisma migrate` `seed.ts`

쉽게 비유하면:

```text
Migration
= 건물을 만든다.

Seed
= 건물 안에 필요한 기본 가구를 넣는다.
```

---

# 7. `PrismaClient`

Fastify 서버에서 PostgreSQL 데이터를 조회하거나 저장하려면 DB에 Query를
보내야 한다.

이때 사용하는 객체가 `PrismaClient`다.

```ts
const prisma = new PrismaClient();
```

애플리케이션에서는 이 객체를 통해:

```ts
await prisma.page.findMany();
```

```ts
await prisma.page.findUnique({
  where: {
    id: "page-1",
  },
});
```

```ts
await prisma.page.create({
  data: {
    id: "page-2",
    title: "Hello",
  },
});
```

같은 DB 작업을 수행한다.

개념적으로:

```text
Fastify
   │
   ▼
Repository
   │
   ▼
PrismaClient
   │
   │ Query
   ▼
PostgreSQL
```

이다.

## PrismaClient는 Connection 하나인가?

아니다.

```text
❌ PrismaClient = PostgreSQL Connection 하나

⭕ PrismaClient = 애플리케이션에서 DB 접근과 Query를 담당하는 Client
```

즉 애플리케이션 입장에서는 **DB와 대화하기 위한 창구**라고 이해하면
된다.

---

# 8. Prisma CRUD와 JPA 비교

Prisma의 주요 CRUD 메서드를 Spring Data JPA와 연결하면 다음과 같다.

Prisma Spring Data JPA 의미

---

`create()` `save()`와 유사 생성 / INSERT
`findUnique({ id })` `findById()` PK 단건 조회
`findMany()` `findAll()` 여러 건 조회
`update()` 변경 감지 / `save()`와 유사 UPDATE
`delete()` `deleteById()`와 유사 DELETE

---

# 9. `create()` ≈ JPA `save()`

Prisma:

```ts
const page = await prisma.page.create({
  data: {
    id: "page-1",
    title: "Hello",
  },
});
```

개념적으로 SQL은:

```sql
INSERT INTO "Page" (...)
VALUES (...);
```

JPA에서는:

```java
Page page = new Page();
page.setId("page-1");
page.setTitle("Hello");

pageRepository.save(page);
```

처럼 생각할 수 있다.

다만 차이가 있다.

```text
Prisma create()
    → 명확하게 생성(INSERT)을 의도

JPA save()
    → 엔티티 상태에 따라 저장 동작이 달라질 수 있음
```

따라서 학습할 때는:

> **`create()` ≈ `save()`**

로 이해하되 완전히 같은 동작은 아니라고 기억한다.

---

# 10. `findUnique()` ≈ JPA `findById()`

Prisma:

```ts
const page = await prisma.page.findUnique({
  where: {
    id: "page-1",
  },
});
```

JPA:

```java
Page page = pageRepository
    .findById("page-1")
    .orElse(null);
```

따라서:

```text
findUnique({ id })
        ≈
findById(id)
```

라고 생각하면 된다.

---

# 11. `findUnique()`는 PK만 조회하는 것은 아니다

`findUnique()`에서 중요한 것은 **PK가 아니라 Unique한 값**이다.

예를 들어:

```prisma
model User {
  id    String @id
  email String @unique
}
```

라면 다음 두 조회가 모두 가능하다.

## ID로 조회

```ts
await prisma.user.findUnique({
  where: {
    id: "user-1",
  },
});
```

JPA로 보면:

```java
userRepository.findById("user-1");
```

## Email로 조회

```ts
await prisma.user.findUnique({
  where: {
    email: "test@test.com",
  },
});
```

JPA로 보면:

```java
userRepository.findByEmail("test@test.com");
```

즉:

```text
findUnique({ id })
    ≈ findById()

findUnique({ email })
    ≈ findByEmail()
       └── email에 UNIQUE 제약이 있는 경우
```

이다.

---

# 12. `findMany()` ≈ `findAll()`

Prisma:

```ts
const pages = await prisma.page.findMany();
```

JPA:

```java
List<Page> pages = pageRepository.findAll();
```

조건을 줄 수도 있다.

```ts
const pages = await prisma.page.findMany({
  where: {
    workspaceId: "workspace-1",
  },
});
```

개념적으로:

```sql
SELECT *
FROM "Page"
WHERE "workspaceId" = 'workspace-1';
```

와 같은 역할을 한다.

---

# 13. Fastify에서 실제 사용 흐름

Fastify 애플리케이션에서는 보통 다음과 같이 흐른다.

```text
GET /pages
     │
     ▼
pages.routes.ts
     │
     ▼
pages.service.ts
     │
     ▼
pages.repo.ts
     │
     ▼
PrismaClient
     │
     │ prisma.page.findMany()
     ▼
PostgreSQL
     │
     ▼
Page 데이터
     │
     ▼
HTTP Response
```

예를 들어 Repository에서:

```ts
async function findPages() {
  return prisma.page.findMany();
}
```

처럼 PrismaClient를 사용한다.

---

# 14. 프로젝트 최초 실행 흐름

프로젝트를 처음 받은 경우 전체 흐름은 다음과 같이 이해할 수 있다.

```text
① db:up
   │
   │ PostgreSQL 실행
   ▼

② db:migrate
   │
   │ schema.prisma 기준
   │ Table / Column / Index 생성
   ▼

③ db:seed
   │
   │ 애플리케이션에 필요한
   │ 초기 데이터 생성
   ▼

④ npm run dev
   │
   │ Fastify 서버 실행
   ▼

⑤ PrismaClient
   │
   │ PostgreSQL Query
   ▼

⑥ PostgreSQL
```

---

# 15. Spring / JPA와 한 번에 비교

```text
Spring / JPA                     Fastify / Prisma
─────────────────────────────────────────────────────

@Entity                          model (schema.prisma)
   │                                  │
   ▼                                  ▼
Flyway                           Prisma Migrate
   │                                  │
   └─────────── PostgreSQL ────────────┘
                    ▲
                    │
              PrismaClient
                    ▲
                    │
               Repository
                    ▲
                    │
                 Service
                    ▲
                    │
              Fastify Route
```

대표적인 DB 접근 메서드는:

```text
Spring Data JPA                  Prisma
────────────────────────────────────────────
save()                           create()
findById()                       findUnique({ id })
findAll()                        findMany()
deleteById()                     delete()
```

---

---

# 16. Fastify Plugin

Fastify에서 Plugin은 **Fastify 애플리케이션에 공통 기능을 붙이는
모듈**이라고 이해하면 된다.

```ts
app.register(prismaPlugin);
app.register(requestIdPlugin);
```

```text
Fastify app
    │
    ├── prisma plugin
    ├── request-id plugin
    ├── error-handler plugin
    └── swagger plugin
```

---

# 17. `plugins/prisma.ts`

`plugins/prisma.ts`는 **PrismaClient를 Fastify 애플리케이션에서 사용할
수 있도록 연결하고 생명주기를 관리하는 Plugin**이다.

각 Repository에서 `new PrismaClient()`를 반복하는 대신 하나의
PrismaClient를 만들어 Fastify에서 공통으로 사용하도록 구성한다.

```text
src/db/prisma.ts
      │
      │ PrismaClient 인스턴스 하나
      ▼
plugins/prisma.ts
      │
      │ Fastify에 등록
      ▼
Fastify app
      │
      ▼
Repository
      │
      ▼
PrismaClient
      │
      ▼
PostgreSQL
```

개념적으로는 다음처럼 Fastify에 Prisma를 붙이는 형태로 생각할 수 있다.

```ts
app.decorate("prisma", prisma);
```

또한 서버가 종료될 때 Fastify의 `onClose` Hook과 연결해 DB 관련 자원을
정리할 수 있다.

```text
SIGTERM / SIGINT
      │
      ▼
server.ts
      │
      ▼
app.close()
      │
      ▼
Fastify onClose Hook
      │
      ▼
Prisma DB 자원 정리
```

즉:

> **`plugins/prisma.ts` = Fastify와 PrismaClient를 연결하고 생명주기를
> 관리하는 공통 인프라**

---

# 18. `plugins/request-id.ts`

`request-id` Plugin은 **각 HTTP 요청을 추적하기 위한 식별자(Request
ID)를 관리하는 Plugin**이다.

여러 요청의 로그가 동시에 발생하면 어떤 로그가 어떤 요청에서 나온 것인지
구분하기 어렵다.

Request ID를 붙이면:

```text
[abc123] GET /pages
[abc123] DB query
[abc123] response 200

[def456] GET /pages/page-1
[def456] DB query
[def456] response 200
```

처럼 하나의 요청 흐름을 추적할 수 있다.

---

# 19. `x-request-id`

Request ID는 HTTP Header를 통해 전달할 수 있다.

```http
x-request-id: abc123
```

개념적인 흐름:

```text
HTTP Request
     │
     ▼
x-request-id 존재?
     │
 ┌───┴────┐
 │        │
YES       NO
 │        │
기존 ID   새로운 ID 생성
사용      │
 └───┬────┘
     ▼
Fastify 요청 처리
     │
     ├── Route
     ├── Service
     ├── Repository
     ├── DB Query
     └── Error / Log
     │
     ▼
HTTP Response
     │
     ▼
x-request-id 전파
```

Spring 기준으로는 Filter나 Interceptor에서 Trace ID를 발급하고 로그에
함께 남기는 구조와 비슷하게 이해할 수 있다.

---

# 20. 두 Plugin 비교

---

Plugin 역할

---

`plugins/prisma.ts` Fastify에서 공용 PrismaClient를
사용할 수 있도록 연결하고 종료 시
DB 자원을 정리

`plugins/request-id.ts` HTTP 요청마다 식별자를 부여하고
전파하여 요청 흐름과 로그를 추적

---

```text
                         Fastify
                            │
              ┌─────────────┴─────────────┐
              │                           │
      plugins/prisma.ts          plugins/request-id.ts
              │                           │
              ▼                           ▼
      DB 접근 기능 연결              HTTP 요청 추적
              │                           │
              ▼                           ▼
        PrismaClient                x-request-id
              │
              ▼
         PostgreSQL
```

```text
prisma plugin
= DB와 연결되는 공통 인프라

request-id plugin
= HTTP 요청을 추적하기 위한 공통 인프라
```

# 핵심 정리

### `schema.prisma`

> JPA의 `@Entity`처럼 애플리케이션의 데이터 모델과 DB 매핑을 정의한다.

### `prisma migrate`

> `schema.prisma`의 변경사항을 Migration SQL로 만들고 PostgreSQL의 실제
> 구조에 반영한다. Flyway와 비슷한 역할이다.

### `seed`

> 애플리케이션 구동 등에 필요한 초기 데이터를 DB에 넣는다.

### `PrismaClient`

> Fastify 애플리케이션에서 PostgreSQL에 Query를 보내고 데이터를
> 조회·생성·수정·삭제하기 위한 DB Client 객체다.

### CRUD

```text
create()
    ≈ save() / INSERT

findUnique({ id })
    ≈ findById()

findMany()
    ≈ findAll()

update()
    ≈ UPDATE / 변경 감지

delete()
    ≈ deleteById()
```

## 한 문장으로

> **`schema.prisma`로 데이터 모델을 정의하고 → `migrate`로 실제
> PostgreSQL 구조를 만든 뒤 → `seed`로 초기 데이터를 넣고 → 실행 중인
> Fastify 애플리케이션에서는 `PrismaClient`를 통해 PostgreSQL 데이터를
> 조회하고 변경한다.**
