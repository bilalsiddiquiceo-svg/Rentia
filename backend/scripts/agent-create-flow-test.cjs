/* eslint-disable */
// Deep test for the agent's listing-CREATION flow (draft -> preview -> approve).
// Boots the real Nest app, seeds one test owner, drives create_listing
// (proposeListingCreate) exactly like chat() would, and verifies every step
// directly against the database.
//
// Run from backend/:  node scripts/agent-create-flow-test.cjs
'use strict';

const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../dist/app.module');
const { AgentService } = require('../dist/agent/agent.service');
const { PrismaService } = require('../dist/prisma/prisma.service');

let passed = 0;
let failed = 0;
const failures = [];

function check(name, condition, detail) {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failed += 1;
    failures.push(name);
    console.log(`  FAIL  ${name}  ${detail ?? ''}`);
  }
}

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const agent = app.get(AgentService);
  const prisma = app.get(PrismaService);

  const stamp = Date.now();
  const ownerD = `agent-create-owner-${stamp}@test.local`;
  let ownerId;

  try {
    // ── Seed ─────────────────────────────────────────────────────
    console.log('\n== Seed test data ==');
    const d = await prisma.user.create({
      data: {
        email: ownerD,
        password_hash: 'x',
        name: 'Test Owner D',
        role: 'owner',
        stripe_connect_id: `acct_test_d_${stamp}`,
      },
    });
    ownerId = d.id;
    await prisma.agentSubscription.create({
      data: {
        user_id: ownerId,
        status: 'active',
        stripe_subscription_id: `sub_test_d_${stamp}`,
      },
    });
    check('seed: owner created with active subscription', !!ownerId);

    const emptyDraft = await prisma.agentListingDraft.findUnique({ where: { user_id: ownerId } });
    check('fresh state: no draft row', emptyDraft === null);

    // ── 1. Partial create → missing list, draft persists ────────
    console.log('\n== Partial create (photos only) ==');
    const partial = await agent.proposeListingCreate(
      ownerId,
      { photos: ['https://cdn.test/create-1.jpg'] },
      [],
    );
    check('partial create: no proposal', partial.proposal === null);
    check('partial create: ok=false', partial.result?.ok === false);
    const missing = (partial.result?.missing ?? []).join(', ');
    check('partial create: asks for rent', missing.includes('monthly rent'));
    check('partial create: asks for bedrooms', missing.includes('bedrooms'));
    check('partial create: asks for bathrooms', missing.includes('bathrooms'));
    check('partial create: asks for a location pin', missing.includes('location pin'));

    const draftAfterPartial = await prisma.agentListingDraft.findUnique({ where: { user_id: ownerId } });
    check('draft persisted with photo',
      !!draftAfterPartial && JSON.stringify(draftAfterPartial.photos) === JSON.stringify(['https://cdn.test/create-1.jpg']));
    check('no property created yet',
      (await prisma.property.count({ where: { owner_id: ownerId } })) === 0);

    // ── 2. Pin lands in the CREATE slot and completes the draft ─
    console.log('\n== Complete create (pin + details) ==');
    await agent.setSharedLocation(ownerId, 31.5204, 74.3587, 'create');
    const full = await agent.proposeListingCreate(
      ownerId,
      {
        monthlyRent: 45000,
        bedrooms: 2,
        bathrooms: 1,
        sqft: 850,
        title: 'Gulberg Family Apartment',
        description: 'Bright two-bedroom apartment in the heart of Gulberg.',
        neighborhoodDescription: 'Walkable block near parks, cafes and Main Boulevard.',
        address: '12-C Main Boulevard',
        city: 'Lahore',
        neighborhood: 'Gulberg III',
      },
      [],
    );
    check('full create: proposal produced', !!full.proposal);
    check('full create: type=create', full.proposal?.type === 'create');
    check('full create: result.ok=true', full.result?.ok === true);
    check('full create: carries rent/beds/baths',
      full.proposal?.monthlyRent === 45000 && full.proposal?.bedrooms === 2 && full.proposal?.bathrooms === 1);
    check('full create: carries create-slot pin coords',
      Math.abs(full.proposal?.latitude - 31.5204) < 1e-9 && Math.abs(full.proposal?.longitude - 74.3587) < 1e-9);
    check('full create: carries photos', JSON.stringify(full.proposal?.photos) === JSON.stringify(['https://cdn.test/create-1.jpg']));
    check('full create: carries address/city', full.proposal?.address === '12-C Main Boulevard' && full.proposal?.city === 'Lahore');

    // Simulate what chat() does with a proposal: seal it as a preview card.
    const previewCard = {
      user_id: ownerId,
      role: 'assistant',
      content: `LISTING_CREATE ${JSON.stringify(full.proposal)}`,
    };
    await prisma.agentMessage.create({ data: previewCard });
    const liveCards = await prisma.agentMessage.findMany({
      where: { user_id: ownerId, role: 'assistant', content: { startsWith: 'LISTING_CREATE ' } },
    });
    check('preview card stored like chat() would', liveCards.length === 1);

    // ── 3. Second preview supersedes the older card ─────────────
    console.log('\n== Newer preview replaces older card ==');
    const updated = await agent.proposeListingCreate(
      ownerId,
      { monthlyRent: 47500 },
      [],
    );
    check('second create: proposal produced with updated rent', updated.proposal?.monthlyRent === 47500);
    // Simulate what chat() does with the new proposal: seal it as a fresh card.
    await prisma.agentMessage.create({
      data: {
        user_id: ownerId,
        role: 'assistant',
        content: `LISTING_CREATE ${JSON.stringify(updated.proposal)}`,
      },
    });
    const cardsAfterSecond = await prisma.agentMessage.findMany({
      where: { user_id: ownerId, role: 'assistant' },
      orderBy: { created_at: 'asc' },
      select: { content: true },
    });
    const contents = cardsAfterSecond.map((m) => m.content);
    check('older card marked REPLACED', contents.includes('LISTING_CREATE_REPLACED'));
    check(
      'exactly one live LISTING_CREATE card remains',
      contents.filter((c) => c.startsWith('LISTING_CREATE ')).length === 1,
    );
    let liveJson = null;
    try {
      liveJson = JSON.parse(contents.find((c) => c.startsWith('LISTING_CREATE ')).slice('LISTING_CREATE '.length));
    } catch {}
    check('live card carries the NEW rent', liveJson?.monthlyRent === 47500);

    // Draft still alive until approval
    check('draft survives until approval',
      !!(await prisma.agentListingDraft.findUnique({ where: { user_id: ownerId } })));

    // ── 4. Confirm creates the listing and cleans up ────────────
    console.log('\n== Confirm creation ==');
    const p = updated.proposal;
    const created = await agent.confirmListingCreate(ownerId, {
      title: p.title,
      description: p.description,
      neighborhoodDescription: p.neighborhoodDescription,
      address: p.address,
      city: p.city,
      neighborhood: p.neighborhood,
      monthlyRent: p.monthlyRent,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      sqft: p.sqft,
      latitude: p.latitude,
      longitude: p.longitude,
      photos: p.photos,
      features: p.features,
    });
    check('confirm returns a created property id', typeof created?.id === 'string' && created.id.length > 0);
    check('created property is active (owner has stripe connect)', created.status === 'active');
    const expected = {
      title: 'Gulberg Family Apartment',
      monthly_rent: 47500,
      bedrooms: 2,
      bathrooms: 1,
      sqft: 850,
      address: '12-C Main Boulevard',
      city: 'Lahore',
      neighborhood: 'Gulberg III',
      latitude: 31.5204,
      longitude: 74.3587,
    };
    check('confirm returns active property with correct title', created.title === expected.title);
    check('confirm returns active property with correct rent', created.monthlyRent === 47500, `expected 47500 got ${created.monthlyRent}`);
    check('confirm returns active property with correct bedrooms', created.bedrooms === expected.bedrooms);
    check('confirm returns active property with correct bathrooms', created.bathrooms === expected.bathrooms);
    check('confirm returns active property with correct sqft', created.sqft === expected.sqft);
    check('confirm returns active property with correct address', created.address === expected.address);
    check('confirm returns active property with correct city', created.city === expected.city);
    check('confirm returns active property with correct neighborhood', created.neighborhood === expected.neighborhood);
    check('confirm returns active property with correct latitude', Math.abs(created.latitude - expected.latitude) < 1e-9);
    check('confirm returns active property with correct longitude', Math.abs(created.longitude - expected.longitude) < 1e-9);
    check('confirm returns active property with correct photos', JSON.stringify(created.photos) === JSON.stringify(['https://cdn.test/create-1.jpg']));
    check('created property holds pin coords',
      Math.abs(created.latitude - 31.5204) < 1e-9 && Math.abs(created.longitude - 74.3587) < 1e-9);
    check('created property holds photos', JSON.stringify(created.photos) === JSON.stringify(['https://cdn.test/create-1.jpg']));

    const dbProp = await prisma.property.findUnique({ where: { id: created.id } });
    check('DB: property row exists for this owner', dbProp?.owner_id === ownerId);

    check('DB: draft deleted after approval',
      (await prisma.agentListingDraft.findUnique({ where: { user_id: ownerId } })) === null);
    check('DB: create-slot pin consumed',
      (await prisma.agentSharedLocation.findUnique({ where: { user_id_slot: { user_id: ownerId, slot: 'create' } } })) === null);

    const sealed = await prisma.agentMessage.findFirst({
      where: { user_id: ownerId, content: { startsWith: 'LISTING_CREATED ' } },
      orderBy: { created_at: 'desc' },
    });
    let sealedJson = null;
    if (sealed) {
      try { sealedJson = JSON.parse(sealed.content.slice('LISTING_CREATED '.length)); } catch {}
    }
    check('sealed LISTING_CREATED carries new id+title',
      sealedJson?.id === created.id && sealedJson?.title === 'Gulberg Family Apartment');

    // ── 5. Stale approve can never recreate: old card is dead ───
    console.log('\n== Stale-card safety ==');
    const staleCardCount = await prisma.agentMessage.count({
      where: { user_id: ownerId, role: 'assistant', content: { startsWith: 'LISTING_CREATE ' } },
    });
    check('no live create-preview cards left after confirm', staleCardCount === 0);
    const replacedStillThere = await prisma.agentMessage.count({
      where: { user_id: ownerId, content: 'LISTING_CREATE_REPLACED' },
    });
    check('replaced card remains inert in history', replacedStillThere === 1);
  } finally {
    if (ownerId) await prisma.user.deleteMany({ where: { id: ownerId } });
    await app.close();
  }

  console.log(`\n==== ${passed} passed, ${failed} failed ====`);
  if (failed > 0) {
    console.log('Failed checks:', failures.join(' | '));
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error('Test crashed:', e);
  process.exitCode = 1;
});
