import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { config } from '../config.js';

/**
 * PrismaClient 인스턴스 하나.
 *
 * 이 객체가 커넥션 풀을 들고 있습니다. 여러 번 new 하면 풀이 그만큼 생겨
 * Postgres 쪽 연결 수만 늘고 아무것도 나아지지 않습니다.
 *
 * 앱 코드는 이 파일을 직접 import 하지 않습니다. plugins/prisma.ts 가
 * app 에 붙여 주는 것을 받아 씁니다 — 그래야 테스트가 갈아끼울 수 있습니다.
 * 직접 import 하는 곳은 마이그레이션 밖에 있는 스크립트(seed)뿐입니다.
 */
const adapter = new PrismaPg({ connectionString: config.databaseUrl });

export const prisma = new PrismaClient({ adapter });
