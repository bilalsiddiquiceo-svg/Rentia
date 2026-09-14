import {
  Injectable,
  Logger,
  BadRequestException,
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentService } from '../payment/payment.service';
import { PropertiesService } from '../properties/properties.service';
import { StripeService } from '../stripe/stripe.service';
import {
  ChatDto,
  ConfirmListingEditDto,
  ConfirmStatusChangeDto,
  ConfirmImagesChangeDto,
  ConfirmListingCreateDto,
} from './agent.dto';

const AGENT_PRICE_CENTS = 4900;
const MODEL = 'gpt-4o-mini';
const MEMORY_TURNS = 20;
const DEFAULT_HISTORY_LIMIT = 20;
const MAX_TOOL_ROUNDS = 3;
const MAX_PHOTOS = 5;
const PIN_TTL_MS = 30 * 60 * 1000;
const DRAFT_TTL_MS = 60 * 60 * 1000;

type ProposalType = 'edit' | 'status' | 'images' | 'create';

interface ListingProposal {
  type: ProposalType;
  propertyId: string;
  propertyTitle: string;
  current?: Record<string, string | number | null>;
  changes?: Record<string, string | number | null>;
  status?: 'active' | 'inactive';
  add?: string[];
  removeIndices?: number[];
  currentPhotos?: string[];
  resultPhotos?: string[];
  // create-only preview card fields
  title?: string;
  description?: string;
  neighborhoodDescription?: string | null;
  neighborhood?: string | null;
  address?: string;
  city?: string;
  monthlyRent?: number;
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  photos?: string[];
  features?: string[];
}

// Listing-creation draft carried across turns while the owner feeds the agent
// photos, a pin, and details. Persisted per owner (AgentListingDraft) so it
// survives restarts; at most one active draft per owner.
interface ListingDraft {
  title?: string;
  description?: string;
  neighborhoodDescription?: string;
  address?: string;
  city?: string;
  neighborhood?: string;
  monthlyRent?: number;
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  latitude?: number;
  longitude?: number;
  photos: string[];
  features: string[];
  copyAttempted?: boolean;
  nearbyAttempted?: boolean;
}

interface NearbyPlace {
  name: string;
  meters: number;
}

// Straight-line distance in meters between two lat/lng points.
function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Approximate travel label from straight-line distance: walk under ~900 m,
// drive beyond. ponytail: no Directions API — straight-line estimate is fine
// for a listing blurb; swap for distance-matrix calls if owners demand accuracy.
function travelLabel(meters: number): string {
  if (meters <= 900) return `${Math.max(1, Math.round(meters / 80))} min walk`;
  return `${Math.max(2, Math.round(meters / 450))} min drive`;
}

// Features the vision model may confirm from photos. Anything else it returns
// is dropped so unconfirmed features never reach the approval card.
const LISTING_FEATURES = [
  'Parking', 'WiFi', 'Air Conditioning', 'Furnished', 'Pool', 'Gym',
  'Garden', 'Security', 'Generator Backup', 'Balcony', 'Elevator',
  'Pet Friendly', 'Laundry',
] as const;

const PROPOSAL_MARKERS: Record<ProposalType, string> = {
  edit: 'LISTING_EDIT',
  status: 'LISTING_STATUS',
  images: 'LISTING_IMAGES',
  create: 'LISTING_CREATE',
};

const SYSTEM_PROMPT = [
  'You are Rentia Agent, a casual and friendly AI assistant for property owners on Rentia. You help owners manage their rental business — listings, rent, leases, disputes, wallet, and performance. Keep all replies short and conversational. Format money in USD. Never show coordinates or technical information to the owner.',
  '',
  '---',
  '',
  'STEP 1 — UNDERSTAND WHAT THE OWNER WANTS',
  'Before doing anything, think briefly:',
  '- Is this a general question (wallet, leases, disputes, stats) or a listing action (edit, status, images, location, create)?',
  '- If it is a general question, answer it and clear the active listing from your context.',
  '- If it is a listing action, identify which listing they mean and what they want to do.',
  '',
  'STEP 2 — IDENTIFY THE LISTING',
  'Use [OWNER PROPERTIES] to find the listing. Match by name, city, rent, bedrooms, or any attribute mentioned.',
  '- One match → proceed immediately, no questions',
  '- Multiple matches → show the options and ask the owner to pick',
  '- Active listing in [CONVERSATION STATE] → words like "it", "that one", "yes", or a number refer to this listing, never ask again',
  '- No match → tell the owner plainly',
  '',
  'STEP 3 — ACT',
  'Call the correct tool to prepare a proposal. Never apply changes directly. The owner always approves from the review card first.',
  'Call the tool in the SAME reply — never say "I will prepare a proposal" or promise a card for later. The review card IS the confirmation step; announcing it without calling the tool leaves the owner with nothing to review.',
  '',
  'Supported actions:',
  '- Edit listing: title, description, rent, beds, baths, sqft, address',
  '- Activate or deactivate: single listing or bulk',
  '- Reorder or remove images',
  '- Move listing location via shared map pin',
  '- Create new listing',
  '',
  '---',
  '',
  'BULK OPERATIONS',
  'If the owner says "activate all inactive" or "deactivate everything in Karachi" find all matching listings from [OWNER PROPERTIES] and prepare one combined proposal card covering all of them.',
  '',
  '---',
  '',
  'NEW LISTING CREATION',
  'You need exactly three things to create a listing: at least one photo, a location pin, and a rent amount. Collect what is missing one at a time in this order: photos first, then location, then rent. Never ask for something already collected.',
  '',
  'Once all three are collected call create_listing immediately. Do not wait for the owner to say "create it" — just call the tool. The card handles the rest.',
  '',
  'Draft continuation rule: if the owner says "I want to create a new listing" and you already have a draft with some collected info, do not wipe it. Instead tell the owner exactly what you have in plain friendly language and ask if they want to continue or start fresh.',
  'Example: "I already have some details — rent $1300, 3 bedrooms, 2 bathrooms, location: Township Lahore. Want to continue with this or start fresh?"',
  '- Continue → check what is missing, ask for each one at a time, then create',
  '- Start fresh → wipe everything, begin blank',
  '',
  '---',
  '',
  'IMAGE REORDERING',
  'When the owner says "make image 3 first and image 1 third" map the current positions, apply the exact swaps, and show the new order in the approval card.',
  '',
  '---',
  '',
  'RULES',
  '- Never dump raw property or lease data on an action request — call the tool and let the card show the details',
  '- Never invent data — if unknown say so plainly',
  '- Never show coordinates — always use the human readable address',
  '- If the owner asks about anything unrelated to property management — coding, programming, general knowledge, politics, math, or any other topic — respond with exactly this: "I can only help with your property business on Rentia." Nothing more, nothing else. Do not explain, do not suggest alternatives, do not engage with the off-topic request at all.',
  '',
  '---',
  '',
  'EXAMPLES',
  '',
  'Example A — updating a listing (covers: attribute match, thinking process, acting without unnecessary questions)',
  '',
  'Owner: "Change the rent for the one in Lahore to $800"',
  '',
  'Thinking: This is a listing action. Owner wants to edit rent. They said "the one in Lahore" — checking [OWNER PROPERTIES] — one listing in Lahore: TOWNHOUSE $330/mo. Clear match, no need to ask. I will call update_listing with the new rent.',
  '',
  'Agent reply: "Got it — preparing a rent update for TOWNHOUSE from $330 to $800. Review the card below."',
  '',
  '---',
  '',
  'Example B — creating a new listing (covers: collecting missing info one by one, draft continuation, calling create_listing automatically)',
  '',
  'Owner: "I want to create a new listing"',
  '',
  'Thinking: Creation intent detected. Checking draft — rent $1300, 3 beds, 2 baths, location Township Lahore already collected. Photos missing. I should tell the owner what I have and ask if they want to continue.',
  '',
  'Agent reply: "I already have some details — rent $1300, 3 bedrooms, 2 bathrooms, location: Township Lahore. Want to continue with this or start fresh?"',
  '',
  'Owner: "Continue"',
  '',
  'Thinking: Owner confirmed. Checking what is missing — photos not collected yet. Ask for photos first.',
  '',
  'Agent reply: "Great — just send me some photos of the property and I will generate the full listing."',
  '',
  'Owner: uploads 3 photos',
  '',
  'Thinking: Now I have all three — photos, location, rent. Calling create_listing now without waiting.',
  '',
  'Agent reply: "Generating your listing now — review the card below and approve when ready."',
  '',
  '---',
  '',
  'Example C — bulk operation (covers: bulk thinking, one card for all)',
  '',
  'Owner: "Deactivate all my listings in Lahore"',
  '',
  'Thinking: Bulk operation. Owner wants to deactivate all Lahore listings. Checking [OWNER PROPERTIES] — TOWNHOUSE Lahore and Gulberg Apartment Lahore both match. I will prepare one combined proposal for both.',
  '',
  'Agent reply: "Found 2 listings in Lahore — preparing a deactivation proposal for both. Review the card below."',
].join(' ');

const NO_ARG_TOOLS: Array<{ name: string; description: string }> = [
  {
    name: 'get_financials',
    description:
      'Get the owner wallet: pending (held) balance, approved balance, every held payment with its release date (hold = 7 days), and Stripe Connect payout status.',
  },
  {
    name: 'get_leases',
    description:
      'List the owner\'s leases: property title, tenant name, start/end dates, months, monthly rent, status, failed payment attempts.',
  },
  {
    name: 'get_properties',
    description:
      'List the owner\'s properties (1-based listNumber), with title, city, rent, bedrooms, bathrooms, status, bookable, photos, view and click counts. Use listNumber to map "listing 1", "the first listing", etc.',
  },
  {
    name: 'get_disputes',
    description: 'List the owner\'s payment disputes: reason, status, amount, property.',
  },
  {
    name: 'get_stats',
    description:
      'Owner dashboard summary: total/active properties, total views and clicks, projected monthly revenue, pending bookings, total bookings, recent leases.',
  },
];

