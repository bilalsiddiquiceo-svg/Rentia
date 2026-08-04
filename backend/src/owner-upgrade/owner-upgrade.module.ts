import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OwnerUpgradeService } from './owner-upgrade.service';
import { OwnerUpgradeController } from './owner-upgrade.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule, ConfigModule],
  providers: [OwnerUpgradeService],
  controllers: [OwnerUpgradeController],
})
export class OwnerUpgradeModule {}
