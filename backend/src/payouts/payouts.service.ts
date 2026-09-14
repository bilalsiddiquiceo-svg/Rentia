import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PayoutsService {
  private readonly logger = new Logger(PayoutsService.name);

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // ── Wallet ─────────────────────────────────────────────────

  async getWallet(ownerId: string) {
    const baseWhere = {
      status: { in: ['held', 'released'] },
      lease: { property: { owner_id: ownerId } },
    };

    const [pendingAgg, approvedAgg, user] = await Promise.all([
      this.prisma.payment.aggregate({
        where: { ...baseWhere, status: 'held' },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: { ...baseWhere, status: 'released' },
        _sum: { amount: true },
      }),
      this.prisma.user.findUnique({
        where: { id: ownerId },
        select: { stripe_connect_id: true },
      }),
    ]);

    return {
      connected: !!user?.stripe_connect_id,
      pending: pendingAgg._sum.amount ?? 0,
      approved: approvedAgg._sum.amount ?? 0,
    };
  }

  // ── Disputes ───────────────────────────────────────────────

  async listDisputes(ownerId: string) {
    const disputes = await this.prisma.dispute.findMany({
      where: {
        payment: { lease: { property: { owner_id: ownerId } } },
      },
      include: {
        payment: {
          select: {
            id: true,
            amount: true,
            period_start: true,
            status: true,
            lease: {
              select: {
                property: { select: { id: true, title: true } },
              },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
      take: 50,
    });

    return disputes.map((d) => ({
      id: d.id,
      reason: d.reason,
      status: d.status,
      created_at: d.created_at,
      resolved_at: d.resolved_at,
      amount: d.payment.amount,
      period_start: d.payment.period_start,
      property: d.payment.lease.property,
    }));
  }
}
