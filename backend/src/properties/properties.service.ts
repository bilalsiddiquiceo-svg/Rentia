import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';
import { PropertyStatus, LeaseStatus, Prisma } from '@prisma/client';
import {
  CreatePropertyDto,
  UpdatePropertyDto,
  PropertyQueryDto,
  PresignUploadDto,
} from './dto/property.dto';
import { randomUUID } from 'crypto';
import * as path from 'path';

const MAX_PHOTOS = 5;
const HORIZON_DAYS = 365;
const DEFAULT_BUCKET = 'property-photos';

@Injectable()
export class PropertiesService {
  private readonly logger = new Logger(PropertiesService.name);
  private readonly bucket: string;
  private bucketReady = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseService,
    private readonly configService: ConfigService,
  ) {
    this.bucket = this.configService.get('SUPABASE_PHOTOS_BUCKET', DEFAULT_BUCKET);
  }

  // ── Create ──────────────────────────────────────────────────

  async create(ownerId: string, dto: CreatePropertyDto) {
    if (dto.photos && dto.photos.length > MAX_PHOTOS) {
      throw new BadRequestException(`A property can have at most ${MAX_PHOTOS} photos`);
    }

    const owner = await this.prisma.user.findUnique({
      where: { id: ownerId },
      select: { stripe_connect_id: true },
    });

    const status = owner?.stripe_connect_id
      ? PropertyStatus.active
      : PropertyStatus.inactive;

    const property = await this.prisma.property.create({
      data: {
        owner_id: ownerId,
        title: dto.title,
        description: dto.description,
        neighborhood_description: dto.neighborhood_description,
        address: dto.address,
        city: dto.city,
        neighborhood: dto.neighborhood,
        latitude: dto.latitude,
        longitude: dto.longitude,
        monthly_rent: dto.monthly_rent,
        bedrooms: dto.bedrooms,
        bathrooms: dto.bathrooms,
        sqft: dto.sqft,
        photos: dto.photos ?? [],
        features: dto.features ?? [],
        status,
      },
      include: this.ownerSelect,
    });

    return this.mapProperty(property);
  }

  // ── Public list ─────────────────────────────────────────────

  async findAll(query: PropertyQueryDto) {
    const where: Prisma.PropertyWhereInput = {
      status: PropertyStatus.active,
    };

    if (query.city) where.city = { equals: query.city, mode: 'insensitive' };

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.monthly_rent = {
        ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}),
        ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}),
      };
    }

    if (query.bedrooms !== undefined) {
      where.bedrooms = { gte: query.bedrooms };
    }

    if (query.q) {
      const term = query.q.trim();
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { city: { contains: term, mode: 'insensitive' } },
        { neighborhood: { contains: term, mode: 'insensitive' } },
        { address: { contains: term, mode: 'insensitive' } },
      ];
    }

    let orderBy: Prisma.PropertyOrderByWithRelationInput[] = [{ created_at: 'desc' }];
    if (query.sort === 'price-asc') orderBy = [{ monthly_rent: 'asc' }];
    else if (query.sort === 'price-desc') orderBy = [{ monthly_rent: 'desc' }];

    const limit = query.limit ?? 6;
    const offset = query.offset ?? 0;

    // Light (card) mode: select only the columns `mapPropertyCard` emits so the
    // DB row transfer skips the heavy text fields (description, features, lat/lng).
    const cardSelect = {
      id: true,
      title: true,
      photos: true,
      status: true,
      monthly_rent: true,
      bedrooms: true,
      bathrooms: true,
      sqft: true,
      city: true,
      neighborhood: true,
      owner: { select: { name: true } },
    } as const;

    const [total, properties] = await Promise.all([
      this.prisma.property.count({ where }),
      query.light
        ? this.prisma.property.findMany({
            where,
            orderBy,
            skip: offset,
            take: limit,
            select: cardSelect,
          })
        : this.prisma.property.findMany({
            where,
            orderBy,
            skip: offset,
            take: limit,
            include: this.ownerSelect,
          }),
    ]);

    // Light (card) mode returns only what the browse/favorites grids need and
    // skips the heavy free-text fields. Cards don't render availability.
    const availabilityMap = query.light
      ? null
      : await this.computeAvailabilityForMany(properties.map((p) => p.id));

    return {
      items: properties.map((p) => ({
        ...(query.light ? this.mapPropertyCard(p) : this.mapProperty(p)),
        ...(query.light
          ? {}
          : { availability: availabilityMap[p.id] ?? { booked: [], open: [] } }),
      })),
      total,
    };
  }

  private mapPropertyCard(p: any) {
    return {
      id: p.id,
      title: p.title,
      photos: p.photos,
      status: p.status,
      monthlyRent: p.monthly_rent,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      sqft: p.sqft,
      city: p.city,
      neighborhood: p.neighborhood,
      ownerName: p.owner?.name ?? 'Owner',
    };
  }

  // ── Distinct cities ─────────────────────────────────────────

  async findCities() {
    const rows = await this.prisma.property.findMany({
      where: { status: PropertyStatus.active },
      distinct: ['city'],
      select: { city: true },
    });
    return rows.map((r) => r.city).sort();
  }

  // ── Public single ───────────────────────────────────────────

  async findOne(id: string) {
    const property = await this.prisma.property.findUnique({
      where: { id },
      include: this.ownerSelect,
    });
    if (!property) throw new NotFoundException('Property not found');
    if (property.status !== PropertyStatus.active) {
      throw new NotFoundException('Property not found');
    }

    const availability = await this.computeAvailability(property.id);
    return this.mapProperty(property, availability);
  }

  // ── Availability endpoint ───────────────────────────────────

  async getAvailability(id: string) {
    const property = await this.prisma.property.findUnique({ where: { id } });
    if (!property) throw new NotFoundException('Property not found');
    return this.computeAvailability(id);
  }

  // ── View / click tracking ───────────────────────────────────

  async incrementView(id: string) {
    await this.prisma.property
      .updateMany({ where: { id }, data: { view_count: { increment: 1 } } })
      .catch(() => {});
  }

  async incrementClick(id: string) {
    await this.prisma.property
      .updateMany({ where: { id }, data: { click_count: { increment: 1 } } })
      .catch(() => {});
  }

  // ── Presigned upload ────────────────────────────────────────

  async presignUpload(ownerId: string, dto: PresignUploadDto) {
    await this.ensureBucket();

    const ext = path.extname(dto.fileName) || '.jpg';
    const key = `properties/${ownerId}/${randomUUID()}${ext}`;

    const { data, error } = await this.supabase
      .getAdminClient()
      .storage.from(this.bucket)
      .createSignedUploadUrl(key);

    if (error) {
      this.logger.error('Presign error: ' + error.message);
      throw new BadRequestException('Failed to create upload URL');
    }

    const { data: pubData } = this.supabase
      .getAdminClient()
      .storage.from(this.bucket)
      .getPublicUrl(key);

    return {
      uploadUrl: data.signedUrl,
      path: data.path,
      publicUrl: pubData.publicUrl,
    };
  }

  // Deletes uploaded image objects owned by this owner. Only keys inside the
  // owner's upload folder are ever removed, so live listing photos are safe.
  async removeImages(ownerId: string, urls: string[]) {
    const keys = urls
      .map((u) => {
        const m = u.match(/\/object\/public\/[^/]+\/(.+)$/);
        if (!m) return null;
        return m[1].split('?')[0];
      })
      .filter(
        (k): k is string =>
          !!k && k.startsWith(`properties/${ownerId}/`),
      );
    if (keys.length === 0) return;
    const admin = this.supabase.getAdminClient();
    const { error } = await admin.storage.from(this.bucket).remove(keys);
    if (error) {
      this.logger.warn(`Failed to remove images: ${error.message}`);
    }
  }

  // Creates the public photos bucket on first use so photo uploads
  // never fail with "Bucket not found".
  private async ensureBucket() {
    if (this.bucketReady) return;

    const admin = this.supabase.getAdminClient();

    const { data: existing } = await admin.storage.getBucket(this.bucket);
    if (existing) {
      if (!existing.public) {
        await admin.storage.updateBucket(this.bucket, { public: true });
        this.logger.log(`Made storage bucket "${this.bucket}" public`);
      }
      this.bucketReady = true;
      return;
    }

    const { error: createError } = await admin.storage.createBucket(this.bucket, {
      public: true,
    });

    if (createError) {
      this.logger.error(
        `Failed to create storage bucket "${this.bucket}": ` + createError.message,
      );
      throw new BadRequestException(
        `Photo storage is not configured. Create a public bucket named "${this.bucket}" in Supabase → Storage.`,
      );
    }

    this.logger.log(`Created public storage bucket "${this.bucket}"`);
    this.bucketReady = true;
  }

  // ── Owner: list own ─────────────────────────────────────────

  async findAllMine(ownerId: string) {
    const properties = await this.prisma.property.findMany({
      where: { owner_id: ownerId },
      orderBy: { created_at: 'desc' },
      take: 50,
      include: this.ownerSelect,
    });
    return properties.map((p) => this.mapProperty(p));
  }

  // Light list for the owner dashboard — only the fields the property rows show.
  async findAllMineCard(ownerId: string) {
    const properties = await this.prisma.property.findMany({
      where: { owner_id: ownerId },
      orderBy: { created_at: 'desc' },
      take: 50,
      select: {
        id: true,
        title: true,
        photos: true,
        status: true,
        address: true,
        city: true,
        monthly_rent: true,
      },
    });
    return properties.map((p) => ({
      id: p.id,
      title: p.title,
      photos: p.photos,
      status: p.status,
      address: p.address,
      city: p.city,
      monthlyRent: p.monthly_rent,
    }));
  }

  // ── Owner: dashboard stats ──────────────────────────────────

  async getOwnerStats(ownerId: string) {
    const propertyWhere = { owner_id: ownerId };
    const leaseWhere = { property: { owner_id: ownerId } };

    const [propertyAgg, propertyByStatus, leaseStats, recentLeases] =
      await Promise.all([
        this.prisma.property.aggregate({
          where: propertyWhere,
          _count: true,
          _sum: { view_count: true, click_count: true },
        }),
        this.prisma.property.groupBy({
          by: ['status'],
          where: propertyWhere,
          _count: true,
        }),
        this.prisma.lease.groupBy({
          by: ['status'],
          where: leaseWhere,
          _count: true,
          _sum: { monthly_rent: true },
        }),
        this.prisma.lease.findMany({
          where: leaseWhere,
          orderBy: { created_at: 'desc' },
          take: 5,
          include: {
            property: { select: { id: true, title: true, photos: true, monthly_rent: true } },
            user: { select: { id: true, name: true } },
          },
        }),
      ]);

    const total = propertyAgg._count;
    const totalViews = propertyAgg._sum.view_count ?? 0;
    const totalClicks = propertyAgg._sum.click_count ?? 0;

    const activeEntry = propertyByStatus.find((s) => s.status === PropertyStatus.active);
    const activeCount = activeEntry?._count ?? 0;

    let totalBookings = 0;
    let projectedRevenue = 0;
    let pendingPayments = 0;
    let pendingAmount = 0;

    for (const group of leaseStats) {
      totalBookings += group._count;
      if (group.status === PropertyStatus.active) {
        projectedRevenue = group._sum.monthly_rent ?? 0;
      }
      if (group.status === LeaseStatus.pending_payment) {
        pendingPayments = group._count;
        pendingAmount = group._sum.monthly_rent ?? 0;
      }
    }

    return {
      properties: {
        total,
        active: activeCount,
        inactive: total - activeCount,
        views: totalViews,
        clicks: totalClicks,
      },
      payments: {
        projectedMonthlyRevenue: projectedRevenue,
        pendingCount: pendingPayments,
        pendingAmount,
        totalBookings,
      },
      recentLeases: recentLeases.map((l) => ({
        id: l.id,
        status: l.status,
        startDate: l.start_date,
        endDate: l.end_date,
        months: l.months,
        monthlyRent: l.monthly_rent,
        property: {
          id: l.property.id,
          title: l.property.title,
          photo: l.property.photos[0] ?? null,
        },
        tenant: {
          id: l.user.id,
          name: l.user.name ?? null,
        },
      })),
    };
  }

  // ── Owner: single own ───────────────────────────────────────

  async findOneMine(ownerId: string, id: string) {
    const property = await this.prisma.property.findFirst({
      where: { id, owner_id: ownerId },
      include: this.ownerSelect,
    });
    if (!property) throw new NotFoundException('Property not found');
    const availability = await this.computeAvailability(id);
    return this.mapProperty(property, availability);
  }

  // ── Owner: update ───────────────────────────────────────────

  async update(ownerId: string, id: string, dto: UpdatePropertyDto) {
    const existing = await this.prisma.property.findFirst({
      where: { id, owner_id: ownerId },
    });
    if (!existing) throw new NotFoundException('Property not found');

    if (dto.photos && dto.photos.length > MAX_PHOTOS) {
      throw new BadRequestException(`A property can have at most ${MAX_PHOTOS} photos`);
    }

    if (dto.photos) {
      const removed = existing.photos.filter((url) => !dto.photos!.includes(url));
      if (removed.length > 0) {
        await this.deleteCloudPhotos(removed);
      }
    }

    const property = await this.prisma.property.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.neighborhood_description !== undefined && { neighborhood_description: dto.neighborhood_description }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.neighborhood !== undefined && { neighborhood: dto.neighborhood }),
        ...(dto.latitude !== undefined && { latitude: dto.latitude }),
        ...(dto.longitude !== undefined && { longitude: dto.longitude }),
        ...(dto.monthly_rent !== undefined && { monthly_rent: dto.monthly_rent }),
        ...(dto.bedrooms !== undefined && { bedrooms: dto.bedrooms }),
        ...(dto.bathrooms !== undefined && { bathrooms: dto.bathrooms }),
        ...(dto.sqft !== undefined && { sqft: dto.sqft }),
        ...(dto.photos !== undefined && { photos: dto.photos }),
        ...(dto.features !== undefined && { features: dto.features }),
      },
      include: this.ownerSelect,
    });

    return this.mapProperty(property);
  }

  // ── Owner: toggle active / inactive ─────────────────────────

  async toggleStatus(ownerId: string, id: string) {
    const existing = await this.prisma.property.findFirst({
      where: { id, owner_id: ownerId },
    });
    if (!existing) throw new NotFoundException('Property not found');

    const newStatus =
      existing.status === PropertyStatus.active
        ? PropertyStatus.inactive
        : PropertyStatus.active;

    if (newStatus === PropertyStatus.active) {
      const owner = await this.prisma.user.findUnique({
        where: { id: ownerId },
        select: { stripe_connect_id: true },
      });
      if (!owner?.stripe_connect_id) {
        throw new BadRequestException(
          'Connect Stripe payouts to activate your listing.',
        );
      }
    }

    const property = await this.prisma.property.update({
      where: { id },
      data: { status: newStatus },
      include: this.ownerSelect,
    });

    return this.mapProperty(property);
  }

  // ── Owner: set explicit status ──────────────────────────────

  async setStatus(ownerId: string, id: string, target: PropertyStatus) {
    const existing = await this.prisma.property.findFirst({
      where: { id, owner_id: ownerId },
    });
    if (!existing) throw new NotFoundException('Property not found');
    if (existing.status === target) {
      throw new BadRequestException(`The listing is already ${target}`);
    }

    if (target === PropertyStatus.active) {
      const owner = await this.prisma.user.findUnique({
        where: { id: ownerId },
        select: { stripe_connect_id: true },
      });
      if (!owner?.stripe_connect_id) {
        throw new BadRequestException(
          'Connect Stripe payouts to activate your listing.',
        );
      }
    }

    const property = await this.prisma.property.update({
      where: { id },
      data: { status: target },
      include: this.ownerSelect,
    });

    return this.mapProperty(property);
  }

  // ── Owner: delete ───────────────────────────────────────────

  async remove(ownerId: string, id: string) {
    const existing = await this.prisma.property.findFirst({
      where: { id, owner_id: ownerId },
    });
    if (!existing) throw new NotFoundException('Property not found');

    const leaseCount = await this.prisma.lease.count({
      where: { property_id: id },
    });
    if (leaseCount > 0) {
      throw new BadRequestException(
        'Cannot delete a property with existing leases. Set it inactive instead.',
      );
    }

    await this.deleteCloudPhotos(existing.photos);

    await this.prisma.property.delete({ where: { id } });
    return { ok: true };
  }

  private async deleteCloudPhotos(photoUrls: string[]) {
    if (!photoUrls || photoUrls.length === 0) return;

    const keys: string[] = [];
    for (const url of photoUrls) {
      const marker = `/object/public/${this.bucket}/`;
      const idx = url.indexOf(marker);
      if (idx !== -1) {
        const key = url.slice(idx + marker.length).split('?')[0];
        if (key) keys.push(key);
      }
    }
    if (keys.length === 0) return;

    try {
      const { error } = await this.supabase
        .getAdminClient()
        .storage.from(this.bucket)
        .remove(keys);
      if (error) {
        this.logger.warn(`Failed to remove cloud photos: ${error.message}`);
      }
    } catch (e: any) {
      this.logger.warn(`Failed to remove cloud photos: ${e?.message ?? e}`);
    }
  }

  // ── Private helpers ─────────────────────────────────────────

  private readonly ownerSelect = {
    owner: { select: { id: true, name: true, stripe_connect_id: true } },
  };

  private mapProperty(
    p: any,
    availability?: { booked: any[]; open: any[] },
  ) {
    return {
      id: p.id,
      title: p.title,
      description: p.description,
      neighborhoodDescription: p.neighborhood_description,
      address: p.address,
      city: p.city,
      neighborhood: p.neighborhood,
      latitude: p.latitude,
      longitude: p.longitude,
      monthlyRent: p.monthly_rent,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      sqft: p.sqft,
      photos: p.photos,
      features: p.features ?? [],
      status: p.status,
      bookable: !!p.owner?.stripe_connect_id,
      viewCount: p.view_count,
      clickCount: p.click_count,
      createdAt: p.created_at,
      availability: availability ?? { booked: [], open: [] },
      owner: p.owner ? { id: p.owner.id, name: p.owner.name } : undefined,
    };
  }

  private async computeAvailability(id: string) {
    const leases = await this.prisma.lease.findMany({
      where: {
        property_id: id,
        status: { in: [LeaseStatus.active, LeaseStatus.pending_payment] },
        end_date: { gt: new Date() },
      },
      select: { start_date: true, end_date: true },
    });
    return this.computeGaps(
      leases.map((l) => ({ start: l.start_date, end: l.end_date })),
    );
  }

  // Light card payload (used by favorites) — same fields as browse grid cards.
  // No availability: PropertyCard renders only status, and the detail page
  // fetches availability separately via /properties/:id.
  async mapPropertiesForCardList(properties: any[]) {
    return properties.map((p) => this.mapPropertyCard(p));
  }

  private async computeAvailabilityForMany(propertyIds: string[]) {
    if (propertyIds.length === 0) return {};

    const leases = await this.prisma.lease.findMany({
      where: {
        property_id: { in: propertyIds },
        status: { in: [LeaseStatus.active, LeaseStatus.pending_payment] },
        end_date: { gt: new Date() },
      },
      select: { property_id: true, start_date: true, end_date: true },
    });

    const grouped: Record<string, { start: Date; end: Date }[]> = {};
    for (const l of leases) {
      (grouped[l.property_id] ??= []).push({ start: l.start_date, end: l.end_date });
    }

    const result: Record<string, { booked: any[]; open: any[] }> = {};
    for (const id of propertyIds) {
      result[id] = this.computeGaps(grouped[id] ?? []);
    }
    return result;
  }

  private computeGaps(bookedRanges: { start: Date; end: Date }[]) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const horizon = new Date(today);
    horizon.setDate(horizon.getDate() + HORIZON_DAYS);

    const activeBooked = bookedRanges
      .filter((r) => r.end > today)
      .map((r) => ({
        start: new Date(Math.max(r.start.getTime(), today.getTime())),
        end: r.end,
      }))
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    const merged: { start: Date; end: Date }[] = [];
    for (const r of activeBooked) {
      const last = merged[merged.length - 1];
      if (last && r.start.getTime() <= last.end.getTime()) {
        last.end = new Date(Math.max(last.end.getTime(), r.end.getTime()));
      } else {
        merged.push({ start: r.start, end: r.end });
      }
    }

    const open: { start: Date; end: Date }[] = [];
    let cursor = today;
    for (const r of merged) {
      if (r.start.getTime() > cursor.getTime()) {
        open.push({ start: new Date(cursor), end: r.start });
      }
      cursor = new Date(Math.max(cursor.getTime(), r.end.getTime()));
    }
    if (cursor.getTime() < horizon.getTime()) {
      open.push({ start: cursor, end: horizon });
    }

    return {
      booked: merged.map((r) => ({
        start: r.start.toISOString(),
        end: r.end.toISOString(),
      })),
      open: open.map((r) => ({
        start: r.start.toISOString(),
        end: r.end.toISOString(),
      })),
    };
  }
}
