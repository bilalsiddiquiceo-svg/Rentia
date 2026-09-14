import { Module } from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { PropertiesController } from './properties.controller';
import { OwnerPropertiesController } from './owner-properties.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [PrismaModule, SupabaseModule],
  providers: [PropertiesService],
  controllers: [PropertiesController, OwnerPropertiesController],
  exports: [PropertiesService],
})
export class PropertiesModule {}
