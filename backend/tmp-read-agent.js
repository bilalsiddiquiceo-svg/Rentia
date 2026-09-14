const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.agentMessage
  .findMany({ orderBy: { created_at: 'desc' }, take: 8, select: { role: true, content: true, created_at: true } })
  .then((rows) => {
    const out = rows
      .reverse()
      .map((r) => `=== ${r.role} ${r.created_at.toISOString()}\n${r.content.slice(0, 900)}`)
      .join('\n\n');
    require('fs').writeFileSync('tmp-agent-dump.txt', out);
    return p.$disconnect();
  });
