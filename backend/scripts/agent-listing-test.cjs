/* eslint-disable */
// Deep test for the agent's listing-management features.
// Boots the real Nest app, seeds two test owners + properties, runs proposal
// and confirm flows, and verifies every step directly against the database.
//
// Run from backend/:  node scripts/agent-listing-test.cjs
'use strict';

const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../dist/app.module');
const { AgentService } = require('../dist/agent/agent.service');
const { PropertiesService } = require('../dist/properties/properties.service');
const { PrismaService } = require('../dist/prisma/prisma.service');
const { validate } = require('class-validator');
const { plainToInstance } = require('class-transformer');
const { PrismaClient } = require('@prisma/client');
const dtoSource = require('../dist/agent/agent.dto');

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

async function assertThrows(name, fn, expectMessage) {
  try {
    const maybe = fn();
    if (maybe && typeof maybe.then === 'function') await maybe;
    check(name, false, 'expected an exception');
  } catch (e) {
    const msg = String(e?.message ?? e);
    check(
      name,
      !expectMessage || msg.includes(expectMessage),
      `got message: ${msg.slice(0, 120)}`,
    );
  }
}

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const agent = app.get(AgentService);
  const props = app.get(PropertiesService);
  const prisma = app.get(PrismaService);

  const stamp = Date.now();
  const ownerA = `agent-test-owner-a-${stamp}@test.local`;
  const ownerB = `agent-test-owner-b-${stamp}@test.local`;
  const ownerC = `agent-test-owner-c-${stamp}@test.local`;
  let ownerAId, ownerBId, ownerCId, propAId;

  try {
    // ── Seed ─────────────────────────────────────────────────────
    console.log('\n== Seed test data ==');
    const a = await prisma.user.create({
      data: {
        email: ownerA,
        password_hash: 'x',
        name: 'Test Owner A',
        role: 'owner',
        stripe_connect_id: `acct_test_a_${stamp}`,
      },
    });
    const b = await prisma.user.create({
      data: {
        email: ownerB,
        password_hash: 'x',
        name: 'Test Owner B',
        role: 'owner',
      },
    });
    const c = await prisma.user.create({
      data: {
        email: ownerC,
        password_hash: 'x',
        name: 'Test Owner C',
        role: 'owner',
        stripe_connect_id: `acct_test_c_${stamp}`,
      },
    });
    await prisma.property.create({
      data: {
        owner_id: c.id,
        title: 'Owner C Only Flat',
        description: 'A listing owned by C.',
        address: '9 Test Rd',
        city: 'Karachi',
        monthly_rent: 15000,
        bedrooms: 1,
        bathrooms: 1,
        photos: [],
      },
    });
    ownerAId = a.id;
    ownerBId = b.id;
    ownerCId = c.id;

    await prisma.agentSubscription.create({
      data: {
        user_id: ownerAId,
        status: 'active',
        stripe_subscription_id: `sub_test_${stamp}`,
      },
    });
    await prisma.agentSubscription.create({
      data: {
        user_id: ownerBId,
        status: 'active',
        stripe_subscription_id: `sub_test_b_${stamp}`,
      },
    });

    const created = await props.create(ownerAId, {
      title: 'Bahria Town Suite',
      description: 'A cozy 2-bedroom suite near the lake.',
      address: '123 Bahria Town',
      city: 'Lahore',
      neighborhood: 'Bahria Town',
      monthly_rent: 55000,
      bedrooms: 2,
      bathrooms: 1,
      sqft: 900,
      photos: [
        'https://cdn.test/photo-a-1.jpg',
        'https://cdn.test/photo-a-2.jpg',
        'https://cdn.test/photo-a-3.jpg',
      ],
    });
    propAId = created.id;
    check('seed: property created as active (owner has stripe connect)', created.status === 'active');

    // ── 1. Propose listing edit ─────────────────────────────────
    console.log('\n== Propose listing edit ==');
    const editOut = await agent.proposeListingEdit(ownerAId, {
      propertyId: propAId,
      title: 'Bahria Town Lakefront Suite',
      monthlyRent: 60000,
      bathrooms: 2,
    });
    check('edit proposal produced', !!editOut.proposal);
    check('edit proposal type', editOut.proposal?.type === 'edit');
    check(
      'edit proposal changes captured',
      editOut.proposal?.changes?.title === 'Bahria Town Lakefront Suite' &&
        editOut.proposal?.changes?.monthlyRent === 60000 &&
        editOut.proposal?.changes?.bathrooms === 2,
    );
    check('edit proposal carries current values', editOut.proposal?.current?.monthlyRent === 55000);
    check('edit proposal returns ok message', editOut.result?.ok === true);

    const dbBeforeEdit = await prisma.property.findUnique({ where: { id: propAId } });
    check(
      'proposal did NOT change the DB',
      dbBeforeEdit.title === 'Bahria Town Suite' && dbBeforeEdit.monthly_rent === 55000,
    );

    // Ownership guard on propose
    const notOwner = await agent.proposeListingEdit(ownerBId, {
      propertyId: propAId,
      title: 'Sneaky',
    });
    check('edit propose: foreign owner rejected', !!notOwner.result?.error && !notOwner.proposal);

    // Invalid rent on propose
    const badRent = await agent.proposeListingEdit(ownerAId, {
      propertyId: propAId,
      monthlyRent: -5,
    });
    check('edit propose: invalid rent rejected', !!badRent.result?.error && !badRent.proposal);

    // ── 2. Confirm listing edit ─────────────────────────────────
    console.log('\n== Confirm listing edit ==');
    const updated = await agent.confirmListingEdit(ownerAId, {
      propertyId: propAId,
      changes: { title: 'Bahria Town Lakefront Suite', monthlyRent: 60000, bathrooms: 2 },
    });
    check('confirm edit returns updated property', updated.title === 'Bahria Town Lakefront Suite');

    const dbAfterEdit = await prisma.property.findUnique({ where: { id: propAId } });
    check('DB: title updated', dbAfterEdit.title === 'Bahria Town Lakefront Suite');
    check('DB: monthly rent updated', dbAfterEdit.monthly_rent === 60000);
    check('DB: bathrooms updated', dbAfterEdit.bathrooms === 2);
    check(
      'DB: untouched fields preserved',
      dbAfterEdit.bedrooms === 2 && dbAfterEdit.city === 'Lahore',
    );

    // Confirm edit: foreign owner rejected
    assertThrows(
      'confirm edit: foreign owner throws NotFound',
      () =>
        agent.confirmListingEdit(ownerBId, {
          propertyId: propAId,
          changes: { title: 'Hijacked' },
        }),
      'not found',
    );

    // DTO validation (mirrors the HTTP ValidationPipe)
    const dto = plainToInstance(
      dtoSource.ConfirmListingEditDto,
      { propertyId: propAId, changes: { bedrooms: 999 } },
      { exposeDefaultValues: true },
    );
    const { validate } = require('class-validator');
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: false });
    const nestedChangesError = errors.some(
      (e) =>
        String(e.property) === 'changes' &&
        ((e.constraints && Object.keys(e.constraints).length > 0) ||
          (e.children && e.children.length > 0)),
    );
    check('DTO: confirm-listing-edit rejects bedrooms > 20', nestedChangesError);

    // ── Fresh state after rename — the exact "agent remembers old title" bug
    console.log('\n== Fresh state after rename ==');
    const fresh = await props.findOneMine(ownerAId, propAId);
    check('fresh tool query returns the NEW title', fresh.title === 'Bahria Town Lakefront Suite');
    const sealedEdits = await prisma.agentMessage.findMany({
      where: { user_id: ownerAId, content: { startsWith: 'LISTING_EDITED ' } },
      orderBy: { created_at: 'desc' },
      select: { content: true },
    });
    const sealedEditJsonList = [];
    for (const m of sealedEdits) {
      try {
        sealedEditJsonList.push(JSON.parse(m.content.slice('LISTING_EDITED '.length)));
      } catch {}
    }
    check(
      'sealed LISTING_EDITED carries the NEW title',
      sealedEditJsonList.some((j) => j?.title === 'Bahria Town Lakefront Suite'),
    );
    check(
      'sealed LISTING_EDITED carries applied changes',
      sealedEditJsonList.some((j) => j?.changes?.monthlyRent === 60000),
    );

    // ── 2b. Edit edge cases ─────────────────────────────────────
    console.log('\n== Edit edge cases ==');
    const missingProp = await agent.proposeListingEdit(ownerAId, {
      propertyId: 'does-not-exist-id',
      title: 'X',
    });
    check('edit propose: unknown property rejected', !!missingProp.result?.error && !missingProp.proposal);

    const emptyTitle = await agent.proposeListingEdit(ownerAId, {
      propertyId: propAId,
      title: '   ',
    });
    check('edit propose: whitespace title rejected', !!emptyTitle.result?.error && !emptyTitle.proposal);

    const clearNbhd = await agent.proposeListingEdit(ownerAId, {
      propertyId: propAId,
      neighborhood: null,
    });
    check(
      'edit propose: null neighborhood becomes a clearing change',
      clearNbhd.proposal?.changes?.neighborhood === null,
    );

    const singleField = await agent.proposeListingEdit(ownerAId, {
      propertyId: propAId,
      description: 'A lake-facing suite with two large bedrooms and a new kitchen.',
    });
    check(
      'edit propose: single field change',
      Object.keys(singleField.proposal?.changes ?? {}).length === 1 &&
        singleField.proposal?.changes?.description?.startsWith('A lake-facing'),
    );

    // Confirm none of the rejected/edge proposes touched the DB
    const dbAfterEdge = await prisma.property.findUnique({ where: { id: propAId } });
    check('edge proposes did NOT alter the DB', dbAfterEdge.title === 'Bahria Town Lakefront Suite');

    // Confirming a clearing change actually clears the neighborhood
    const clearedTrail = await agent.confirmListingEdit(ownerAId, {
      propertyId: propAId,
      changes: { neighborhood: null },
    });
    check('confirm edit with null neighborhood returns null', clearedTrail.neighborhood === null);
    const dbCleared = await prisma.property.findUnique({ where: { id: propAId } });
    check('DB: neighborhood cleared to null', dbCleared.neighborhood === null);

    // ── 2c. Listing location (shared pin) ───────────────────────
    console.log('\n== Listing location (pin) ==');
    const beforeLoc = await prisma.property.findUnique({ where: { id: propAId } });
    check('seed: listing starts with no pin', beforeLoc.latitude === null && beforeLoc.longitude === null);

    const movePin = await agent.proposeListingEdit(ownerAId, {
      propertyId: propAId,
      latitude: 31.382287,
      longitude: 74.188845,
    });
    check('location proposal produced', movePin.proposal?.type === 'edit');
    check(
      'location proposal changes carry lat/lng',
      movePin.proposal?.changes?.latitude === 31.382287 &&
        movePin.proposal?.changes?.longitude === 74.188845,
    );
    check(
      'location proposal current shows old (null) pin',
      movePin.proposal?.current?.latitude === null && movePin.proposal?.current?.longitude === null,
    );
    const dbAfterMovePropose = await prisma.property.findUnique({ where: { id: propAId } });
    check(
      'location proposal did NOT change the DB',
      dbAfterMovePropose.latitude === null && dbAfterMovePropose.longitude === null,
    );

    const latOnly = await agent.proposeListingEdit(ownerAId, {
      propertyId: propAId,
      latitude: 31.382287,
    });
    check('location propose: latitude without longitude rejected', !!latOnly.result?.error && !latOnly.proposal);

    const lngOnly = await agent.proposeListingEdit(ownerAId, {
      propertyId: propAId,
      longitude: 74.188845,
    });
    check('location propose: longitude without latitude rejected', !!lngOnly.result?.error && !lngOnly.proposal);

    const latHigh = await agent.proposeListingEdit(ownerAId, {
      propertyId: propAId,
      latitude: 91,
      longitude: 20,
    });
    check('location propose: latitude > 90 rejected', !!latHigh.result?.error && !latHigh.proposal);

    const latLow = await agent.proposeListingEdit(ownerAId, {
      propertyId: propAId,
      latitude: -91,
      longitude: 20,
    });
    check('location propose: latitude < -90 rejected', !!latLow.result?.error && !latLow.proposal);

    const lngHigh = await agent.proposeListingEdit(ownerAId, {
      propertyId: propAId,
      latitude: 20,
      longitude: 181,
    });
    check('location propose: longitude > 180 rejected', !!lngHigh.result?.error && !lngHigh.proposal);

    const lngLow = await agent.proposeListingEdit(ownerAId, {
      propertyId: propAId,
      latitude: 20,
      longitude: -181,
    });
    check('location propose: longitude < -180 rejected', !!lngLow.result?.error && !lngLow.proposal);

    const nonNumeric = await agent.proposeListingEdit(ownerAId, {
      propertyId: propAId,
      latitude: 'abc',
      longitude: 12.5,
    });
    check('location propose: non-numeric lat/lng rejected', !!nonNumeric.result?.error && !nonNumeric.proposal);

    const boundary = await agent.proposeListingEdit(ownerAId, {
      propertyId: propAId,
      latitude: 90,
      longitude: 180,
    });
    check(
      'location propose: exact bounds accepted',
      boundary.proposal?.changes?.latitude === 90 && boundary.proposal?.changes?.longitude === 180,
    );

    const moved = await agent.confirmListingEdit(ownerAId, {
      propertyId: propAId,
      changes: { latitude: 31.382287, longitude: 74.188845 },
    });
    check(
      'confirm location returns updated property',
      Math.abs(moved.latitude - 31.382287) < 1e-9 && Math.abs(moved.longitude - 74.188845) < 1e-9,
    );
    const dbMoved = await prisma.property.findUnique({ where: { id: propAId } });
    check(
      'DB: latitude updated',
      dbMoved.latitude !== null && Math.abs(dbMoved.latitude - 31.382287) < 1e-9,
    );
    check(
      'DB: longitude updated',
      dbMoved.longitude !== null && Math.abs(dbMoved.longitude - 74.188845) < 1e-9,
    );
    const freshLoc = await props.findOneMine(ownerAId, propAId);
    check(
      'fresh tool query returns moved pin (agent sees it)',
      Math.abs(freshLoc.latitude - 31.382287) < 1e-9 && Math.abs(freshLoc.longitude - 74.188845) < 1e-9,
    );
    const sealedLoc = await prisma.agentMessage.findFirst({
      where: { user_id: ownerAId, content: { startsWith: 'LISTING_EDITED ' } },
      orderBy: { created_at: 'desc' },
      select: { content: true },
    });
    let sealedLocJson = null;
    if (sealedLoc) {
      try {
        sealedLocJson = JSON.parse(sealedLoc.content.slice('LISTING_EDITED '.length));
      } catch {}
    }
    check(
      'sealed LISTING_EDITED carries applied lat/lng',
      Math.abs((sealedLocJson?.changes?.latitude ?? 0) - 31.382287) < 1e-9 &&
        Math.abs((sealedLocJson?.changes?.longitude ?? 0) - 74.188845) < 1e-9,
    );

    // ── 2d. Listing references + move_listing ───────────────────
    console.log('\n== Listing references + move_listing ==');
    await agent.setSharedLocation(ownerAId, 31.42, 74.33);
    const moveByNumber = await agent.proposeMoveListing(ownerAId, { query: '1' });
    check('move_listing resolves "1" to first listing', moveByNumber.proposal?.propertyId === propAId);
    check(
      'move_listing applies the stored shared pin',
      moveByNumber.proposal?.changes?.latitude === 31.42 &&
        moveByNumber.proposal?.changes?.longitude === 74.33,
    );
    const dbBeforeMove = await prisma.property.findUnique({ where: { id: propAId } });
    check(
      'move_listing did NOT change the DB',
      Math.abs(dbBeforeMove.latitude - 31.382287) < 1e-9,
    );

    await agent.setSharedLocation(ownerAId, dbBeforeMove.latitude, dbBeforeMove.longitude);
    const samePin = await agent.proposeMoveListing(ownerAId, { query: '1' });
    check('move_listing: already at that pin rejected', !!samePin.result?.error && !samePin.proposal);

    await agent.setSharedLocation(ownerBId, 10, 20);
    const badRef = await agent.proposeMoveListing(ownerBId, { query: '1' });
    check('move_listing: unresolvable listing rejected', !!badRef.result?.error && !badRef.proposal);
    const foreignMove = await agent.proposeMoveListing(ownerBId, { propertyId: propAId });
    check('move_listing: foreign owner rejected', !!foreignMove.result?.error && !foreignMove.proposal);

    const noPinOwner = await agent.proposeMoveListing(ownerCId, { query: '1' });
    check(
      'move_listing: no shared pin → asks for a pin',
      String(noPinOwner.result?.error ?? '').includes('location pin'),
    );

    await agent.setSharedLocation(ownerAId, 31.42, 74.33);
    const byName = await agent.proposeMoveListing(ownerAId, {
      query: 'Bahria Town Lakefront Suite',
    });
    check('move_listing resolves by exact name', byName.proposal?.propertyId === propAId);

    const statusByNumber = await agent.proposeStatusChange(ownerAId, {
      query: '1',
      status: 'inactive',
    });
    check('set_listing_status resolves "1"', statusByNumber.proposal?.propertyId === propAId);

    const imagesByNumber = await agent.proposeImagesChange(ownerAId, {
      query: '1',
      add: ['https://cdn.test/photo-x.jpg'],
    });
    check('update_listing_images resolves "1"', imagesByNumber.proposal?.propertyId === propAId);

    const titleRef = await agent.proposeListingEdit(ownerAId, {
      query: 'Lakefront',
      description: 'Referenced by a fragment of the title.',
    });
    check('edit propose resolves by title fragment', titleRef.proposal?.propertyId === propAId);

    // Ambiguous name → numbered candidate list instead of a silent guess
    const propA2 = await prisma.property.create({
      data: {
        owner_id: ownerAId,
        title: 'Bahria Town Garden Flat',
        description: 'Second property for ambiguity tests.',
        address: '456 Bahria Town',
        city: 'Lahore',
        monthly_rent: 20000,
        bedrooms: 1,
        bathrooms: 1,
        photos: [],
      },
    });
    const ambiguous = await agent.proposeListingEdit(ownerAId, { query: 'Bahria' });
    check(
      'edit propose: ambiguous name lists numbered options',
      !!ambiguous.result?.error &&
        !ambiguous.proposal &&
        String(ambiguous.result.error).includes('1)'),
    );

    // Confirm the move and verify DB
    const confirmedMove = await agent.confirmListingEdit(ownerAId, {
      propertyId: propAId,
      changes: { latitude: 31.42, longitude: 74.33 },
    });
    check('confirm move returns new pin', Math.abs(confirmedMove.latitude - 31.42) < 1e-9);
    const dbMoved2 = await prisma.property.findUnique({ where: { id: propAId } });
    check(
      'DB: move applied',
      dbMoved2.latitude !== null &&
        Math.abs(dbMoved2.latitude - 31.42) < 1e-9 &&
        Math.abs(dbMoved2.longitude - 74.33) < 1e-9,
    );

    // ── 3. Propose + confirm status change ──────────────────────
    console.log('\n== Listing status ==');
    const statOut = await agent.proposeStatusChange(ownerAId, {
      propertyId: propAId,
      status: 'inactive',
    });
    check('status proposal produced', statOut.proposal?.type === 'status');
    check('status proposal target inactive', statOut.proposal?.status === 'inactive');
    check('status proposal ok message', statOut.result?.ok === true);
    const dbBeforeStatus = await prisma.property.findUnique({ where: { id: propAId } });
    check('status proposal did NOT change DB', dbBeforeStatus.status === 'active');

    const already = await agent.proposeStatusChange(ownerAId, {
      propertyId: propAId,
      status: 'active',
    });
    check('status propose: already active rejected', !!already.result?.error && !already.proposal);

    const badStatus = await agent.proposeStatusChange(ownerAId, {
      propertyId: propAId,
      status: 'paused',
    });
    check('status propose: invalid status rejected', !!badStatus.result?.error && !badStatus.proposal);

    const offOwner = await agent.proposeStatusChange(ownerBId, {
      propertyId: propAId,
      status: 'inactive',
    });
    check('status propose: foreign owner rejected', !!offOwner.result?.error && !offOwner.proposal);

    const deactivated = await agent.confirmStatusChange(ownerAId, {
      propertyId: propAId,
      status: 'inactive',
    });
    check('confirm status returns inactive property', deactivated.status === 'inactive');
    const dbInactive = await prisma.property.findUnique({ where: { id: propAId } });
    check('DB: listing is now inactive', dbInactive.status === 'inactive');

    // Re-activate (owner has stripe_connect_id)
    const reactivated = await agent.confirmStatusChange(ownerAId, {
      propertyId: propAId,
      status: 'active',
    });
    check('confirm status returns active property', reactivated.status === 'active');
    const dbActive = await prisma.property.findUnique({ where: { id: propAId } });
    check('DB: listing is active again', dbActive.status === 'active');

    const sealedStatus = await prisma.agentMessage.findFirst({
      where: { user_id: ownerAId, content: { startsWith: 'LISTING_STATUS_CHANGED ' } },
      orderBy: { created_at: 'desc' },
      select: { content: true },
    });
    let sealedStatusJson = null;
    if (sealedStatus) {
      try {
        sealedStatusJson = JSON.parse(sealedStatus.content.slice('LISTING_STATUS_CHANGED '.length));
      } catch {}
    }
    check(
      'sealed LISTING_STATUS_CHANGED carries id+title+status',
      sealedStatusJson?.title === 'Bahria Town Lakefront Suite' && sealedStatusJson?.status === 'active',
    );

    // Activation for an owner WITHOUT stripe connect must fail
    const propB = await prisma.property.create({
      data: {
        owner_id: ownerBId,
        title: 'No Connect Property',
        description: 'Owner B has no stripe connect.',
        address: '1 Test Rd',
        city: 'Karachi',
        monthly_rent: 10000,
        bedrooms: 1,
        bathrooms: 1,
        photos: [],
      },
    });
    const noConnect = await agent.proposeStatusChange(ownerBId, {
      propertyId: propB.id,
      status: 'active',
    });
    check(
      'status propose: activate without stripe connect rejected',
      !!noConnect.result?.error && !noConnect.proposal,
    );
    assertThrows(
      'confirm status: activate without stripe connect throws',
      () => agent.confirmStatusChange(ownerBId, { propertyId: propB.id, status: 'active' }),
      'Connect Stripe payouts',
    );

    // ── 4. Propose + confirm image changes ──────────────────────
    console.log('\n== Listing images ==');
    const imgOut = await agent.proposeImagesChange(ownerAId, {
      propertyId: propAId,
      add: ['https://cdn.test/photo-a-4.jpg'],
      removeIndices: [2],
    });
    check('images proposal produced', imgOut.proposal?.type === 'images');
    check(
      'images proposal resultPhotos computed',
      JSON.stringify(imgOut.proposal?.resultPhotos) ===
        JSON.stringify(['https://cdn.test/photo-a-1.jpg', 'https://cdn.test/photo-a-3.jpg', 'https://cdn.test/photo-a-4.jpg']),
    );
    check('images proposal add/media wiring', imgOut.proposal?.add?.[0] === 'https://cdn.test/photo-a-4.jpg' && imgOut.proposal?.removeIndices?.[0] === 2);
    const dbBeforeImg = await prisma.property.findUnique({ where: { id: propAId } });
    check(
      'images proposal did NOT change DB',
      JSON.stringify(dbBeforeImg.photos) ===
        JSON.stringify(['https://cdn.test/photo-a-1.jpg', 'https://cdn.test/photo-a-2.jpg', 'https://cdn.test/photo-a-3.jpg']),
    );

    const badIdx = await agent.proposeImagesChange(ownerAId, {
      propertyId: propAId,
      removeIndices: [9],
    });
    check('images propose: out-of-range position rejected', !!badIdx.result?.error && !badIdx.proposal);

    const tooMany = await agent.proposeImagesChange(ownerAId, {
      propertyId: propAId,
      add: ['p1', 'p2', 'p3', 'p4', 'p5'],
    });
    check('images propose: more than 5 rejected', !!tooMany.result?.error && !tooMany.proposal);

    const nothing = await agent.proposeImagesChange(ownerAId, { propertyId: propAId });
    check('images propose: empty change rejected', !!nothing.result?.error && !nothing.proposal);

    const done = await agent.confirmImagesChange(ownerAId, {
      propertyId: propAId,
      photos: ['https://cdn.test/photo-a-1.jpg', 'https://cdn.test/photo-a-3.jpg', 'https://cdn.test/photo-a-4.jpg'],
    });
    check('confirm images returns updated property', done.photos?.length === 3);
    const dbImg = await prisma.property.findUnique({ where: { id: propAId } });
    check(
      'DB: photos array updated',
      JSON.stringify(dbImg.photos) ===
        JSON.stringify(['https://cdn.test/photo-a-1.jpg', 'https://cdn.test/photo-a-3.jpg', 'https://cdn.test/photo-a-4.jpg']),
    );

    assertThrows(
      'confirm images: photos > 5 throws',
      () =>
        agent.confirmImagesChange(ownerAId, {
          propertyId: propAId,
          photos: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'],
        }),
      'at most 5',
    );

    const sealedImg = await prisma.agentMessage.findFirst({
      where: { user_id: ownerAId, content: { startsWith: 'LISTING_IMAGES_CHANGED ' } },
      orderBy: { created_at: 'desc' },
      select: { content: true },
    });
    let sealedImgJson = null;
    if (sealedImg) {
      try {
        sealedImgJson = JSON.parse(sealedImg.content.slice('LISTING_IMAGES_CHANGED '.length));
      } catch {}
    }
    check(
      'sealed LISTING_IMAGES_CHANGED carries title + photoCount',
      sealedImgJson?.title === 'Bahria Town Lakefront Suite' && sealedImgJson?.photoCount === 3,
    );

    // ── 4b. Image edge cases ────────────────────────────────────
    console.log('\n== Image edge cases ==');
    const dupAdd = await agent.proposeImagesChange(ownerAId, {
      propertyId: propAId,
      add: ['https://cdn.test/photo-new.jpg', 'https://cdn.test/photo-new.jpg'],
    });
    check(
      'images propose: duplicate add URL deduped',
      (dupAdd.proposal?.resultPhotos ?? []).filter((u) => u === 'https://cdn.test/photo-new.jpg').length === 1,
    );

    const dupRemove = await agent.proposeImagesChange(ownerAId, {
      propertyId: propAId,
      removeIndices: [1, 1],
    });
    check(
      'images propose: duplicate removal deduped',
      dupRemove.proposal?.removeIndices?.length === 1 && dupRemove.proposal?.removeIndices?.[0] === 1,
    );

    const removeAll = await agent.proposeImagesChange(ownerAId, {
      propertyId: propAId,
      removeIndices: [1, 2, 3],
    });
    check(
      'images propose: removing all photos allowed',
      (removeAll.proposal?.resultPhotos ?? []).length === 0,
    );

    const replaceFlow = await agent.proposeImagesChange(ownerAId, {
      propertyId: propAId,
      add: ['https://cdn.test/photo-replacement.jpg'],
      removeIndices: [1],
    });
    check(
      'images propose: replace photo #1 (remove + add)',
      JSON.stringify(replaceFlow.proposal?.resultPhotos) ===
        JSON.stringify(['https://cdn.test/photo-a-3.jpg', 'https://cdn.test/photo-a-4.jpg', 'https://cdn.test/photo-replacement.jpg']),
    );
    const dbAfterImgEdge = await prisma.property.findUnique({ where: { id: propAId } });
    check(
      'image edge proposes did NOT change the DB',
      JSON.stringify(dbAfterImgEdge.photos) ===
        JSON.stringify(['https://cdn.test/photo-a-1.jpg', 'https://cdn.test/photo-a-3.jpg', 'https://cdn.test/photo-a-4.jpg']),
    );

    // ── 5. History markers are stored ───────────────────────────
    console.log('\n== Chat history markers ==');
    const history = await prisma.agentMessage.findMany({
      where: { user_id: ownerAId },
      orderBy: { created_at: 'asc' },
      select: { content: true },
    });
    const all = history.map((h) => h.content).join('\n');
    check('history contains LISTING_EDITED', all.includes('LISTING_EDITED '));
    check('history contains LISTING_STATUS_CHANGED', all.includes('LISTING_STATUS_CHANGED '));
    check('history contains LISTING_IMAGES_CHANGED', all.includes('LISTING_IMAGES_CHANGED '));
    check(
      'no open LISTING_EDIT proposal marker remains after confirm',
      !all.includes('LISTING_EDIT '),
    );
    check(
      'no open LISTING_STATUS proposal marker remains after confirm',
      !all.includes('LISTING_STATUS '),
    );
    check(
      'no open LISTING_IMAGES proposal marker remains after confirm',
      !all.includes('LISTING_IMAGES '),
    );

    // ── 6. Bulk status + shared-pin persistence (AI-first flow) ─
    console.log('\n== Bulk status + shared pin (DB-backed) ==');

    // Force a known state first: both listings active.
    for (const id of [propAId, propA2.id]) {
      const p = await prisma.property.findUnique({ where: { id } });
      if (p && p.status !== 'active') {
        await agent.confirmStatusChange(ownerAId, { propertyId: id, status: 'active' });
      }
    }

    const bulkDeactivate = await agent.proposeStatusChange(ownerAId, {
      propertyIds: [propAId, propA2.id],
      status: 'inactive',
    });
    check(
      'bulk status: two listings proposed at once',
      (bulkDeactivate.proposals ?? []).length === 2 &&
        bulkDeactivate.proposals.every((p) => p.type === 'status' && p.status === 'inactive'),
    );
    const dbBeforeBulk = await prisma.property.findMany({
      where: { id: { in: [propAId, propA2.id] } },
    });
    check(
      'bulk status: DB unchanged before confirm',
      dbBeforeBulk.every((p) => p.status === 'active'),
    );
    await agent.confirmStatusChange(ownerAId, { propertyId: propAId, status: 'inactive' });
    await agent.confirmStatusChange(ownerAId, { propertyId: propA2.id, status: 'inactive' });
    const dbAfterDeactivate = await prisma.property.findMany({
      where: { id: { in: [propAId, propA2.id] } },
    });
    check(
      'DB: bulk deactivation applied',
      dbAfterDeactivate.every((p) => p.status === 'inactive'),
    );

    const bulkActivate = await agent.proposeStatusChange(ownerAId, {
      propertyIds: [propAId, propA2.id],
      status: 'active',
    });
    check('bulk status: reactivate both', (bulkActivate.proposals ?? []).length === 2);
    await agent.confirmStatusChange(ownerAId, { propertyId: propAId, status: 'active' });
    await agent.confirmStatusChange(ownerAId, { propertyId: propA2.id, status: 'active' });

    const mixedOut = await agent.proposeStatusChange(ownerAId, {
      propertyIds: [propAId, propB.id],
      status: 'inactive',
    });
    check(
      'bulk status: foreign listing excluded (ownership guard)',
      (mixedOut.proposals ?? []).length === 1 && mixedOut.proposals[0].propertyId === propAId,
    );

    // Shared pin now lives in the DB and survives "restarts" (new read path).
    await agent.setSharedLocation(ownerAId, 30.2, 71.47);
    const pinRow = await prisma.agentSharedLocation.findUnique({
      where: { user_id: ownerAId },
    });
    check(
      'shared pin persisted to DB',
      !!pinRow && Math.abs(pinRow.latitude - 30.2) < 1e-9 && Math.abs(pinRow.longitude - 71.47) < 1e-9,
    );
    const moveByPin = await agent.proposeMoveListing(ownerAId, { propertyId: propAId });
    check(
      'move_listing uses the DB pin',
      Math.abs(moveByPin.proposal?.changes?.latitude - 30.2) < 1e-9 &&
        Math.abs(moveByPin.proposal?.changes?.longitude - 71.47) < 1e-9,
    );
    const pinAfterConsume = await prisma.agentSharedLocation.findUnique({
      where: { user_id: ownerAId },
    });
    check('move_listing consumes the pin', pinAfterConsume === null);
    const dbPinUnchanged = await prisma.property.findUnique({ where: { id: propAId } });
    check(
      'DB: move proposal did NOT change the property',
      dbPinUnchanged.latitude !== null && Math.abs(dbPinUnchanged.latitude - 31.42) < 1e-9,
    );

    // ── Final DB dump ───────────────────────────────────────────
    console.log('\n== Final DB state (direct Prisma read) ==');
    const final = await new PrismaClient().property.findUnique({
      where: { id: propAId },
    });
    console.log(JSON.stringify(final, null, 2));
  } finally {
    // Clean up test rows
    if (ownerAId) await prisma.user.deleteMany({ where: { id: ownerAId } });
    if (ownerBId) await prisma.user.deleteMany({ where: { id: ownerBId } });
    if (ownerCId) await prisma.user.deleteMany({ where: { id: ownerCId } });
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