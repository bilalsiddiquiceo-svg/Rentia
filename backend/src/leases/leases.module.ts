import { Module } from '@nestjs/common';
import { LeasesController } from './leases.controller';
import { OwnerLeasesController } from './owner-leases.controller';
import { LeasesService } from './leases.service';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [PaymentModule],
  controllers: [LeasesController, OwnerLeasesController],
  providers: [LeasesService],
  exports: [LeasesService],
})
export class LeasesModule {}
