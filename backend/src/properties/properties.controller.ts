import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PropertiesService } from './properties.service';
import {
  CreatePropertyDto,
  PropertyQueryDto,
  PresignUploadDto,
} from './dto/property.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Public()
  @Get()
  findAll(@Query() query: PropertyQueryDto) {
    return this.propertiesService.findAll(query);
  }

  @Public()
  @Get('cities')
  findCities() {
    return this.propertiesService.findCities();
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.propertiesService.findOne(id);
  }

  @Public()
  @Get(':id/availability')
  availability(@Param('id') id: string) {
    return this.propertiesService.getAvailability(id);
  }

  @Post(':id/view')
  @HttpCode(HttpStatus.OK)
  trackView(@Param('id') id: string) {
    return this.propertiesService.incrementView(id);
  }

  @Post(':id/click')
  @HttpCode(HttpStatus.OK)
  trackClick(@Param('id') id: string) {
    return this.propertiesService.incrementClick(id);
  }

  @Roles(Role.owner)
  @Post()
  create(@Req() req: any, @Body() dto: CreatePropertyDto) {
    return this.propertiesService.create(req.user.id, dto);
  }

  @Roles(Role.owner)
  @Post('uploads/presign')
  presign(@Req() req: any, @Body() dto: PresignUploadDto) {
    return this.propertiesService.presignUpload(req.user.id, dto);
  }
}
