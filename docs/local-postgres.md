# Docker 없이 로컬 Postgres 로 확인하기

> `npm run db:up`(docker compose)을 쓸 수 없는 환경에서, **이미 설치된 PostgreSQL 서비스**에 붙여
> 마이그레이션 · 시드 · 서버 확인까지 그대로 진행하는 방법을 정리합니다.

기준 환경은 Windows + PostgreSQL 18 서비스(`postgresql-x64-18`)입니다.

---

## 1. 무엇이 달라지나

컨테이너가 대신 해주던 일은 **두 가지뿐**입니다.

| docker compose 가 하던 일 | Docker 없이 |
| --- | --- |
| Postgres 프로세스 실행 | Windows 서비스가 이미 실행 중 |
| `POSTGRES_USER` · `POSTGRES_DB` 로 역할·DB 생성 | **최초 1회만** `psql` 로 직접 생성 (아래 3단계) |

**나머지는 전부 같습니다.** `db:migrate` → `db:seed` → `npm run dev` 는 한 글자도 달라지지 않습니다.
테이블을 손으로 만들지 않기 때문입니다 — 테이블은 항상 `prisma/migrations/` 가 만듭니다.

```text
db:up  ← 이 한 칸만 "역할·DB 만들기"로 바뀝니다
   ↓
db:migrate      동일
   ↓
db:seed         동일
   ↓
npm run dev     동일
```

`docker-compose.yml` 과 `db:up` 스크립트는 그대로 둡니다. Docker 가 되는 환경에서는 그쪽이 계속 정답입니다.

---

## 2. 준비 확인

**서버가 떠 있는지** (PowerShell)

```powershell
Get-Service postgresql-x64-18
```

`Status` 가 `Running` 이어야 합니다. 멈춰 있으면 `Start-Service postgresql-x64-18`.

**`psql` 을 부를 수 있는지**

설치 시 PATH 에 안 들어갔으면 현재 세션에만 붙입니다.

```powershell
$env:Path = "C:\Program Files\PostgreSQL\18\bin;$env:Path"
psql --version
```

---

## 3. 역할과 DB 만들기 (최초 1회)

`docker-compose.yml` 의 `POSTGRES_USER` · `POSTGRES_DB` 를 손으로 만드는 단계입니다.

```powershell
psql -h 127.0.0.1 -U postgres -d postgres -c "CREATE ROLE knocspace LOGIN PASSWORD 'knocspace' CREATEDB;" -c "CREATE DATABASE knocspace OWNER knocspace;"
```

이름·비밀번호를 마음대로 정하면 안 됩니다. **`.env.local` 의 `DATABASE_URL` 과 같아야 합니다.**

```
postgresql://knocspace:knocspace@localhost:5432/knocspace?schema=public
             └── 역할 ──┘ └ 비번 ┘              └ DB 이름 ┘
```

이 이름을 그대로 쓰면 `.env.local` 을 고칠 일이 없고, Docker 가 되는 환경으로 돌아가도 접속 문자열이 같습니다.

> 로컬 접속(`127.0.0.1` · `::1`)은 `pg_hba.conf` 가 `trust` 라서 비밀번호를 실제로 검사하지 않습니다.
> 그래도 `.env.local` 과 같은 값을 넣어 둡니다 — 나중에 `scram-sha-256` 으로 바뀌어도 그대로 붙습니다.

---

## 4. 스키마 반영

```powershell
npx prisma migrate deploy
```

`prisma/migrations/` 에 이미 있는 마이그레이션을 그대로 적용합니다. **적용 이력은 `_prisma_migrations` 테이블에 남습니다.**

스키마를 직접 고쳐서 새 마이그레이션을 만들 때만 `npm run db:migrate`(= `prisma migrate dev`)를 씁니다.
빈 DB 를 채우기만 할 때는 `deploy` 쪽이 안전합니다 — 파일을 새로 만들지도, 되감지도 않습니다.

---

## 5. 시드

```powershell
npm run db:seed
```

```
워크스페이스 준비됨 — 내 워크스페이스 (00000000-0000-4000-8000-000000000001)
```

`upsert` 라서 여러 번 돌려도 워크스페이스는 하나입니다.

---

## 6. 확인

**테이블이 생겼는지**

