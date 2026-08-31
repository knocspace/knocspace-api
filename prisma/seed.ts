import { prisma } from '../src/db/prisma.js';
import { LOCAL_WORKSPACE_ID } from '../src/local-defaults.js';

/**
 * 다른 방법으로 만들 수 없는 것만 넣습니다.
 *
 * 지금은 워크스페이스 하나뿐입니다. 페이지는 POST /pages 로 만들 수 있고,
 * 목록 조회 테스트도 필요한 페이지를 직접 만들어서 씁니다.
 *
 * upsert 라 여러 번 돌려도 워크스페이스는 하나입니다.
 */
const workspace = await prisma.workspace.upsert({
  where: { id: LOCAL_WORKSPACE_ID },
  update: {},
  create: { id: LOCAL_WORKSPACE_ID, name: '내 워크스페이스' },
});

console.log(`워크스페이스 준비됨 — ${workspace.name} (${workspace.id})`);

await prisma.$disconnect();
