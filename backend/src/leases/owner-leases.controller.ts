import { Controller, Get, Req, Param } from '@nestjs/common';
import { LeasesService } from './leases.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Roles(Role.owner)
@Controller('owner/leases')
export class OwnerLeasesController {
  constructor(private readonly leasesService: LeasesService) {}

  @Get()
  listForOwner(@Req() req: any) {
    return this.leasesService.listOwnerLeases(req.user.id);
  }

  @Get(':id')
  getLease(@Req() req: any, @Param('id') id: string) {
    return this.leasesService.getLease(req.user.id, id);
  }
}
