import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';

const SLOW_QUERY_THRESHOLD_MS = 100;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'warn' },
        { emit: 'event', level: 'error' },
      ],
    });
  }

  async onModuleInit() {
    (this.$on as Function)('query', (e: Prisma.QueryEvent) => {
      const duration = Number(e.duration);
      if (duration >= SLOW_QUERY_THRESHOLD_MS) {
        this.logger.warn(
          `[${duration}ms] ${e.query.slice(0, 200)}${e.query.length > 200 ? '…' : ''}`,
        );
      }
    });
    (this.$on as Function)('warn', (e: Prisma.LogEvent) => this.logger.warn(e.message));
    (this.$on as Function)('error', (e: Prisma.LogEvent) => this.logger.error(e.message));

    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}