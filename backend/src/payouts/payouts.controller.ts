import { Controller, Get, Req } from '@nestjs/common';
import { PayoutsService } from './payouts.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Roles(Role.owner)
@Controller('owner')
export class PayoutsController {
  constructor(private readonly payoutsService: PayoutsService) {}

  @Get('wallet')
  getWallet(@Req() req: any) {
    return this.payoutsService.getWallet(req.user.id);
  }

  @Get('disputes')
  listDisputes(@Req() req: any) {
    return this.payoutsService.listDisputes(req.user.id);
  }
}
