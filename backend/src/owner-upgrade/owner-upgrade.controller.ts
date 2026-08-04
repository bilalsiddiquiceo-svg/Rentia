import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { OwnerUpgradeService } from './owner-upgrade.service';
import { BecomeOwnerRequestDto } from './dto/owner-upgrade.dto';
import { Public } from '../auth/decorators/public.decorator';

@Controller('become-owner')
export class OwnerUpgradeController {
  constructor(private readonly ownerUpgradeService: OwnerUpgradeService) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @Post('request')
  async requestUpgrade(
    @Req() req: any,
    @Body() dto: BecomeOwnerRequestDto,
  ) {
    return this.ownerUpgradeService.requestUpgrade(req.user.id, dto.name, dto.phone);
  }

  @Public()
  @Get('confirm')
  async confirmUpgrade(@Query('token') token: string) {
    return this.ownerUpgradeService.confirmUpgrade(token);
  }
}
