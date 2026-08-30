# Fastify 서버가 뜨는 과정

> `npm run dev`를 실행했을 때 **Fastify 애플리케이션이 구성되고 실제 HTTP 서버가 시작되는 과정**을 정리한다.

---

## 1. 전체 흐름

```text
npm run dev
    ↓
package.json의 dev script 실행
    ↓
tsx watch src/server.ts
    ↓
server.ts 실행
    ↓
buildApp()
    ↓
app.ts에서 Fastify 인스턴스 생성
    │
    ├── Plugin 등록
    ├── Hook 등록
    └── Route 등록
    │
    ↓
Fastify Application 생성
    ↓
server.ts에서 app.listen()
    ↓
Node.js HTTP Server가 포트에 bind
    ↓
HTTP 요청 대기
    ↓
🚀 서버 실행 완료
```

---

## 2. `npm run dev`

먼저 터미널에서 개발 서버를 실행한다.

```bash
npm run dev
```

`npm`은 `package.json`의 `scripts`를 확인한다.

예를 들어:

```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts"
  }
}
```

라면 실제로 실행되는 명령은 다음과 같다.

```bash
tsx watch src/server.ts
```

즉,

```text
npm run dev
    ↓
package.json
    ↓
"dev": "tsx watch src/server.ts"
    ↓
server.ts 실행
```

`tsx`는 TypeScript 파일을 실행하고, `watch` 옵션을 사용하면 파일 변경을 감지해서 서버를 다시 실행할 수 있다.

---

## 3. `server.ts` 실행

일반적으로 `server.ts`는 **실제로 서버를 실행하는 역할**을 담당한다.

```ts
import { buildApp } from './app';

const app = buildApp();

await app.listen({
  port: 3000,
});
```

여기서 중요한 부분은 두 가지다.

```ts
const app = buildApp();
```

→ Fastify 애플리케이션을 구성한다.

```ts
await app.listen({
  port: 3000,
});
```

→ 구성된 애플리케이션을 실제 HTTP 서버로 실행한다.

---

## 4. `app.ts`에서 Fastify 인스턴스 생성

`app.ts`에서는 보통 Fastify 애플리케이션을 생성하고 필요한 기능을 등록한다.

```ts
import Fastify from 'fastify';

export function buildApp() {
  const app = Fastify();

  app.get('/hello', async () => {
    return {
      message: 'Hello',
    };
  });

  return app;
}
```

여기서:

```ts
const app = Fastify();
```

를 통해 **Fastify 애플리케이션 인스턴스**가 만들어진다.

### 인스턴스란?

쉽게 말하면 **실제로 만들어진 객체**다.

```text
Fastify
   │
   │ Fastify()
   ↓
┌─────────────────────┐
│         app         │
│                     │
│  Route              │
│  Plugin             │
│  Hook               │
│  설정               │
└─────────────────────┘
```

Java로 비유하면:

```java
UserService userService = new UserService();
```

에서 `userService`가 생성된 객체인 것처럼,

```ts
const app = Fastify();
```

에서 `app`이 생성된 Fastify 애플리케이션 객체다.

---

## 5. Route 등록

Fastify 애플리케이션이 만들어진 후 Route를 등록한다.

```ts
app.get('/hello', async () => {
  return {
    message: 'Hello',
  };
});
```

Route는 **특정 HTTP 요청이 들어왔을 때 어떤 코드를 실행할지 등록하는 것**이다.

Spring을 사용해봤다면 다음과 비슷하게 이해하면 된다.

| Fastify | Spring |
|---|---|
| `app.get()` | `@GetMapping` |
| `app.post()` | `@PostMapping` |
| `app.put()` | `@PutMapping` |
| `app.delete()` | `@DeleteMapping` |

예를 들어:

```ts
app.get('/users', async () => {
  return users;
});
```

는 개념적으로:

```java
@GetMapping("/users")
public List<User> getUsers() {
    return users;
}
```

와 비슷하다.

### Route의 핵심

```text
HTTP Method + URL
        ↓
     Route
        ↓
   Handler 실행
        ↓
     Response
```

따라서 `app.get()`은 단순히 "서버를 실행하는 것"이 아니라,

> **GET `/users` 요청이 들어오면 이 Handler를 실행한다**

라는 규칙을 Fastify에 등록하는 것이다.

---

## 6. Plugin과 Hook 등록

실제 프로젝트에서는 Route만 등록하지 않는다.

예를 들어:

```ts
app.register(userRoutes);
app.register(authPlugin);

app.addHook('preHandler', async () => {
  // 인증 등
});
```

이런 식으로 애플리케이션에 필요한 기능들을 구성한다.

전체적으로 보면:

```text
Fastify()
   │
   ├── Plugin 등록
   │
   ├── Hook 등록
   │
   ├── Route 등록
   │
   ├── 기타 설정
   │
   ↓
완성된 Fastify Application
```

이 단계에서는 **서버를 실제로 외부에 공개한 것이 아니다.**

