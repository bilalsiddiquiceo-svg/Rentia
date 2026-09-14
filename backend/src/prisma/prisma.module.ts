import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { PrismaKeepAliveService } from './prisma-keep-alive.service';

@Global()
@Module({
  providers: [PrismaService, PrismaKeepAliveService],
  exports: [PrismaService],
})
export class PrismaModule {}