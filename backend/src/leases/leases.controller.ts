import { Controller, Get, Post, Patch, Param, Body, Req } from '@nestjs/common';
import { LeasesService } from './leases.service';
import { CreateLeaseDto, RenewLeaseDto } from './dto/lease.dto';

@Controller('leases')
export class LeasesController {
  constructor(private readonly leasesService: LeasesService) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreateLeaseDto) {
    return this.leasesService.create(req.user.id, dto);
  }

  @Get('mine')
  listMine(@Req() req: any) {
    return this.leasesService.listMine(req.user.id);
  }

  @Get(':id')
  getLease(@Req() req: any, @Param('id') id: string) {
    return this.leasesService.getLease(req.user.id, id);
  }

  @Get(':id/payments')
  getPayments(@Req() req: any, @Param('id') id: string) {
    return this.leasesService.getLeasePayments(req.user.id, id);
  }

  @Patch(':id/cancel')
  cancel(@Req() req: any, @Param('id') id: string) {
    return this.leasesService.cancel(req.user.id, id);
  }

  @Post(':id/renew')
  renew(@Req() req: any, @Param('id') id: string, @Body() dto: RenewLeaseDto) {
    return this.leasesService.renew(req.user.id, id, dto.months ?? 1);
  }
}
