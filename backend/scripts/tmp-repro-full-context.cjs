'use strict';
// Reproduces the failing flow against the REAL owner account:
// 1) "start fresh"  2) photos upload message. FULL_CONTEXT dumps come from
// the logging added in chat().
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../dist/app.module');
const { AgentService } = require('../dist/agent/agent.service');

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const agent = app.get(AgentService);
  const prisma = app.get(require('../dist/prisma/prisma.service').PrismaService);

  const owner = await prisma.user.findUnique({
    where: { id: '94a04ce9-ac92-46ed-b614-275698d9a6a4' },
    select: { id: true, email: true },
  });
  if (!owner) throw new Error('owner not found');
  console.log('OWNER:', owner.id, owner.email);

  console.log('\n===== TURN 1: start fresh =====');
  const r1 = await agent.chat(owner.id, { message: 'start fresh' });
  console.log('REPLY_1:', r1.reply);

  // Pull the photo URLs the owner used in their last real upload.
  const pm = await prisma.agentMessage.findFirst({
    where: { user_id: owner.id, role: 'user', content: { contains: '[attached photos removed]' } },
    orderBy: { created_at: 'desc' },
  });
  let photos;
  if (pm) {
    // URLs were neutralized by cancel; recover originals from storage listing is
    // overkill — use the known supabase prefix pattern from prior session.
    photos = null;
  }
  const lastPhotoMsg = await prisma.agentMessage.findFirst({
    where: { user_id: owner.id, role: 'user', content: { contains: '[Attached photos:' } },
    orderBy: { created_at: 'desc' },
  });
  if (lastPhotoMsg) {
    photos = (lastPhotoMsg.content.match(/https:\/\/\S+?\.jpg/g) ?? []);
  }
  if (!photos || photos.length === 0) {
    photos = [
      'https://sodsvuuuzwmpsfvcllpf.supabase.co/storage/v1/object/public/property-photos/properties/94a04ce9-ac92-46ed-b614-275698d9a6a4/7454b566-81d1-4e3e-bee0-cab052a2f7c4.jpg',
      'https://sodsvuuuzwmpsfvcllpf.supabase.co/storage/v1/object/public/property-photos/properties/94a04ce9-ac92-46ed-b614-275698d9a6a4/c4863bfd-0eea-4ba2-93da-f847b674aff2.jpg',
    ];
  }
  console.log('\n===== TURN 2: photos upload =====');
  console.log('PHOTOS_SENT:', JSON.stringify(photos));
  const r2 = await agent.chat(owner.id, { message: 'here are the photos', photos });
  console.log('REPLY_2:', r2.reply);

  await app.close();
}

main().catch((e) => {
  console.error('SCRIPT_ERROR:', e?.message ?? e);
  process.exit(1);
});
