'use strict';
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../dist/app.module');
const { AgentService } = require('../dist/agent/agent.service');

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const agent = app.get(AgentService);

  const draft = {
    monthlyRent: 600,
    bedrooms: 2,
    bathrooms: 1,
    latitude: 40.711,
    longitude: -74.006,
    address: '155, Willow Court North',
    city: 'Hoboken',
    neighborhood: 'Hudson County',
    photos: [
      'https://sodsvuuuzwmpsfvcllpf.supabase.co/storage/v1/object/public/property-photos/properties/94a04ce9-ac92-46ed-b614-275698d9a6a4/7454b566-81d1-4e3e-bee0-cab052a2f7c4.jpg',
      'https://sodsvuuuzwmpsfvcllpf.supabase.co/storage/v1/object/public/property-photos/properties/94a04ce9-ac92-46ed-b614-275698d9a6a4/c4863bfd-0eea-4ba2-93da-f847b674aff2.jpg',
    ],
    features: [],
    title: undefined,
    description: undefined,
    neighborhoodDescription: undefined,
    sqft: undefined,
    copyAttempted: false,
    nearbyAttempted: false,
  };

  console.log('--- calling generateListingCopy ---');
  const copy = await agent.generateListingCopy(draft);
  console.log('RESULT:', JSON.stringify(copy, null, 2));

  // Raw replication of the exact request to see the model's response text.
  const key = process.env.OPENAI_API_KEY;
  const details = 'Rent: $600/mo, 2 bedroom(s), 1 bathroom(s)';
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You write rental listings for Rentia from property photos. Reply ONLY with compact JSON: {"title": string, "description": string, "features": string[]}.',
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: `These are photos of a rental property I want to list. Owner-provided details: ${details}. Write the title, description, and confirmed features.` },
            ...draft.photos.map((url) => ({ type: 'image_url', image_url: { url } })),
          ],
        },
      ],
      temperature: 0.5,
    }),
  });
  console.log('RAW STATUS:', res.status);
  const txt = await res.text();
  console.log('RAW BODY:', txt.slice(0, 800));
  await app.close();
}

main().catch((e) => {
  console.error('SCRIPT_ERROR:', e?.message ?? e);
  process.exit(1);
});