```powershell
chcp 65001                      # 한글 출력이 깨질 때만
psql -h 127.0.0.1 -U knocspace -d knocspace -c "\dt"
```

```
 Schema |        Name        | Type  |   Owner
--------+--------------------+-------+-----------
 public | Page               | table | knocspace
 public | Workspace          | table | knocspace
 public | _prisma_migrations | table | knocspace
```

**시드가 들어갔는지**

```powershell
psql -h 127.0.0.1 -U knocspace -d knocspace -c 'select count(*) from \"Workspace\";'
```

모델 이름이 대문자로 시작하므로 SQL 에서 큰따옴표가 필요합니다. GUI 로 보려면 `npm run db:studio`.

**서버가 DB 에 붙는지**

```powershell
npm run dev
# 다른 터미널에서
curl http://127.0.0.1:3000/health
```

```json
{ "status": "ok", "uptime": 1.14 }
```

`/health` 는 아직 DB 를 건드리지 않습니다. **DB 까지 확인하는 것은 B1 의 `POST /pages` · `GET /pages` 가 생긴 뒤**이고,
그 전까지는 위의 `db:seed` 성공이 "앱이 쓰는 접속 정보로 실제 쓰기가 됐다"는 증거입니다.

---

## 7. 한눈에

새 컴퓨터에서 처음부터 (PowerShell):

```powershell
$env:Path = "C:\Program Files\PostgreSQL\18\bin;$env:Path"
Get-Service postgresql-x64-18
psql -h 127.0.0.1 -U postgres -d postgres -c "CREATE ROLE knocspace LOGIN PASSWORD 'knocspace' CREATEDB;" -c "CREATE DATABASE knocspace OWNER knocspace;"
npm install
Copy-Item .env.example .env.local   # 값 채우기
npx prisma generate
npx prisma migrate deploy
npm run db:seed
npm run dev
```

---

## 8. 자주 걸리는 것

| 증상 | 원인과 해결 |
| --- | --- |
| `"knocspace" 역할(role) 없음` | 3단계를 안 했습니다. 역할·DB 생성부터 |
| `P2011 — updatedAt null 제약 위반` | 생성된 클라이언트가 낡았습니다. `npx prisma generate` 후 다시. `src/generated/` 는 커밋되지 않아 머신마다 다시 만들어야 합니다 |
| `psql` 출력이 `\xBD\xBA...` 로 깨짐 | 콘솔 코드페이지 문제입니다. `chcp 65001` 후 다시 실행. DB 데이터와는 무관합니다 |
| 접속은 되는데 테이블이 없음 | 다른 DB 에 붙었습니다. `psql ... -c "select current_database();"` 로 확인 |
| 비밀번호가 틀린데도 붙음 | `pg_hba.conf` 의 로컬 `trust` 설정 때문입니다. 로컬 전용이면 그대로 둬도 됩니다 |
| `5432` 포트가 이미 사용 중 | 서비스와 다른 Postgres 가 겹친 경우입니다. 하나만 남기거나, 포트를 바꾸고 `DATABASE_URL` 도 같이 고칩니다 |

---

## 9. 처음부터 다시

데이터만 비우고 스키마를 다시 만들 때:

```powershell
npx prisma migrate reset
```

DB 자체를 지우고 다시 만들 때:

```powershell
psql -h 127.0.0.1 -U postgres -d postgres -c "DROP DATABASE knocspace;" -c "CREATE DATABASE knocspace OWNER knocspace;"
npx prisma migrate deploy
npm run db:seed
```

역할(`knocspace`)은 지워지지 않으므로 다시 만들 필요가 없습니다.

---

## 10. 테스트용 DB

B1 의 통합 테스트 단계에서 필요해집니다. **아직 만들지 않았습니다** — 쓰는 곳이 생긴 뒤에 만듭니다.

그때 할 일은 두 줄입니다.

```powershell
psql -h 127.0.0.1 -U postgres -d postgres -c "CREATE DATABASE knocspace_test OWNER knocspace;"
```

`.env.test` 에 `DATABASE_URL` 을 `knocspace_test` 로 적고 `APP_ENV=test` 로 실행하면
[`src/env-file.ts`](../src/env-file.ts) 가 그 파일을 고릅니다. 개발용 DB 와 테이블이 섞이지 않습니다.
