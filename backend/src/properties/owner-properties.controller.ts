import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Req,
} from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { UpdatePropertyDto } from './dto/property.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Roles(Role.owner)
@Controller('owner/properties')
export class OwnerPropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Get()
  findAllMine(@Req() req: any) {
    return this.propertiesService.findAllMine(req.user.id);
  }

  @Get('cards')
  findAllMineCard(@Req() req: any) {
    return this.propertiesService.findAllMineCard(req.user.id);
  }

  @Get('stats')
  getStats(@Req() req: any) {
    return this.propertiesService.getOwnerStats(req.user.id);
  }

  @Get(':id')
  findOneMine(@Req() req: any, @Param('id') id: string) {
    return this.propertiesService.findOneMine(req.user.id, id);
  }

  @Patch(':id')
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdatePropertyDto,
  ) {
    return this.propertiesService.update(req.user.id, id, dto);
  }

  @Patch(':id/status')
  toggleStatus(@Req() req: any, @Param('id') id: string) {
    return this.propertiesService.toggleStatus(req.user.id, id);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.propertiesService.remove(req.user.id, id);
  }
}
