import { Module } from '@nestjs/common';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { PaymentModule } from '../payment/payment.module';
import { PropertiesModule } from '../properties/properties.module';

@Module({
  imports: [PaymentModule, PropertiesModule],
  controllers: [AgentController],
  providers: [AgentService],
  exports: [AgentService],
})
export class AgentModule {}
