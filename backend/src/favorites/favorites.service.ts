import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PropertiesService } from '../properties/properties.service';

@Injectable()
export class FavoritesService {
  constructor(
    private prisma: PrismaService,
    private propertiesService: PropertiesService,
  ) {}

  async addFavorite(userId: string, propertyId: string) {
    const property = await this.prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) throw new NotFoundException('Property not found');

    try {
      await this.prisma.favorite.create({
        data: { user_id: userId, property_id: propertyId },
      });
      return { ok: true };
    } catch (e: any) {
      if (e.code === 'P2002') throw new ConflictException('Already favorited');
      throw e;
    }
  }

  async removeFavorite(userId: string, propertyId: string) {
    const existing = await this.prisma.favorite.findUnique({
      where: { user_id_property_id: { user_id: userId, property_id: propertyId } },
    });
    if (!existing) throw new NotFoundException('Favorite not found');

    await this.prisma.favorite.delete({ where: { id: existing.id } });
    return { success: true };
  }

  async getUserFavorites(userId: string) {
    const favorites = await this.prisma.favorite.findMany({
      where: { user_id: userId },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            photos: true,
            status: true,
            monthly_rent: true,
            bedrooms: true,
            bathrooms: true,
            sqft: true,
            city: true,
            neighborhood: true,
            owner: { select: { name: true } },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
    const properties = favorites.map((f) => f.property);
    return this.propertiesService.mapPropertiesForCardList(properties);
  }

  async getFavoritePropertyIds(userId: string): Promise<string[]> {
    const favorites = await this.prisma.favorite.findMany({
      where: { user_id: userId },
      select: { property_id: true },
    });
    return favorites.map((f) => f.property_id);
  }
}
