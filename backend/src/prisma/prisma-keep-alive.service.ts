import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from './prisma.service';

@Injectable()
export class PrismaKeepAliveService {
  private readonly logger = new Logger(PrismaKeepAliveService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron('*/10 * * * * *')
  async keepAlive() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      this.logger.warn('Pooler keep-alive ping failed — pool may need recovery');
    }
  }
}
