import { Controller, Get, Post, Delete, Param, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import type { Request } from 'express';

@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Post(':propertyId')
  async addFavorite(@Req() req: Request, @Param('propertyId') propertyId: string) {
    const userId = (req as any).user.sub || (req as any).user.id;
    return this.favoritesService.addFavorite(userId, propertyId);
  }

  @Delete(':propertyId')
  @HttpCode(HttpStatus.OK)
  async removeFavorite(@Req() req: Request, @Param('propertyId') propertyId: string) {
    const userId = (req as any).user.sub || (req as any).user.id;
    return this.favoritesService.removeFavorite(userId, propertyId);
  }

  @Get()
  async getFavorites(@Req() req: Request) {
    const userId = (req as any).user.sub || (req as any).user.id;
    return this.favoritesService.getUserFavorites(userId);
  }

  @Get('ids')
  async getFavoriteIds(@Req() req: Request) {
    const userId = (req as any).user.sub || (req as any).user.id;
    return this.favoritesService.getFavoritePropertyIds(userId);
  }
}