아직은 서버에 필요한 설정과 요청 처리 규칙을 구성하는 단계다.

---

## 7. `app.listen()` 호출

`app.ts`에서 애플리케이션을 구성한 뒤 `server.ts`에서:

```ts
await app.listen({
  port: 3000,
});
```

을 호출한다.

여기서부터 **실제로 네트워크 요청을 받을 준비가 시작된다.**

개념적으로:

```text
app.listen()
    ↓
Node.js HTTP Server
    ↓
3000 포트에 bind
    ↓
해당 포트에서 연결 대기
```

즉:

> `app.listen()`은 구성된 Fastify 애플리케이션을 실제로 실행하고, 지정된 포트에서 HTTP 요청을 받을 수 있도록 한다.

---

## 8. `app.get()`과 `app.listen()`의 차이

둘을 구분하는 것이 중요하다.

### `app.get()`

```ts
app.get('/users', handler);
```

의미:

> "GET `/users` 요청이 들어오면 `handler`를 실행해."

즉 **Route를 등록**한다.

```text
GET /users
    ↓
handler
```

### `app.listen()`

```ts
app.listen({
  port: 3000,
});
```

의미:

> "이 Fastify 애플리케이션을 실제 서버로 실행하고 3000번 포트에서 요청을 받아."

즉 **서버를 실제로 시작**한다.

```text
Node.js HTTP Server
       ↓
   port 3000
       ↓
HTTP 요청 대기
```

---

## 9. 실제 요청이 들어오면

서버가 실행된 후:

```http
GET http://localhost:3000/users
```

요청이 들어왔다고 생각해보자.

전체 흐름은:

```text
Client
  │
  │ GET /users
  ↓
localhost:3000
  │
  ↓
Node.js HTTP Server
  │
  ↓
Fastify
  │
  ↓
Route 검색
  │
  ↓
GET /users Route
  │
  ↓
Handler 실행
  │
  ↓
Response 생성
  │
  ↓
Client
```

---

## 10. `app.ts`와 `server.ts`를 분리하는 이유

보통 다음과 같이 역할을 나눈다.

```text
src/
├── app.ts
└── server.ts
```

### `app.ts`

**애플리케이션 구성 담당**

```text
Fastify 생성
   ↓
Plugin 등록
   ↓
Hook 등록
   ↓
Route 등록
   ↓
app 반환
```

### `server.ts`

**실제 서버 실행 담당**

```text
app 생성
   ↓
app.listen()
   ↓
HTTP 서버 시작
```

### 왜 분리할까?

가장 큰 이유 중 하나는 **테스트**다.

`app.ts`에서 서버까지 실행해버리면 테스트할 때도 실제 포트를 열어야 한다.

반면:

```ts
const app = buildApp();
```

까지만 하면 애플리케이션을 생성할 수 있으므로 테스트에서는:

```ts
const response = await app.inject({
  method: 'GET',
  url: '/users',
});
```

처럼 실제 포트를 열지 않고 요청을 테스트할 수 있다.

---

## 11. Spring Boot와 비교

Spring을 알고 있다면 다음과 같이 이해하면 편하다.

| Fastify | Spring Boot |
|---|---|
| `Fastify()` | Application 생성 |
| `app.get()` | `@GetMapping` |
| `app.post()` | `@PostMapping` |
| `app.register()` | Bean/기능 구성과 유사 |
| `app.addHook()` | Filter/Interceptor와 유사 |
| `app.listen()` | 애플리케이션 실행 |
| Node.js HTTP Server | 내장 웹 서버 |

단, **완전히 1:1로 대응되는 개념은 아니다.**

Fastify는 Node.js 위에서 동작하는 비교적 가벼운 웹 프레임워크이고, 필요한 기능을 Plugin과 라이브러리로 조합하는 방식이다.

---

## 12. 최종 정리

Fastify 서버가 뜨는 과정을 가장 간단하게 정리하면:

```text
① npm run dev
       ↓
② package.json의 dev script 실행
       ↓
③ server.ts 실행
       ↓
④ buildApp()
       ↓
⑤ Fastify()로 애플리케이션 인스턴스 생성
       ↓
⑥ Plugin / Hook / Route 등록
       ↓
⑦ 완성된 app 반환
       ↓
⑧ app.listen(3000)
       ↓
⑨ Node.js HTTP Server가 3000 포트에서 listening
       ↓
⑩ HTTP 요청 수신 시작
```

### 핵심 개념 3개

| 개념 | 의미 |
|---|---|
| `Fastify()` | Fastify 애플리케이션 객체 생성 |
| `app.get()` | HTTP Route 등록 |
| `app.listen()` | 실제 HTTP 서버를 시작하고 포트에서 요청 대기 |

### 한 문장으로

> **`app.ts`에서 Fastify 애플리케이션을 구성하고, `server.ts`에서 `app.listen()`을 호출하여 Node.js가 실제 HTTP 요청을 받을 수 있는 서버를 시작한다.**