function buildTools(): any[] {
  const tools: any[] = NO_ARG_TOOLS.map((t) => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  }));
  tools.push(
    {
      type: 'function',
      function: {
        name: 'create_listing',
        description:
          'Create a NEW listing for the owner from their photos, their shared location pin, and basic details. Pass every detail the owner has given so far (monthlyRent in whole US dollars, bedrooms, bathrooms, and optionally title, description, neighborhoodDescription, address, city, neighborhood, sqft) plus photo URLs they attached in chat; the location pin is picked up automatically from what the owner shared. If anything is still missing the tool reports it — relay ONLY those questions to the owner. Once everything is present it generates the property description from the photos and a neighbourhood description from nearby places (Google Places), then shows a preview card the owner must approve before the listing is created. To adjust an existing preview card (rewrite description, change rent…), call this tool again with ALL fields including the updated ones.',
        parameters: {
          type: 'object',
          properties: {
            title: { type: 'string', maxLength: 120 },
            description: { type: 'string', maxLength: 2000 },
            neighborhoodDescription: { type: 'string', maxLength: 2000 },
            monthlyRent: { type: 'integer', minimum: 1, maximum: 100000, description: 'Monthly rent in whole US dollars.' },
            bedrooms: { type: 'integer', minimum: 0, maximum: 20 },
            bathrooms: { type: 'integer', minimum: 0, maximum: 20 },
            sqft: { type: 'integer', minimum: 0 },
            address: { type: 'string', maxLength: 200 },
            city: { type: 'string', maxLength: 80 },
            neighborhood: { type: 'string', maxLength: 80 },
            photos: { type: 'array', items: { type: 'string' }, description: 'Photo URLs the owner attached in chat.' },
          },
          additionalProperties: false,
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'update_listing',
        description:
          'Prepare proposed edits to one of the owner\'s existing listings (title, description, address, city, neighborhood, neighborhoodDescription, monthlyRent in whole US dollars, bedrooms, bathrooms, sqft). Identify the listing from the property context; if the owner does not name one, use the active listing id from the [CONVERSATION STATE] block. Moving the pin: use move_listing instead. Prepares a review card — never applies the change directly.',
        parameters: {
          type: 'object',
          properties: {
            propertyId: { type: 'string', description: 'The listing id from the property context.' },
            query: { type: 'string', description: 'Alternative to propertyId: listing name, a number like "1" or "listing 1", or any description resolvable from the property context (e.g. "the one with a monthly rent of 229", "the 2-bedroom one", "the one in Lahore").' },
            title: { type: 'string', maxLength: 120 },
            description: { type: 'string', maxLength: 2000 },
            neighborhoodDescription: { type: 'string', maxLength: 2000 },
            address: { type: 'string', maxLength: 200 },
            city: { type: 'string', maxLength: 80 },
            neighborhood: { type: 'string', maxLength: 80 },
            monthlyRent: { type: 'integer', minimum: 0, maximum: 100000, description: 'Monthly rent in whole US dollars.' },
            bedrooms: { type: 'integer', minimum: 0, maximum: 20 },
            bathrooms: { type: 'integer', minimum: 0, maximum: 20 },
            sqft: { type: 'integer', minimum: 0 },
            latitude: { type: 'number', minimum: -90, maximum: 90 },
            longitude: { type: 'number', minimum: -180, maximum: 180 },
          },
          additionalProperties: false,
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'set_listing_status',
        description:
          'Prepare a proposal to activate or deactivate one or more of the owner\'s listings (status: "active" or "inactive"). Deactivated listings disappear from browsing. For a bulk request (e.g. "activate all deactivated properties", "deactivate everything in Karachi"), pass ALL matching listing ids from the property context in propertyIds in a single call. For a single listing, use propertyId or query (listing id, exact name, or a number like "listing 1"); if the owner does not name one, use the active listing id from the [CONVERSATION STATE] block. Prepares a review card — never applies the change directly.',
        parameters: {
          type: 'object',
          properties: {
            propertyIds: { type: 'array', items: { type: 'string' }, description: 'Listing ids (from the property context) for a bulk status change — pass every matching listing, never just one.' },
            propertyId: { type: 'string', description: 'The listing id from the property context.' },
            query: { type: 'string', description: 'Alternative to propertyId: listing name, a number like "1" or "listing 1", or any description resolvable from the property context.' },
            status: { type: 'string', enum: ['active', 'inactive'] },
          },
          required: ['status'],
          additionalProperties: false,
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'update_listing_images',
        description:
          'Prepare a proposal to change the photos of the owner\'s listing: add new photo URLs (from the owner\'s attached photos), remove existing photos by their 1-based position (photo #1 = first photo shown), and/or resequence them with newOrder for requests like "make image 3 the first one and image 1 the third". A listing can hold at most 5 photos. Identify the listing from the property context; if the owner only gives positions ("remove images 3 4 5") without naming a listing, use the active listing id from the [CONVERSATION STATE] block. Prepares a review card — never applies the change directly.',
        parameters: {
          type: 'object',
          properties: {
            propertyId: { type: 'string', description: 'The listing id from the property context.' },
            query: { type: 'string', description: 'Alternative to propertyId: listing name, a number like "1" or "listing 1", or any description resolvable from the property context.' },
            add: { type: 'array', items: { type: 'string' }, description: 'New photo URLs to append (e.g. photo the owner attached in chat).' },
            removeIndices: { type: 'array', items: { type: 'integer', minimum: 1 }, description: '1-based positions of existing photos to remove.' },
            newOrder: { type: 'array', items: { type: 'integer', minimum: 1 }, description: 'Full resequencing of the photo list after this call\'s removals/additions, e.g. [3,2,1] puts photo 3 first and photo 1 third. Must contain every position from 1 to the final count exactly once. Map the owner\'s swap instructions onto current positions exactly.' },
          },
          additionalProperties: false,
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'move_listing',
        description:
          'Prepare a proposal to move the owner\'s listing to the location pin they shared (a pin they attached to a message). The shared pin is applied automatically — do not pass coordinates. Identify the listing from the property context; if the owner does not name one, use the active listing id from the [CONVERSATION STATE] block. If the owner has not shared a pin, the tool says so and you should ask them to share one. Prepares a review card — never applies the change directly.',
        parameters: {
          type: 'object',
          properties: {
            propertyId: { type: 'string', description: 'The listing id from the property context.' },
            query: { type: 'string', description: 'Alternative to propertyId: listing name, a number like "1" or "listing 1", or any description resolvable from the property context.' },
          },
          additionalProperties: false,
        },
      },
    },
  );
  return tools;
}

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);
  private readonly openaiKey: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentService: PaymentService,
    private readonly propertiesService: PropertiesService,
    private readonly stripeService: StripeService,
    private readonly configService: ConfigService,
  ) {
    this.openaiKey = this.configService.get<string>('OPENAI_API_KEY', '');
  }

  // ── Billing ─────────────────────────────────────────────────

  async subscribe(userId: string) {
    const customerId = await this.paymentService.getOrCreateCustomer(userId);
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');

    const session = await this.stripeService.getClient().checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: AGENT_PRICE_CENTS,
            recurring: { interval: 'month' },
            product_data: { name: 'Rentia Agent' },
          },
          quantity: 1,
        },
      ],
      metadata: { kind: 'agent', user_id: userId },
      success_url: `${frontendUrl}/dashboard/agent?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/dashboard/agent`,
    });

    await this.prisma.agentSubscription.upsert({
      where: { user_id: userId },
      create: { user_id: userId, stripe_checkout_session_id: session.id },
      update: { stripe_checkout_session_id: session.id },
    });

    return { url: session.url };
  }

  async status(userId: string) {
    const sub = await this.prisma.agentSubscription.findUnique({
      where: { user_id: userId },
    });
    const active = sub?.status === 'active';
    let cancelAtPeriodEnd = false;
    if (active && sub?.stripe_subscription_id) {
      try {
        const stripeSub = await this.stripeService
          .getClient()
          .subscriptions.retrieve(sub.stripe_subscription_id);
        cancelAtPeriodEnd = stripeSub.cancel_at_period_end === true;
      } catch (e: any) {
        this.logger.warn(
          `Could not retrieve agent subscription ${sub.stripe_subscription_id}: ${e?.message ?? e}`,
        );
      }
    }
    return {
      active,
      currentPeriodEnd: sub?.current_period_end ?? null,
      cancelAtPeriodEnd,
    };
  }

  async cancelSubscription(userId: string) {
    const sub = await this.prisma.agentSubscription.findUnique({
      where: { user_id: userId },
    });
    if (sub?.status !== 'active') {
      return { active: false, currentPeriodEnd: null, cancelAtPeriodEnd: false };
    }
    if (!sub.stripe_subscription_id) {
      throw new BadRequestException(
        'No active subscription found to cancel. Try again or contact support.',
      );
    }

    await this.stripeService
      .getClient()
      .subscriptions.update(sub.stripe_subscription_id, {
        cancel_at_period_end: true,
      });

    this.logger.log(
      `Agent subscription cancel-at-period-end requested for user ${userId}`,
    );
    return this.status(userId);
  }

  async listPayments(userId: string) {
    const [sub, user] = await Promise.all([
      this.prisma.agentSubscription.findUnique({
        where: { user_id: userId },
        select: { stripe_subscription_id: true },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { stripe_customer_id: true },
      }),
    ]);
    const customerId = user?.stripe_customer_id;
    if (!customerId) {
      return { items: [] };
    }

    const invoices = await this.paymentService.stripe.invoices.list({
      customer: customerId,
      ...(sub?.stripe_subscription_id
        ? { subscription: sub.stripe_subscription_id }
        : {}),
      limit: 30,
    });

    return {
      items: invoices.data.map((inv) => {
        const i = inv as any;
        return {
          id: i.id,
          status: i.status,
          date: i.created ? new Date(i.created * 1000).toISOString() : null,
          amount: i.total ?? i.amount_due ?? 0,
          currency: (i.currency ?? 'usd').toUpperCase(),
          hostedInvoiceUrl: i.hosted_invoice_url ?? null,
          subscription: typeof i.subscription === 'string' ? i.subscription : null,
        };
      }),
    };
  }

  private async assertActive(userId: string) {
    const sub = await this.prisma.agentSubscription.findUnique({
      where: { user_id: userId },
    });
    if (sub?.status !== 'active') {
      throw new ForbiddenException(
        'You need an active Rentia Agent subscription to use the assistant.',
      );
    }
  }

  async history(userId: string, opts: { before?: string; limit?: number } = {}) {
    const limit = Math.min(Math.max(opts.limit ?? DEFAULT_HISTORY_LIMIT, 1), 50);

    const rows = await this.prisma.agentMessage.findMany({
      where: {
        user_id: userId,
        ...(opts.before ? { created_at: { lt: new Date(opts.before) } } : {}),
      },
      orderBy: { created_at: 'desc' },
      take: limit + 1,
      select: { id: true, role: true, content: true, created_at: true },
    });

    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);
    const oldest = page[page.length - 1];

    return {
      items: page
        .reverse()
        .map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          createdAt: m.created_at.toISOString(),
        })),
      hasMore,
      nextCursor: oldest ? oldest.created_at.toISOString() : null,
    };
  }

  // ── Chat + tools ────────────────────────────────────────────

  async chat(userId: string, dto: ChatDto) {
    await this.assertActive(userId);

    // New-listing intent no longer auto-deletes the draft — the model now
    // asks the owner whether to continue or start fresh (per system prompt).
    const newIntent = this.isNewListingIntent(dto.message);
    const freshIntent = this.isStartFreshIntent(dto.message);
    if (freshIntent) {
      await this.resetDraft(userId);
      await this.prisma.agentMessage.deleteMany({ where: { user_id: userId } });
      await this.prisma.agentSharedLocation.deleteMany({
        where: { user_id: userId, slot: 'create' },
      });
      // Persisted so the reset note keeps injecting on every later request
      // until a listing is actually created (survives restarts/instances).
      await this.setStartedFresh(userId, true);
    } else if (newIntent) {
      // A brand-new creation flow supersedes any pending fresh-start note.
      await this.clearStartedFresh(userId);
    }

    const state = await this.loadConversationContext(userId);

    if (dto.location) {
      // Route the pin to the slot matching the active flow: create slot iff a
      // creation is in progress, this message starts one, or a fresh-started
      // session is still collecting its first details. With no active flow the
      // intent is unknown, so write both slots — a pin shared before the owner
      // ever mentions creation must still be found by create_listing.
      const creating =
        newIntent || !!(await this.loadDraftRow(userId)) || state.started_fresh;
      if (creating) {
        await this.storeSharedLocation(userId, dto.location.latitude, dto.location.longitude, 'create');
      } else {
        await Promise.all([
          this.storeSharedLocation(userId, dto.location.latitude, dto.location.longitude, 'move'),
          this.storeSharedLocation(userId, dto.location.latitude, dto.location.longitude, 'create'),
        ]);
      }
    }
    const photosSuffix =
      dto.photos && dto.photos.length > 0
        ? ` [Attached photos: ${dto.photos.join(', ')}]`
        : '';
    const content = dto.message + photosSuffix;

    const [history, properties] = await Promise.all([
      this.prisma.agentMessage.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'asc' },
        take: MEMORY_TURNS,
        select: { role: true, content: true },
      }),
      this.getProperties(userId),
    ]);

    // ── Conversation memory (persisted, carries topic across turns) ──
    // 3) Validate the stored active listing before trusting it: if it no
    //    longer exists or is not owned, clear it; refresh the stored title.
    let storedActive: { id: string; title: string } | null = null;
    if (state.active_listing_id) {
      const prop = properties.find((p) => p.id === state.active_listing_id);
      if (!prop) {
        await this.clearConversationContext(userId);
      } else {
        storedActive = { id: prop.id, title: prop.title };
        if (prop.title !== state.active_listing_title) {
          await this.updateConversationContext(userId, prop.id, prop.title);
        }
      }
    }

    // 1) General questions (wallet, leases, disputes, totals…) ignore the
    //    active listing for this request without clearing it.
    // 2) Ambiguous references must ask instead of silently guessing.
    const general = this.isGeneralQuestion(dto.message);
    let activeListing: { id: string; title: string } | null = null;
    let ambiguity: any[] | null = null;
    if (!general) {
      const resolution = await this.resolveConversationListing(userId, dto.message);
      if (resolution.status === 'resolved') {
        activeListing = resolution.listing;
        if (state.active_listing_id !== resolution.listing.id) {
          await this.updateConversationContext(
            userId,
            resolution.listing.id,
            resolution.listing.title,
          );
        }
      } else if (resolution.status === 'ambiguous') {
        ambiguity = resolution.matches;
      } else if (storedActive) {
        // Nothing resolved, no ambiguity: the owner is still on the previous
        // topic (e.g. "remove images 3 4 5" after talking about TOWNHOUSE).
        activeListing = storedActive;
      }
    }

    // Draft visibility (Fix 3): tell the model exactly what the in-progress
    // creation already holds so it never re-asks for collected details.
    const activeDraft = await this.loadDraft(userId);
    const draftHasContent =
      activeDraft.photos.length > 0 ||
      activeDraft.latitude !== undefined ||
      activeDraft.monthlyRent !== undefined ||
      activeDraft.bedrooms !== undefined ||
      activeDraft.bathrooms !== undefined ||
      !!activeDraft.title ||
      !!activeDraft.description ||
      !!activeDraft.address;

    // Pin availability (replaces the removed move-bias suffix): the model
    // must know a stored pin exists instead of re-asking the owner.
    const pinBlock = await this.pinContextBlock(userId);

    // Creation in progress → tag the property list so its real existing
    // listings can never masquerade as collected draft data.
    const creatingFlow = state.started_fresh || !!(await this.loadDraftRow(userId));

    const messages: any[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content:
          (creatingFlow
            ? '[IMPORTANT] The properties below are existing listings already on Rentia.\nThey are NOT details being collected for the new listing.\nNever use any values from this list as draft data for the new listing currently being created.\n'
            : '') +
          '[PROPERTY CONTEXT] Every listing the owner currently has. Resolve listing references from this list (by id, title, city, neighborhood, rent, bedrooms, status, etc.) — do not ask the owner which listing when the context already answers it.\n' +
          JSON.stringify(properties),
      },
      ...(draftHasContent
        ? [{ role: 'user', content: this.draftStateBlock(activeDraft) }]
        : []),
      ...(pinBlock ? [{ role: 'user', content: pinBlock }] : []),
      ...(state.started_fresh
        ? [
            {
              role: 'user' as const,
              content:
                '[LISTING CREATION RESET] Owner started fresh — all previously collected listing details are cleared. Do not use any details from before this point. If a listing creation was in progress, it has been wiped. Follow the NEW LISTING CREATION instructions from scratch: collect photos, location pin, and rent one at a time.',
            },
          ]
        : []),
      ...(activeListing
        ? [
            {
              role: 'user',
              content: `[CONVERSATION STATE] The listing the owner is currently talking about: "${activeListing.title}" (id: ${activeListing.id}). Replies like "yes", "that one", "it", "this listing", or position numbers without a listing name refer to this listing. Do not ask which listing — act on this one unless the owner clearly names another.`,
            },
          ]
        : []),
      ...(ambiguity
        ? [{ role: 'user', content: this.ambiguityBlock(ambiguity) }]
        : []),
      // Strip the legacy move-bias suffix from any persisted message so it
      // can never reach the model again, even from old rows.
      ...history.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content.replace(
          /\s*\[The owner shared a location pin[^\]]*\]/g,
          '',
        ),
      })),
      { role: 'user', content },
    ];

    let reply = '';
    const proposals: ListingProposal[] = [];
    for (let i = 0; i < MAX_TOOL_ROUNDS; i++) {
      console.log('FULL_CONTEXT:', JSON.stringify(messages, null, 2));
      const assistantMsg = await this.callOpenAI({
        model: MODEL,
        messages,
        tools: buildTools(),
        tool_choice: 'auto',
        temperature: 0.3,
      });

      const toolCalls = assistantMsg.tool_calls ?? [];
      if (toolCalls.length === 0) {
        reply = assistantMsg.content ?? '';
        break;
      }

      messages.push({
        role: 'assistant',
        content: assistantMsg.content ?? null,
        tool_calls: toolCalls,
      });
      for (const tc of toolCalls) {
        let result: any;
        try {
          const args = tc.function?.arguments ? JSON.parse(tc.function.arguments) : {};
          const out = await this.runTool(userId, tc.function?.name ?? '', args, dto.photos ?? []);
          result = out.result;
          if (out.proposal) proposals.push(out.proposal);
          if (out.proposals) proposals.push(...out.proposals);
        } catch (err: any) {
          result = { error: err?.message ?? 'Tool failed' };
        }
        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        });
      }
    }

    if (proposals.length > 0) {
      reply = proposals
        .map((p) => `${PROPOSAL_MARKERS[p.type]} ${JSON.stringify(p)}`)
        .join('\n');
    }

    if (!reply) {
      reply =
        'I could not find an answer for that. Try asking about your wallet, leases, properties, disputes, or performance.';
    }

    await this.prisma.agentMessage.createMany({
      data: [
        { user_id: userId, role: 'user', content },
        { user_id: userId, role: 'assistant', content: reply },
      ],
    });

    return { reply };
  }

  private async runTool(
    userId: string,
    name: string,
    args: Record<string, unknown>,
    chatPhotos: string[] = [],
  ): Promise<{
    result: any;
    proposal?: ListingProposal | null;
    proposals?: ListingProposal[];
  }> {
    switch (name) {
      case 'get_financials':
        return { result: await this.getFinancials(userId) };
      case 'get_leases':
        return { result: await this.getLeases(userId) };
      case 'get_properties':
        return { result: await this.getProperties(userId) };
      case 'get_disputes':
        return { result: await this.getDisputes(userId) };
      case 'get_stats':
        return { result: await this.getStats(userId) };
      case 'create_listing':
        return this.proposeListingCreate(userId, args, chatPhotos);
      case 'update_listing':
        return this.proposeListingEdit(userId, args);
      case 'move_listing':
        return this.proposeMoveListing(userId, args);
      case 'set_listing_status':
        return this.proposeStatusChange(userId, args);
      case 'update_listing_images':
        return this.proposeImagesChange(userId, args);
      default:
        return { result: { error: `Unknown tool: ${name}` } };
    }
  }

  // ── Listing management proposals + confirms ────────────────

  private listingSummary(p: any) {
    return `${p.title}${p.city ? ` — ${p.city}` : ''} · $${p.monthly_rent}/mo · ${p.bedrooms} bed${p.bathrooms ? ` · ${p.bathrooms} bath` : ''}`;
  }

  private async matchListingsByAttributes(
    userId: string,
    message: string,
    listings?: any[],
  ): Promise<any[]> {
    const all = listings ?? (await this.ownerListings(userId));
    if (all.length === 0) return [];
    const criteria = this.extractListingCriteria(message, all);
    if (criteria.length === 0) return [];
    return all.filter((p) => criteria.every((c) => c.test(p)));
  }

  private async resolveListingByAttributes(
    userId: string,
    message: string,
    listings?: any[],
  ): Promise<any | null> {
    const matches = await this.matchListingsByAttributes(userId, message, listings);
    return matches.length === 1 ? matches[0] : null;
  }

  private extractListingCriteria(
    message: string,
    listings: any[],
  ): Array<{ key: string; test: (p: any) => boolean }> {
    const criteria: Array<{ key: string; test: (p: any) => boolean }> = [];
    const pushIfNew = (key: string, test: (p: any) => boolean) => {
      if (!criteria.some((c) => c.key === key)) criteria.push({ key, test });
    };

    const rent = message.match(
      /\b(?:monthly\s*)?(?:rent|price|rate|cost)\w*\s+(?:of|is|=|:)?\s*\$?\s*(\d{1,6})\b/i,
    );
    if (rent) {
      const v = Number(rent[1]);
      pushIfNew('rent', (p) => p.monthly_rent === v);
    }
    const dollars = message.match(/\$?\s*(\d{1,6})(?:\s*[-/]\s*|\s+)(?:dollars?|usd|bucks?)\b/i);
    if (dollars) {
      const v = Number(dollars[1]);
      pushIfNew('rent', (p) => p.monthly_rent === v);
    }

    const beds = message.match(/\b(\d{1,2})\s*(?:bedrooms?|beds?|br)\b/i);
    if (beds) {
      const v = Number(beds[1]);
      pushIfNew('bedrooms', (p) => p.bedrooms === v);
    }
    const baths = message.match(/\b(\d{1,2})\s*(?:bathrooms?|baths?|ba)\b/i);
    if (baths) {
      const v = Number(baths[1]);
      pushIfNew('bathrooms', (p) => p.bathrooms === v);
    }
    const sqft = message.match(
      /\b(\d{3,6})\s*(?:sq\.?\s*ft\.?|square\s*(?:feet|foot)|sqft)\b|\barea\b[^\n]{0,30}?(\d{3,6})\b/i,
    );
    const sqftVal = Number(sqft?.[1] ?? sqft?.[2]);
    if (sqft && Number.isInteger(sqftVal)) {
      pushIfNew('sqft', (p) => p.sqft === sqftVal);
    }

    for (const p of listings) {
      for (const place of [p.city, p.neighborhood]) {
        const word = String(place ?? '').trim();
        if (word && new RegExp(`\\b${this.escapeRegex(word)}\\b`, 'i').test(message)) {
          pushIfNew(`place:${word.toLowerCase()}`, (x) => {
            const c = String(x.city ?? '').toLowerCase();
            const n = String(x.neighborhood ?? '').toLowerCase();
            return c === word.toLowerCase() || n === word.toLowerCase();
          });
          break;
        }
      }
    }

    const STOPWORDS = new Set([
      'the', 'and', 'with', 'that', 'this', 'which', 'where', 'property',
      'listing', 'rent', 'price', 'rate', 'cost', 'bedroom', 'bathroom',
      'bedrooms', 'bathrooms', 'monthly', 'dollar', 'dollars', 'area', 'have', 'has',
    ]);
    for (const p of listings) {
      const titleWords = new Set(
        String(p.title)
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, ' ')
          .split(/\s+/)
          .filter((w) => w.length >= 4 && !STOPWORDS.has(w)),
      );
      for (const w of titleWords) {
        if (new RegExp(`\\b${this.escapeRegex(w)}\\b`, 'i').test(message)) {
          pushIfNew(`title:${w}`, (x) =>
            String(x.title ?? '').toLowerCase().includes(w),
          );
          break;
        }
      }
    }

    return criteria;
  }

  private escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // ── Conversation memory (persisted, carries topic across turns) ──

  private async loadConversationContext(userId: string) {
    let ctx = await this.prisma.agentConversationContext.findUnique({
      where: { user_id: userId },
    });
    if (!ctx) {
      ctx = await this.prisma.agentConversationContext.create({
        data: { user_id: userId },
      });
    }
    return ctx;
  }

  private async updateConversationContext(
    userId: string,
    listingId: string,
    title: string,
  ) {
    await this.prisma.agentConversationContext.upsert({
      where: { user_id: userId },
      create: { user_id: userId, active_listing_id: listingId, active_listing_title: title },
      update: { active_listing_id: listingId, active_listing_title: title },
    });
  }

  private async setStartedFresh(userId: string, value: boolean) {
    await this.prisma.agentConversationContext.upsert({
      where: { user_id: userId },
      create: { user_id: userId, started_fresh: value },
      update: { started_fresh: value },
    });
  }

  private async clearStartedFresh(userId: string) {
    await this.prisma.agentConversationContext.updateMany({
      where: { user_id: userId, started_fresh: true },
      data: { started_fresh: false },
    });
  }

  private isListingPronoun(message: string): boolean {
    return /^\s*(yes|yeah|yep|sure|ok|okay|alright|that one|the one|this one|it|that|this)\s*[.!]?\s*$/i.test(
      message,
    );
  }

  private extractListingRefs(message: string): string[] {
    const out: string[] = [];
    const uuid = message.match(
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i,
    );
    if (uuid) out.push(uuid[0]);
    const numbered = message.match(/\b(?:listing|property|list)\s+(?:number\s*)?#?\s*(\d{1,3})\b/i);
    if (numbered) out.push(numbered[1]);
    const bare = message.match(/^\s*#?\s*(\d{1,3})\s*$/);
    if (bare) out.push(bare[1]);
    const quoted = message.match(/["'`]([^"'`]{2,80})["'`]/);
    if (quoted) out.push(quoted[1]);
    const trimmed = message.trim();
    if (trimmed.length > 0 && trimmed.length <= 80 && !this.isListingPronoun(message)) {
      out.push(trimmed);
    }
    return [...new Set(out.map((s) => s.trim()).filter(Boolean))];
  }

  private async resolveConversationListing(
    userId: string,
    message: string,
  ): Promise<
    | { status: 'resolved'; listing: { id: string; title: string } }
    | { status: 'ambiguous'; matches: any[] }
    | { status: 'none' }
  > {
    for (const ref of this.extractListingRefs(message)) {
      const res = await this.resolveListingRef(userId, ref);
      if ('property' in res) {
        return {
          status: 'resolved',
          listing: { id: res.property.id, title: res.property.title },
        };
      }
    }
    const matches = await this.matchListingsByAttributes(userId, message);
    if (matches.length === 1) {
      return {
        status: 'resolved',
        listing: { id: matches[0].id, title: matches[0].title },
      };
    }
    if (matches.length > 1) {
      return { status: 'ambiguous', matches };
    }
    return { status: 'none' };
  }

  // Questions that apply to all of the owner's properties: the active listing
  // context must not be applied (and is not cleared for them either).
  private isGeneralQuestion(message: string): boolean {
    const m = message.toLowerCase();
    return (
      /\b(wallet|balance|earnings?|revenue|profit|income|rents?( collected| paid| owing)?|payments?|transactions?|held|released|disputes?|leases?|bookings?|stats?|statistics|performance|analytics|dashboard|overview|summary|portfolio)\b/.test(
        m,
      ) ||
      /\b((how much|how many|total|all|everything)\s).*(rent|income|earnings|money|bookings|leases|disputes|revenue)/.test(
        m,
      )
    );
  }

  private async clearConversationContext(userId: string) {
    await this.prisma.agentConversationContext.deleteMany({
      where: { user_id: userId },
    });
  }

  private ambiguityBlock(matches: any[]): string {
    const lines = matches
      .map((p, i) => `${i + 1}) ${this.listingSummary(p)}`)
      .join('\n');
    return (
      '[AMBIGUOUS LISTING REFERENCE] Multiple listings match what the owner said. Do NOT guess and do NOT fall back to the previous listing. Show these options and ask the owner to reply with a number:\n' +
      lines
    );
  }

  // ── Shared location pins — one slot per flow, never shared ──
  // 'create': consumed by listing creation. 'move': consumed by move_listing.
  // chat() routes an incoming pin to the create slot iff a creation is in
  // progress (draft exists or the message starts one); with no flow signal it
  // writes both slots, so an early pin works for whichever flow follows next.

  private async storeSharedLocation(
    userId: string,
    latitude: number,
    longitude: number,
    slot: 'create' | 'move',
  ) {
    await this.prisma.agentSharedLocation.upsert({
      where: { user_id_slot: { user_id: userId, slot } },
      create: { user_id: userId, slot, latitude, longitude },
      update: { latitude, longitude, created_at: new Date() },
    });
  }

  async setSharedLocation(
    userId: string,
    latitude: number,
    longitude: number,
    slot: 'create' | 'move' = 'move',
  ) {
    await this.storeSharedLocation(userId, latitude, longitude, slot);
  }

  private async getPin(
    userId: string,
    slot: 'create' | 'move',
  ): Promise<
    { latitude: number; longitude: number } | undefined
  > {
    const pin = await this.prisma.agentSharedLocation.findUnique({
      where: { user_id_slot: { user_id: userId, slot } },
    });
    if (!pin) return undefined;
    if (Date.now() - pin.created_at.getTime() > PIN_TTL_MS) {
      await this.prisma.agentSharedLocation.deleteMany({
        where: { user_id: userId, slot },
      });
      return undefined;
    }
    return { latitude: pin.latitude, longitude: pin.longitude };
  }

  private async ownerListings(userId: string) {
    return this.prisma.property.findMany({
      where: { owner_id: userId },
      orderBy: { created_at: 'desc' },
      take: 50,
    });
  }

  private numberedListingHint(props: { title: string; city: string }[], query?: string) {
    const header = query
      ? `No listing matched "${query}". Which one?`
      : "Which listing?";
    const list = props
      .map((p, i) => `${i + 1}) ${this.listingSummary(p)}`)
      .join('\n');
    return `${header}\n${list}\nReply with a number (e.g. "1") or the listing name.`;
  }

  private async resolveListingRef(
    userId: string,
    ref: unknown,
  ): Promise<
    | { property: any }
    | { error: { result: { error: string; needsListing?: boolean } } }
  > {
    const raw = String(ref ?? '').trim();
    if (!raw) {
      return {
        error: {
          result: {
            error:
              'Specify the listing by id, name, or number (e.g. "listing 1" or "1").',
            needsListing: true,
          },
        },
      };
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw);
    if (isUuid) {
      const property = await this.prisma.property.findFirst({
        where: { id: raw, owner_id: userId },
      });
      if (!property) {
        return {
          error: {
            result: {
              error: 'Property not found. Use its name or number instead.',
              needsListing: true,
            },
          },
        };
      }
      return { property };
    }

    const ordinal = raw.match(/^(?:listing|property|list|the|#)?\s*#?\s*(\d{1,3})$/i);
    if (ordinal) {
      const props = await this.ownerListings(userId);
      const idx = Number(ordinal[1]) - 1;
      if (idx >= 0 && idx < props.length) {
        return { property: props[idx] };
      }
      return {
        error: { result: { error: this.numberedListingHint(props), needsListing: true } },
      };
    }

    const matches = await this.prisma.property.findMany({
      where: { owner_id: userId, title: { contains: raw, mode: 'insensitive' } },
      orderBy: { created_at: 'desc' },
      take: 50,
    });
    if (matches.length === 1) {
      return { property: matches[0] };
    }
    // Descriptive queries (e.g. "the one with a monthly rent of 229", "the
    // 2-bedroom one", "the one in Lahore") resolve through the same attribute
    // matcher as the deterministic chat path so the LLM tool path behaves the
    // same way.
    const byAttributes = await this.resolveListingByAttributes(userId, raw);
    if (byAttributes) {
      return { property: byAttributes };
    }
    return {
      error: {
        result: {
          error: this.numberedListingHint(
            matches.length > 0 ? matches : await this.ownerListings(userId),
            raw,
          ),
          needsListing: true,
        },
      },
    };
  }

  private pickListingRef(args: Record<string, unknown>): unknown {
    return args.propertyId !== undefined && String(args.propertyId).trim() !== ''
      ? args.propertyId
      : args.query;
  }

  // ── Listing creation (conversational) ──────────────────────

  // Draft persistence — one row per owner, TTL-checked lazily.
  private draftRowWhere(userId: string) {
    return { user_id: userId };
  }

  private rowToDraft(r: any): ListingDraft {
    return {
      title: r.title ?? undefined,
      description: r.description ?? undefined,
      neighborhoodDescription: r.neighborhood_description ?? undefined,
      address: r.address ?? undefined,
      city: r.city ?? undefined,
      neighborhood: r.neighborhood ?? undefined,
      monthlyRent: r.monthly_rent ?? undefined,
      bedrooms: r.bedrooms ?? undefined,
      bathrooms: r.bathrooms ?? undefined,
      sqft: r.sqft ?? undefined,
      latitude: r.latitude ?? undefined,
      longitude: r.longitude ?? undefined,
      photos: r.photos ?? [],
      features: r.features ?? [],
      copyAttempted: r.copy_attempted || undefined,
      nearbyAttempted: r.nearby_attempted || undefined,
    };
  }

  private async loadDraftRow(userId: string): Promise<any | null> {
    const row = await this.prisma.agentListingDraft.findUnique({
      where: this.draftRowWhere(userId),
    });
    if (!row) return null;
    if (Date.now() - row.updated_at.getTime() > DRAFT_TTL_MS) {
      await this.prisma.agentListingDraft.deleteMany({ where: this.draftRowWhere(userId) });
      return null;
    }
    return row;
  }

  private async loadDraft(userId: string): Promise<ListingDraft> {
    const row = await this.loadDraftRow(userId);
    return row ? this.rowToDraft(row) : { photos: [], features: [] };
  }

  private async saveDraft(userId: string, draft: ListingDraft): Promise<void> {
    const data = {
      title: draft.title ?? null,
      description: draft.description ?? null,
      neighborhood_description: draft.neighborhoodDescription ?? null,
      address: draft.address ?? null,
      city: draft.city ?? null,
      neighborhood: draft.neighborhood ?? null,
      monthly_rent: draft.monthlyRent ?? null,
      bedrooms: draft.bedrooms ?? null,
      bathrooms: draft.bathrooms ?? null,
      sqft: draft.sqft ?? null,
      latitude: draft.latitude ?? null,
      longitude: draft.longitude ?? null,
      photos: draft.photos,
      features: draft.features,
      copy_attempted: !!draft.copyAttempted,
      nearby_attempted: !!draft.nearbyAttempted,
    };
    await this.prisma.agentListingDraft.upsert({
      where: this.draftRowWhere(userId),
      create: { user_id: userId, ...data },
      update: data,
    });
  }

  // Start fresh keeps the row but blanks every field so no old value can
  // come back; new owner input fills it from scratch.
  private async resetDraft(userId: string): Promise<void> {
    await this.prisma.agentListingDraft.upsert({
      where: { user_id: userId },
      create: { user_id: userId },
      update: {
        title: null,
        description: null,
        neighborhood_description: null,
        address: null,
        city: null,
        neighborhood: null,
        monthly_rent: null,
        bedrooms: null,
        bathrooms: null,
        sqft: null,
        latitude: null,
        longitude: null,
        photos: [],
        features: [],
        copy_attempted: false,
        nearby_attempted: false,
      },
    });
  }

  // True when the message clearly starts a brand-new creation flow — the
  // existing draft must then be discarded, never merged into.
  private isNewListingIntent(message: string): boolean {
    const m = message.toLowerCase();
    // A start-fresh phrase can never also be a new-listing intent.
    if (this.isStartFreshIntent(m)) return false;
    if (/\b(update|edit|change|remove|delete|move|reorder|replace)\b/.test(m)) return false;
    return (
      /\bnew\s+(listing|rental|property)\b/.test(m) ||
      /\b(create|add|start|make|post|list)\b[^.!?]{0,40}\b(listing|rental|property)\b/.test(m) ||
      /^\s*(create|add|start|make|post)\b/.test(m)
    );
  }

  // ponytail: add regex synonyms (begin from scratch, fresh start, clean slate) when users ask for them.
  private isStartFreshIntent(message: string): boolean {
    const m = message.toLowerCase();
    return /\b(start\s+fresh|from\s+scratch|clean\s+slate|fresh\s+start|begin\s+fresh|new\s+draft|wipe\s+it|start\s+over)\b/.test(m);
  }

  // Human-readable summary of what the draft already holds — injected into
  // model context so it never re-asks for collected details.
  // Human-readable summary of what the draft already holds — injected into
  // model context so it never re-asks for collected details.
  private async pinContextBlock(userId: string): Promise<string | null> {
    const [createPin, movePin] = await Promise.all([
      this.getPin(userId, 'create'),
      this.getPin(userId, 'move'),
    ]);
    const lines: string[] = [];
    if (movePin) {
      lines.push(
        'Move pin: available — when the owner asks to move a listing, call move_listing immediately. Never ask them to share a pin again.',
      );
    }
    if (createPin) {
      lines.push(
        'Creation pin: available — it will be used automatically for the listing being created. Never ask them to share a pin again.',
      );
    }
    return lines.length > 0
      ? ['[SHARED LOCATION PINS]', ...lines, 'A stored pin is consumed by its own flow only; never ask the owner to re-share one that is listed here.'].join('\n')
      : null;
  }

  private draftStateBlock(draft: ListingDraft): string {
    const yesNo = (v: string | number | undefined | null, label: string) =>
      v === undefined || v === null ? `${label}: not provided yet` : `${label}: ${v}`;
    const hasPin = draft.latitude !== undefined && draft.longitude !== undefined;
    const lines = [
      '[LISTING CREATION IN PROGRESS]',
      `Photos collected: ${draft.photos.length}`,
      hasPin
        ? `Location: yes${draft.address || draft.city ? ` — ${[draft.address, draft.city].filter(Boolean).join(', ')}` : ''}`
        : 'Location: not provided yet',
      yesNo(draft.monthlyRent ? `$${draft.monthlyRent}/mo` : undefined, 'Rent'),
      yesNo(draft.bedrooms, 'Bedrooms'),
      yesNo(draft.bathrooms, 'Bathrooms'),
      yesNo(draft.sqft, 'Sqft'),
      yesNo(draft.title, 'Title'),
      yesNo(draft.description ? 'provided' : undefined, 'Description'),
      yesNo(draft.neighborhoodDescription ? 'provided' : undefined, 'Neighborhood description'),
      ...(hasPin ? ['Location pin already received — do not ask for it again.'] : []),
      'Collect ONLY what is missing. Never ask for anything already listed above.',
    ];
    return lines.join('\n');
  }

  async proposeListingCreate(
    userId: string,
    args: Record<string, unknown>,
    chatPhotos: string[],
  ): Promise<{ result: any; proposal?: ListingProposal | null }> {
    const draft = await this.loadDraft(userId);

    for (const k of [
      'title', 'description', 'neighborhoodDescription', 'address', 'city', 'neighborhood',
    ] as const) {
      const v = args[k];
      if (typeof v === 'string' && v.trim()) {
        (draft as any)[k] = v.trim().slice(0, k === 'title' ? 120 : 2000);
      }
    }
    for (const k of ['monthlyRent', 'bedrooms', 'bathrooms', 'sqft'] as const) {
      const v = Number(args[k]);
      if (Number.isFinite(v) && v >= 0) (draft as any)[k] = Math.trunc(v);
    }
    const incoming = [
      ...(Array.isArray(args.photos) ? args.photos : []).map(String),
      ...chatPhotos,
    ].filter((u) => u.startsWith('http'));
    if (incoming.length > 0) draft.copyAttempted = false;
    draft.photos = [...new Set([...draft.photos, ...incoming])].slice(-MAX_PHOTOS);

    // Create flow consumes ONLY the create-slot pin (Fix 2).
    const pin = await this.getPin(userId, 'create');
    if (pin && (draft.latitude !== pin.latitude || draft.longitude !== pin.longitude)) {
      draft.latitude = pin.latitude;
      draft.longitude = pin.longitude;
      draft.nearbyAttempted = false;
    }

    const missing: string[] = [];
    if (draft.photos.length === 0) missing.push('at least one photo');
    if (draft.latitude === undefined || draft.longitude === undefined)
      missing.push('a location pin');
    if (!draft.monthlyRent || draft.monthlyRent <= 0) missing.push('the monthly rent');
    if (draft.bedrooms === undefined) missing.push('the number of bedrooms');
    if (draft.bathrooms === undefined) missing.push('the number of bathrooms');

    if (missing.length > 0) {
      await this.saveDraft(userId, draft);
      return {
        result: {
          ok: false,
          missing,
          message: `Still needed for the new listing: ${missing.join(', ')}. Ask the owner for ONLY these, conversationally.`,
        },
        proposal: null,
      };
    }

    if (
      (!draft.title || !draft.description || draft.features.length === 0) &&
      !draft.copyAttempted
    ) {
      draft.copyAttempted = true;
      const copy = await this.generateListingCopy(draft);
      draft.title = draft.title ?? copy?.title;
      draft.description = draft.description ?? copy?.description;
      if (copy?.features?.length) draft.features = copy.features;
      if (!draft.title || !draft.description) {
        await this.saveDraft(userId, draft);
        return {
          result: {
            error:
              'Could not generate the title/description from the photos. Ask the owner to try again or to provide them.',
          },
        };
      }
    }

    if (!draft.address || !draft.city || !draft.neighborhoodDescription) {
      const geo = await this.reverseGeocode(draft.latitude!, draft.longitude!).catch(() => null);
      if (geo) {
        draft.address = draft.address ?? geo.address;
        draft.city = draft.city ?? geo.city;
        draft.neighborhood = draft.neighborhood ?? geo.neighborhood;
      }
    }
    if (!draft.neighborhoodDescription && !draft.nearbyAttempted) {
      draft.nearbyAttempted = true;
      const places = await this.fetchNearbyPlaces(draft.latitude!, draft.longitude!).catch(() => []);
      draft.neighborhoodDescription =
        (await this.describeNeighborhood(places)) ?? undefined;
    }
    if (!draft.neighborhoodDescription) {
      draft.neighborhoodDescription =
        (await this.describeNeighborhoodFromAddress(draft.address, draft.city)) ?? undefined;
    }

    await this.saveDraft(userId, draft);
    if (!draft.address || !draft.city) {
      return {
        result: {
          ok: false,
          missing: [!draft.address ? 'the street address' : 'the city'],
          message:
            'The location could not be turned into an address automatically. Ask the owner for ONLY that.',
        },
        proposal: null,
      };
    }

    // Only the newest create-preview stays live — dead older cards so a stale
    // approve can never recreate an old listing.
    await this.supersedeCreateProposals(userId);
    // A create-preview was produced: the fresh-start reset note has done its job.
    await this.clearStartedFresh(userId);

    const proposal: ListingProposal = {
      type: 'create',
      propertyId: 'new',
      propertyTitle: draft.title,
      title: draft.title,
      description: draft.description,
      neighborhoodDescription: draft.neighborhoodDescription ?? null,
      address: draft.address,
      city: draft.city,
      neighborhood: draft.neighborhood ?? null,
      monthlyRent: draft.monthlyRent,
      bedrooms: draft.bedrooms,
      bathrooms: draft.bathrooms,
      sqft: draft.sqft ?? null,
      latitude: draft.latitude ?? null,
      longitude: draft.longitude ?? null,
      photos: [...draft.photos],
      features: [...draft.features],
    };

    return {
      result: {
        ok: true,
        message:
          'A new-listing preview card is now shown with all details, photos and generated descriptions. Do NOT repeat its contents — tell the owner to review it, press approve there to create the listing, or tell you any changes.',
      },
      proposal,
    };
  }

  // Kills older unapproved create-preview cards so only the newest stays live.
  private async supersedeCreateProposals(userId: string) {
    const olds = await this.prisma.agentMessage.findMany({
      where: {
        user_id: userId,
        role: 'assistant',
        content: { startsWith: 'LISTING_CREATE ' },
      },
      select: { id: true },
    });
    if (olds.length > 0) {
      await this.prisma.agentMessage.updateMany({
        where: { id: { in: olds.map((o) => o.id) } },
        data: { content: 'LISTING_CREATE_REPLACED' },
      });
    }
  }

  async confirmListingCreate(userId: string, dto: ConfirmListingCreateDto) {
    await this.assertActive(userId);
    const property = await this.propertiesService.create(userId, {
      title: dto.title,
      description: dto.description,
      ...(dto.neighborhoodDescription !== undefined && {
        neighborhood_description: dto.neighborhoodDescription,
      }),
      address: dto.address,
      city: dto.city,
      ...(dto.neighborhood !== undefined && { neighborhood: dto.neighborhood }),
      monthly_rent: dto.monthlyRent,
      bedrooms: dto.bedrooms,
      bathrooms: dto.bathrooms,
      ...(dto.sqft !== undefined && { sqft: dto.sqft }),
      latitude: dto.latitude,
      longitude: dto.longitude,
      photos: dto.photos,
      ...(dto.features !== undefined && { features: dto.features }),
    });
    await this.sealProposal(
      userId,
      'LISTING_CREATE ',
      `LISTING_CREATED ${JSON.stringify({
        id: property.id,
        title: property.title,
        city: property.city,
      })}`,
    );
    // Creation complete: drop the draft and consume the create-slot pin so a
    // stale pin can never leak into a future listing.
    await this.prisma.$transaction([
      this.prisma.agentListingDraft.deleteMany({ where: { user_id: userId } }),
      this.prisma.agentSharedLocation.deleteMany({ where: { user_id: userId, slot: 'create' } }),
    ]);
    return property;
  }

  private async generateListingCopy(
    draft: ListingDraft,
  ): Promise<{ title: string; description: string; features: string[] } | null> {
    const allowed = new Set<string>(LISTING_FEATURES.map((f) => f.toLowerCase()));
    const parseCopy = (raw: unknown) => {
      try {
        const parsed = JSON.parse(String(raw ?? '').replace(/^```json\s*|```\s*$/g, ''));
        if (parsed?.title && parsed?.description) {
          return {
            title: String(parsed.title).slice(0, 120),
            description: String(parsed.description).slice(0, 2000),
            features: (Array.isArray(parsed.features) ? parsed.features : [])
              .map((f: unknown) => String(f).trim())
              .filter((f: string) => allowed.has(f.toLowerCase())),
          };
        }
      } catch {
        // not JSON
      }
      return null;
    };
    try {
      const details = [
        draft.monthlyRent ? `Rent: $${draft.monthlyRent}/mo` : '',
        draft.bedrooms !== undefined ? `${draft.bedrooms} bedroom(s)` : '',
        draft.bathrooms !== undefined ? `${draft.bathrooms} bathroom(s)` : '',
      ]
        .filter(Boolean)
        .join(', ');
      const msg = await this.callOpenAI({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content:
              'You write rental listings for Rentia from property photos. Reply ONLY with compact JSON: {"title": string, "description": string, "features": string[]}. Title: max 80 chars, no quotes inside. It must reflect the actual property type visible in the photos (apartment, house, villa, studio, loft, townhouse…) plus a standout quality — never reuse formulaic templates like "Cozy N Bedroom Apartment"; every title must read unique and specific to what is shown. Description: 3-5 vivid but factual sentences describing what is visible — property type, rooms and layout, natural light, condition, style, and standout qualities; warm and concrete, no emojis, no lists. features: ONLY features clearly confirmed by the photos or the owner details, each chosen verbatim from this list — Parking, WiFi, Air Conditioning, Furnished, Pool, Gym, Garden, Security, Generator Backup, Balcony, Elevator, Pet Friendly, Laundry. Never include a feature that is not clearly visible or mentioned.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `These are photos of a rental property I want to list.${details ? ` Owner-provided details: ${details}.` : ''} Write the title, description, and confirmed features.`,
              },
              ...draft.photos.map((url) => ({ type: 'image_url', image_url: { url } })),
            ],
          },
        ],
        temperature: 0.5,
      });
      const copy = parseCopy(msg.content);
      if (copy) return copy;
      this.logger.warn('generateListingCopy: model returned no usable JSON');
    } catch (err: any) {
      this.logger.warn(`generateListingCopy failed: ${err?.message ?? err}`);
    }
    // ponytail: OpenAI frequently cannot download owner-hosted photo URLs
    // (invalid_image_url) — fall back to text-only copy so the approval card
    // still emits; upgrade to rehosted/compressed images later.
    try {
      const facts = [
        draft.monthlyRent ? `$${draft.monthlyRent}/mo` : '',
        draft.bedrooms !== undefined ? `${draft.bedrooms} bedroom(s)` : '',
        draft.bathrooms !== undefined ? `${draft.bathrooms} bathroom(s)` : '',
        draft.sqft ? `${draft.sqft} sqft` : '',
        [draft.address, draft.city].filter(Boolean).join(', '),
      ]
        .filter(Boolean)
        .join(', ');
      const msg = await this.callOpenAI({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content:
              'You write rental listings for Rentia. Reply ONLY with compact JSON: {"title": string, "description": string, "features": string[]}. Title: max 80 chars, no quotes inside, unique and specific — never formulaic templates like "Cozy N Bedroom Apartment". Description: 3-5 vivid but factual sentences; warm and concrete, no emojis, no lists. features: each chosen verbatim from this list — Parking, WiFi, Air Conditioning, Furnished, Pool, Gym, Garden, Security, Generator Backup, Balcony, Elevator, Pet Friendly, Laundry. Never include a feature that was not provided.',
          },
          {
            role: 'user',
            content: `Write the title, description and confirmed features for a rental property${facts ? ` with these details: ${facts}` : ''}.`,
          },
        ],
        temperature: 0.5,
      });
      return parseCopy(msg.content);
    } catch (err: any) {
      this.logger.warn(`generateListingCopy fallback failed: ${err?.message ?? err}`);
    }
    return null;
  }

  private async fetchNearbyPlaces(latitude: number, longitude: number): Promise<NearbyPlace[]> {
    const key = this.configService.get<string>('GOOGLE_PLACES_API_KEY', '');
    if (!key) {
      this.logger.warn('GOOGLE_PLACES_API_KEY not set — skipping nearby-places lookup');
      return [];
    }
    // Places API (New) — the legacy nearbysearch endpoint is not enabled on
    // the current Google project.
    const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'places.displayName,places.location',
      },
      body: JSON.stringify({
        includedTypes: [
          'school', 'park', 'supermarket', 'restaurant', 'transit_station',
          'hospital', 'shopping_mall', 'pharmacy',
        ],
        maxResultCount: 8,
        locationRestriction: {
          circle: { center: { latitude, longitude }, radius: 1500 },
        },
      }),
    });
    if (!res.ok) throw new Error(`Places HTTP ${res.status}`);
    const data: any = await res.json();
    return (data.places ?? [])
      .map((r: any) => ({
        name: String(r.displayName?.text ?? '').trim(),
        meters: haversineMeters(
          latitude,
          longitude,
          r.location?.latitude,
          r.location?.longitude,
        ),
      }))
      .filter((p: NearbyPlace) => p.name && Number.isFinite(p.meters));
  }

  private async reverseGeocode(
    latitude: number,
    longitude: number,
  ): Promise<{ address: string; city: string; neighborhood?: string }> {
    // Google Geocoding first (needs Billing enabled on the project); free
    // OSM Nominatim as fallback so a pin always resolves to an address.
    // ponytail: drop the fallback once Geocoding API billing is on.
    try {
      return await this.googleReverseGeocode(latitude, longitude);
    } catch (err: any) {
      this.logger.warn(`googleReverseGeocode failed, falling back to Nominatim: ${err?.message ?? err}`);
      return this.nominatimReverseGeocode(latitude, longitude);
    }
  }

  private async googleReverseGeocode(
    latitude: number,
    longitude: number,
  ): Promise<{ address: string; city: string; neighborhood?: string }> {
    const key = this.configService.get<string>('GOOGLE_PLACES_API_KEY', '');
    if (!key) throw new Error('GOOGLE_PLACES_API_KEY not set');
    const url =
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${key}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Geocode HTTP ${res.status}`);
    const data: any = await res.json();
    const first = (data.results ?? [])[0];
    if (data.status !== 'OK' || !first) throw new Error(`Geocode ${data.status}`);
    const get = (type: string) =>
      (first.address_components ?? []).find((c: any) => c.types.includes(type))?.long_name;
    const address =
      [get('street_number'), get('route')].filter(Boolean).join(' ') ||
      first.formatted_address ||
      '';
    const city =
      get('locality') ?? get('postal_town') ?? get('administrative_area_level_2') ?? '';
    return { address, city, neighborhood: get('sublocality_level_1') ?? get('neighborhood') };
  }

  private async nominatimReverseGeocode(
    latitude: number,
    longitude: number,
  ): Promise<{ address: string; city: string; neighborhood?: string }> {
    const url =
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}` +
      `&format=jsonv2&zoom=18&addressdetails=1`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Rentia/1.0 (rental-saas-dev)' } });
    if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
    const data: any = await res.json();
    const a = data.address ?? {};
    const address =
      [a.house_number, a.road].filter(Boolean).join(' ') || data.name || '';
    const city = a.city ?? a.town ?? a.village ?? a.municipality ?? '';
    if (!address || !city) throw new Error('Nominatim incomplete result');
    return {
      address,
      city,
      neighborhood: a.neighbourhood ?? a.suburb ?? a.quarter,
    };
  }

  private async describeNeighborhood(places: NearbyPlace[]): Promise<string | null> {
    if (places.length === 0) return null;
    // Single source of truth for times: travelLabel formats every item, the
    // model only curates which of the pre-formatted items make the cut.
    const items = places
      .slice(0, 8)
      .map((p) => `${p.name} — ${travelLabel(p.meters)}`);
    const fallback = items.slice(0, 6).join(', ');
    try {
      const msg = await this.callOpenAI({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content:
              'You assemble neighbourhood lists for rental listings. From the given items, each formatted "Place — N min walk/drive", reply ONLY with a comma-separated list of the 4-6 most useful everyday places, copying each chosen item EXACTLY as written (never change a name or time). No intro, no outro, no emojis.',
          },
          { role: 'user', content: `Nearby items: ${items.join(', ')}` },
        ],
        temperature: 0.3,
      });
      const text = String(msg.content ?? '')
        .trim()
        .replace(/^["']|["']$/g, '')
        .slice(0, 2000);
      return text || fallback;
    } catch (err: any) {
      this.logger.warn(`describeNeighborhood failed: ${err?.message ?? err}`);
      return fallback;
    }
  }

  // Fallback when the Places lookup is unavailable (no key, no results) —
  // builds the list from model knowledge of the area.
  // ponytail: set GOOGLE_PLACES_API_KEY to get real nearby places instead.
  private async describeNeighborhoodFromAddress(
    address: string,
    city: string,
  ): Promise<string | null> {
    const where = [address, city].filter(Boolean).join(', ');
    if (!where) return null;
    try {
      const msg = await this.callOpenAI({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content:
              'You assemble neighbourhood lists for rental listings. Given a property location, reply ONLY with a comma-separated list of 4-6 real everyday places near it (markets, schools, parks, transit stops, hospitals), each formatted "Place — N min walk/drive" with realistic travel times. No intro, no outro, no emojis.',
          },
          { role: 'user', content: `Property location: ${where}` },
        ],
        temperature: 0.4,
      });
      return String(msg.content ?? '').trim().replace(/^["']|["']$/g, '').slice(0, 2000) || null;
    } catch (err: any) {
      this.logger.warn(`describeNeighborhoodFromAddress failed: ${err?.message ?? err}`);
      return null;
    }
  }

  async proposeMoveListing(
    userId: string,
    args: Record<string, unknown>,
  ): Promise<{ result: any; proposal?: ListingProposal | null }> {
    const resolved = await this.resolveListingRef(userId, this.pickListingRef(args));
    if ('error' in resolved) return resolved.error;
    const property = resolved.property;

    // Move flow reads ONLY the move slot — the create slot, even when a
    // listing creation is in progress, is completely invisible here and can
    // never be read or deleted by this flow (Fix 2 hard isolation).
    const pin = await this.getPin(userId, 'move');
    if (!pin) {
      return {
        result: {
          error:
            'No shared location pin found for moving a listing. Ask the owner to share a pin (location button) and then ask to move the listing again. Do not touch any pin stored for an in-progress listing creation.',
        },
        proposal: null,
      };
    }
    if (!Number.isFinite(pin.latitude) || !Number.isFinite(pin.longitude)) {
      return { result: { error: 'The shared location pin is invalid. Please share it again.' } };
    }

    if (
      property.latitude === pin.latitude &&
      property.longitude === pin.longitude
    ) {
      return {
        result: {
          error: `"${property.title}" already has that location pin.`,
        },
      };
    }

    const proposal: ListingProposal = {
      type: 'edit',
      propertyId: property.id,
      propertyTitle: property.title,
      current: {
        ...property,
        monthlyRent: property.monthly_rent,
      },
      changes: { latitude: pin.latitude, longitude: pin.longitude },
    };

    // The move-slot pin is consumed once a move proposal is generated so a
    // stale pin cannot silently move another listing later without the owner
    // re-sharing. The create-slot pin is untouched.
    await this.prisma.agentSharedLocation.deleteMany({
      where: { user_id: userId, slot: 'move' },
    });

    return {
      result: {
        ok: true,
        message: `Location proposal for "${property.title}" prepared: move its pin to the location the owner shared. The owner must approve it in the review card — do not apply it yourself.`,
      },
      proposal,
    };
  }

  async proposeListingEdit(
    userId: string,
    args: Record<string, unknown>,
  ): Promise<{ result: any; proposal?: ListingProposal | null }> {
    const resolved = await this.resolveListingRef(userId, this.pickListingRef(args));
    if ('error' in resolved) return resolved.error;
    const property = resolved.property;

    const changes: Record<string, string | number | null> = {};
    if (args.title !== undefined) {
      const t = String(args.title).trim().slice(0, 120);
      if (!t) {
        return { result: { error: 'Title cannot be empty.' } };
      }
      changes.title = t;
    }
    if (args.description !== undefined) {
      changes.description = String(args.description).trim().slice(0, 2000);
    }
    if (args.neighborhoodDescription !== undefined) {
      if (args.neighborhoodDescription === null || args.neighborhoodDescription === '') {
        changes.neighborhoodDescription = null;
      } else {
        changes.neighborhoodDescription = String(args.neighborhoodDescription).trim().slice(0, 2000);
      }
    }
    if (args.address !== undefined) {
      const a = String(args.address).trim().slice(0, 200);
      if (!a) {
        return { result: { error: 'Address cannot be empty.' } };
      }
      changes.address = a;
    }
    if (args.city !== undefined) {
      const c = String(args.city).trim().slice(0, 80);
      if (!c) {
        return { result: { error: 'City cannot be empty.' } };
      }
      changes.city = c;
    }
    if (args.neighborhood !== undefined) {
      if (args.neighborhood === null || args.neighborhood === '') {
        changes.neighborhood = null;
      } else {
        changes.neighborhood = String(args.neighborhood).trim().slice(0, 80);
      }
    }
    if (args.monthlyRent !== undefined) {
      const v = Number(args.monthlyRent);
      if (!Number.isInteger(v) || v < 0 || v > 100000) {
        return {
          result: { error: `Invalid monthlyRent: ${args.monthlyRent}. Use a whole dollar amount between 0 and 100000.` },
        };
      }
      changes.monthlyRent = v;
    }
    if (args.bedrooms !== undefined) {
      const v = Number(args.bedrooms);
      if (!Number.isInteger(v) || v < 0 || v > 20) {
        return { result: { error: `Invalid bedrooms: ${args.bedrooms}. Must be 0-20.` } };
      }
      changes.bedrooms = v;
    }
    if (args.bathrooms !== undefined) {
      const v = Number(args.bathrooms);
      if (!Number.isInteger(v) || v < 0 || v > 20) {
        return { result: { error: `Invalid bathrooms: ${args.bathrooms}. Must be 0-20.` } };
      }
      changes.bathrooms = v;
    }
    if (args.sqft !== undefined) {
      const v = Number(args.sqft);
      if (!Number.isInteger(v) || v < 0) {
        return { result: { error: `Invalid sqft: ${args.sqft}. Must be a non-negative integer.` } };
      }
      changes.sqft = v;
    }
    const hasLat = args.latitude !== undefined && args.latitude !== null;
    const hasLng = args.longitude !== undefined && args.longitude !== null;
    if (hasLat || hasLng) {
      if (!hasLat || !hasLng) {
        return {
          result: {
            error: 'Provide both latitude and longitude when moving a listing\'s location pin.',
          },
        };
      }
      const lat = Number(args.latitude);
      const lng = Number(args.longitude);
      if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
        return {
          result: { error: `Invalid latitude: ${args.latitude}. Must be between -90 and 90.` },
        };
      }
      if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
        return {
          result: { error: `Invalid longitude: ${args.longitude}. Must be between -180 and 180.` },
        };
      }
      changes.latitude = lat;
      changes.longitude = lng;
    }

    if (Object.keys(changes).length === 0) {
      return {
        result: {
          error: 'No changes specified. Tell the owner which field to update (title, description, address, city, neighborhood, neighborhoodDescription, monthlyRent, bedrooms, bathrooms, sqft, latitude, longitude).',
        },
      };
    }

    const proposal: ListingProposal = {
      type: 'edit',
      propertyId: property.id,
      propertyTitle: property.title,
      current: {
        title: property.title,
         description: property.description,
         neighborhoodDescription: property.neighborhood_description,
         address: property.address,
        city: property.city,
        neighborhood: property.neighborhood,
        monthlyRent: property.monthly_rent,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        sqft: property.sqft,
        latitude: property.latitude,
        longitude: property.longitude,
      },
      changes,
    };

    return {
      result: {
        ok: true,
        message: `Edit proposal for "${property.title}" prepared (${Object.keys(changes).length} field(s)). The owner must approve it in the review card — do not apply it yourself.`,
      },
      proposal,
    };
  }

  async proposeStatusChange(
    userId: string,
    args: Record<string, unknown>,
  ): Promise<{
    result: any;
    proposal?: ListingProposal | null;
    proposals?: ListingProposal[];
  }> {
    const target = String(args.status ?? '');
    if (target !== 'active' && target !== 'inactive') {
      return { result: { error: 'Invalid status. Use "active" or "inactive".' } };
    }

    const refs: unknown[] =
      Array.isArray(args.propertyIds) && args.propertyIds.length > 0
        ? args.propertyIds
        : [this.pickListingRef(args)];

    const resolved: any[] = [];
    for (const ref of refs) {
      const res = await this.resolveListingRef(userId, ref);
      if ('error' in res) {
        resolved.push({ error: res.error.result.error });
      } else {
        resolved.push({ property: res.property });
      }
    }

    const unique = new Map<string, any>();
    for (const r of resolved) {
      if (r.property && !unique.has(r.property.id)) unique.set(r.property.id, r.property);
    }

    const stickyNote: string[] = [];
    if (target === 'active') {
      const owner = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { stripe_connect_id: true },
      });
      if (!owner?.stripe_connect_id) {
        return {
          result: {
            error: 'The owner must connect Stripe payouts before a listing can be activated.',
          },
        };
      }
    }

    const proposals: ListingProposal[] = [];
    for (const property of unique.values()) {
      if (property.status === target) {
        stickyNote.push(`"${property.title}" is already ${target}.`);
        continue;
      }
      proposals.push({
        type: 'status',
        propertyId: property.id,
        propertyTitle: property.title,
        status: target as 'active' | 'inactive',
      });
    }

    if (proposals.length === 0) {
      return {
        result: {
          error:
            stickyNote.length > 0 ? stickyNote.join(' ') : 'No matching listings found.',
        },
      };
    }

    const names = proposals.map((p) => p.propertyTitle).join(', ');
    return {
      result: {
        ok: true,
        message:
          `Status proposal${proposals.length > 1 ? 's' : ''} for ${proposals.length} listing(s) prepared: ${names} → ${target}. ` +
          'The owner must approve them in the review card — do not apply them yourself.' +
          (stickyNote.length > 0 ? ` ${stickyNote.join(' ')}` : ''),
      },
      proposal: proposals.length === 1 ? proposals[0] : null,
      proposals,
    };
  }

  async proposeImagesChange(
    userId: string,
    args: Record<string, unknown>,
  ): Promise<{ result: any; proposal?: ListingProposal | null }> {
    const resolved = await this.resolveListingRef(userId, this.pickListingRef(args));
    if ('error' in resolved) return resolved.error;
    const property = resolved.property;

    const add: string[] = Array.isArray(args.add)
      ? args.add.map((u) => String(u)).filter((u) => u.startsWith('http'))
      : [];
    const removeIndices: number[] = Array.isArray(args.removeIndices)
      ? args.removeIndices.map(Number).filter((n) => Number.isInteger(n))
      : [];
    const removed = [...new Set(removeIndices)];
    const newOrder: number[] =
      Array.isArray(args.newOrder) && args.newOrder.length > 0
        ? args.newOrder.map(Number)
        : [];
    const current = property.photos;

    if (add.length === 0 && removed.length === 0 && newOrder.length === 0) {
      return {
        result: {
          error: 'Nothing to change. Pass photo URLs to add, 1-based positions to remove, and/or newOrder to resequence.',
        },
      };
    }

    const outOfRange = removed.filter((i) => i < 1 || i > current.length);
    if (outOfRange.length > 0) {
      return {
        result: {
          error: `Invalid photo position(s): ${outOfRange.join(', ')}. This listing has ${current.length} photo(s) — positions are 1-based.`,
        },
      };
    }

    const result = [...current];
    for (const i of [...removed].sort((a, b) => b - a)) {
      result.splice(i - 1, 1);
    }
    for (const url of add) {
      if (!result.includes(url)) result.push(url);
    }
    if (newOrder.length > 0) {
      const valid =
        newOrder.length === result.length &&
        [...newOrder]
          .sort((a, b) => a - b)
          .every((n, i) => n === i + 1 && Number.isInteger(n));
      if (!valid) {
        return {
          result: {
            error: `Invalid newOrder: [${newOrder.join(', ')}]. It must be a permutation of every position from 1 to ${result.length} (1-based, applied to the photo list after removals/additions). Map the owner's swaps onto the current positions and try again.`,
          },
        };
      }
      const reordered = newOrder.map((pos) => result[pos - 1]);
      result.length = 0;
      result.push(...reordered);
    }
    if (result.length > MAX_PHOTOS) {
      return {
        result: {
          error: `That would leave ${result.length} photos, but a listing can hold at most ${MAX_PHOTOS}. Remove some photos first.`,
        },
      };
    }
    if (result.length === 0) {
      return {
        result: {
          error: 'A listing must keep at least 1 photo — removing the last photo is not allowed.',
        },
      };
    }

    const proposal: ListingProposal = {
      type: 'images',
      propertyId: property.id,
      propertyTitle: property.title,
      add,
      removeIndices: removed,
      currentPhotos: current,
      resultPhotos: result,
    };

    return {
      result: {
        ok: true,
        message: `Image proposal for "${property.title}" prepared: ${add.length} added, ${removed.length} removed${
          newOrder.length > 0 ? `, resequenced to [${newOrder.join(', ')}]` : ''
        }, final count ${result.length}. The owner must approve it in the review card — do not apply it yourself.`,
      },
      proposal,
    };
  }

  async confirmListingEdit(userId: string, dto: ConfirmListingEditDto) {
    await this.assertActive(userId);
    const changes = {
      ...(dto.changes.title !== undefined && { title: dto.changes.title }),
      ...(dto.changes.description !== undefined && { description: dto.changes.description }),
      ...(dto.changes.neighborhoodDescription !== undefined && { neighborhood_description: dto.changes.neighborhoodDescription }),
      ...(dto.changes.address !== undefined && { address: dto.changes.address }),
      ...(dto.changes.city !== undefined && { city: dto.changes.city }),
      ...(dto.changes.neighborhood !== undefined && { neighborhood: dto.changes.neighborhood }),
      ...(dto.changes.monthlyRent !== undefined && { monthly_rent: dto.changes.monthlyRent }),
      ...(dto.changes.bedrooms !== undefined && { bedrooms: dto.changes.bedrooms }),
      ...(dto.changes.bathrooms !== undefined && { bathrooms: dto.changes.bathrooms }),
      ...(dto.changes.sqft !== undefined && { sqft: dto.changes.sqft }),
      ...(dto.changes.latitude !== undefined && { latitude: dto.changes.latitude }),
      ...(dto.changes.longitude !== undefined && { longitude: dto.changes.longitude }),
    };
    const property = await this.propertiesService.update(userId, dto.propertyId, changes);
    await this.sealProposal(
      userId,
      'LISTING_EDIT ',
      `LISTING_EDITED ${JSON.stringify({
        id: property.id,
        title: property.title,
        city: property.city,
        changes: dto.changes,
      })}`,
      property.id,
    );
    return property;
  }

  async confirmStatusChange(userId: string, dto: ConfirmStatusChangeDto) {
    await this.assertActive(userId);
    const property = await this.propertiesService.setStatus(
      userId,
      dto.propertyId,
      dto.status as any,
    );
    await this.sealProposal(
      userId,
      'LISTING_STATUS ',
      `LISTING_STATUS_CHANGED ${JSON.stringify({
        id: property.id,
        title: property.title,
        status: property.status,
      })}`,
      property.id,
    );
    return property;
  }

  async confirmImagesChange(userId: string, dto: ConfirmImagesChangeDto) {
    await this.assertActive(userId);
    const property = await this.propertiesService.update(userId, dto.propertyId, {
      photos: dto.photos,
    });
    await this.sealProposal(
      userId,
      'LISTING_IMAGES ',
      `LISTING_IMAGES_CHANGED ${JSON.stringify({
        id: property.id,
        title: property.title,
        photos: property.photos,
        photoCount: property.photos.length,
      })}`,
      property.id,
    );
    return property;
  }

  async cancelProposal(userId: string) {
    await this.assertActive(userId);
    const marker = Object.values(PROPOSAL_MARKERS).map((m) => `${m} `);
    const found = await this.prisma.agentMessage.findFirst({
      where: {
        user_id: userId,
        role: 'assistant',
        OR: marker.map((m) => ({ content: { startsWith: m } })),
      },
      orderBy: { created_at: 'desc' },
      select: { id: true },
    });
    if (found) {
      await this.prisma.agentMessage.update({
        where: { id: found.id },
        data: { content: 'The proposed change was cancelled — nothing was applied.' },
      });
    }

    // A rejection ends the whole attempt (Fixes 1 & 5): wipe the creation
    // draft, its pin slot, and the active-listing context so nothing from the
    // rejected proposal leaks into later turns. Also delete every create-card
    // (live or superseded) so its JSON can never re-enter model context.
    await this.prisma.$transaction([
      this.prisma.agentMessage.deleteMany({
        where: { user_id: userId, content: { contains: 'LISTING_CREATE' } },
      }),
      this.prisma.agentListingDraft.deleteMany({ where: { user_id: userId } }),
      this.prisma.agentSharedLocation.deleteMany({ where: { user_id: userId, slot: 'create' } }),
      this.prisma.agentConversationContext.deleteMany({ where: { user_id: userId } }),
    ]);

    // Neutralize attached-photo URL lists in history so rejected-session
    // images stop feeding the model. ponytail: resetConversation's storage
    // cleanup no longer sees these URLs — orphaned storage objects only.
    const photoMsgs = await this.prisma.agentMessage.findMany({
      where: {
        user_id: userId,
        role: 'user',
        content: { contains: '[Attached photos:' },
      },
      select: { id: true, content: true },
    });
    for (const m of photoMsgs) {
      await this.prisma.agentMessage.update({
        where: { id: m.id },
        data: { content: m.content.replace(/\[Attached photos:[^\]]*\]/g, '[attached photos removed]') },
      });
    }

    return { cancelled: true };
  }

  async resetConversation(userId: string) {
    await this.assertActive(userId);

    // Collect the owner's uploaded chat photos so their storage objects are
    // removed too — only URLs the owner attached (not listing photos).
    const messages = await this.prisma.agentMessage.findMany({
      where: { user_id: userId },
      select: { role: true, content: true },
    });
    const urls = new Set<string>();
    for (const m of messages) {
      if (m.role !== 'user') continue;
      const match = m.content.match(/\[Attached photos: ([^\]]+)\]/);
      if (match) {
        for (const u of match[1].split(',').map((s) => s.trim())) {
          if (u) urls.add(u);
        }
      }
    }
    // Chat-created listings keep their live photos inside [Attached photos:]
    // markers, so exclude any URL a listing still references before deleting.
    const ownedPhotos = await this.prisma.property.findMany({
      where: { owner_id: userId },
      select: { photos: true },
    });
    for (const p of ownedPhotos) {
      for (const u of p.photos) urls.delete(u);
    }
    if (urls.size > 0) {
      await this.propertiesService.removeImages(userId, [...urls]);
    }

    await this.prisma.$transaction([
      this.prisma.agentMessage.deleteMany({ where: { user_id: userId } }),
      this.prisma.agentConversationContext.deleteMany({ where: { user_id: userId } }),
      this.prisma.agentSharedLocation.deleteMany({ where: { user_id: userId } }),
      this.prisma.agentListingDraft.deleteMany({ where: { user_id: userId } }),
    ]);
    return { ok: true };
  }

  // Replaces the most recent matching proposal marker with its applied
  // confirmation so a confirmed proposal does not re-render as a live card.
  private async sealProposal(
    userId: string,
    markerPrefix: string,
    content: string,
    propertyId?: string,
  ) {
    const latest = await this.prisma.agentMessage.findFirst({
      where: {
        user_id: userId,
        role: 'assistant',
        content: {
          startsWith: markerPrefix,
          ...(propertyId ? { contains: propertyId } : {}),
        },
      },
      orderBy: { created_at: 'desc' },
      select: { id: true },
    });
    if (latest) {
      await this.prisma.agentMessage.update({
        where: { id: latest.id },
        data: { content },
      });
    } else {
      await this.prisma.agentMessage.create({
        data: { user_id: userId, role: 'assistant', content },
      });
    }
  }

  private async getFinancials(userId: string) {
    const where = { lease: { property: { owner_id: userId } } } as any;
    const [pendingAgg, approvedAgg, held, user] = await Promise.all([
      this.prisma.payment.aggregate({
        where: { ...where, status: 'held' },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: { ...where, status: 'released' },
        _sum: { amount: true },
      }),
      this.prisma.payment.findMany({
        where: { ...where, status: 'held' },
        select: { amount: true, hold_release_at: true, period_start: true },
        orderBy: { hold_release_at: 'asc' },
        take: 20,
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { stripe_connect_id: true },
      }),
    ]);

    return {
      connected: !!user?.stripe_connect_id,
      pendingBalance: pendingAgg._sum.amount ?? 0,
      approvedBalance: approvedAgg._sum.amount ?? 0,
      heldPayments: held.map((p) => ({
        amount: p.amount,
        heldSince: p.period_start.toISOString().slice(0, 10),
        releasesOn: p.hold_release_at.toISOString().slice(0, 10),
      })),
    };
  }

  private async getLeases(userId: string) {
    const leases = await this.prisma.lease.findMany({
      where: { property: { owner_id: userId } },
      include: {
        property: { select: { id: true, title: true } },
        user: { select: { name: true, email: true } },
      },
      orderBy: { created_at: 'desc' },
      take: 50,
    });

    return leases.map((l) => ({
      id: l.id,
      property: l.property.title,
      tenant: l.user.name ?? l.user.email.split('@')[0],
      startDate: l.start_date.toISOString().slice(0, 10),
      endDate: l.end_date.toISOString().slice(0, 10),
      months: l.months,
      monthlyRent: l.monthly_rent,
      status: l.status,
      failedPaymentAttempts: l.failed_payment_attempts,
    }));
  }

  private async getProperties(userId: string) {
    const props = await this.prisma.property.findMany({
      where: { owner_id: userId },
      include: { owner: { select: { stripe_connect_id: true } } },
      orderBy: { created_at: 'desc' },
      take: 50,
    });

    return props.map((p, i) => ({
      id: p.id,
      listNumber: i + 1,
      title: p.title,
      city: p.city,
      neighborhood: p.neighborhood,
      description: p.description,
      neighborhoodDescription: p.neighborhood_description,
      monthlyRent: p.monthly_rent,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      sqft: p.sqft,
      status: p.status,
      photos: p.photos,
      latitude: p.latitude,
      longitude: p.longitude,
      bookable: !!p.owner?.stripe_connect_id,
      views: p.view_count,
      clicks: p.click_count,
    }));
  }

  private async getDisputes(userId: string) {
    const disputes = await this.prisma.dispute.findMany({
      where: { payment: { lease: { property: { owner_id: userId } } } },
      include: {
        payment: {
          select: {
            amount: true,
            status: true,
            lease: { select: { property: { select: { title: true } } } },
          },
        },
      },
      orderBy: { created_at: 'desc' },
      take: 20,
    });

    return disputes.map((d) => ({
      id: d.id,
      reason: d.reason,
      status: d.status,
      amount: d.payment.amount,
      property: d.payment.lease.property.title,
    }));
  }

  private async getStats(userId: string) {
    return this.propertiesService.getOwnerStats(userId);
  }

  // ── OpenAI ──────────────────────────────────────────────────

  private async callOpenAI(body: Record<string, unknown>): Promise<any> {
    if (!this.openaiKey) {
      throw new ServiceUnavailableException(
        'The AI assistant is not configured. Add OPENAI_API_KEY to the backend environment.',
      );
    }

    let res: Response;
    try {
      res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.openaiKey}`,
        },
        body: JSON.stringify(body),
      });
    } catch (err: any) {
      this.logger.error(`OpenAI request failed: ${err?.message ?? err}`);
      throw new ServiceUnavailableException(
        'The AI assistant is temporarily unavailable. Please try again in a moment.',
      );
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      this.logger.error(`OpenAI error ${res.status}: ${text.slice(0, 300)}`);
      throw new ServiceUnavailableException(
        'The AI assistant is temporarily unavailable. Please try again in a moment.',
      );
    }

    const data = await res.json();
    return data.choices?.[0]?.message;
  }
}
