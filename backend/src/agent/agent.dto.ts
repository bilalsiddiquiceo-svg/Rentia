import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ArrayMaxSize,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';

export class LocationDto {
  @Type(() => Number)
  @IsNumber()
  latitude!: number;

  @Type(() => Number)
  @IsNumber()
  longitude!: number;
}

export class ChatDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  message!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  photos?: string[];
}

export class ListingChangesDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
    description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  neighborhoodDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  neighborhood?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000)
  monthlyRent?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(20)
  bedrooms?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(20)
  bathrooms?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sqft?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;
}

export class ConfirmListingEditDto {
  @IsString()
  propertyId!: string;

  @ValidateNested()
  @Type(() => ListingChangesDto)
  changes!: ListingChangesDto;
}

export class ConfirmStatusChangeDto {
  @IsString()
  propertyId!: string;

  @IsIn(['active', 'inactive'])
  status!: 'active' | 'inactive';
}

export class ConfirmImagesChangeDto {
  @IsString()
  propertyId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @IsString({ each: true })
  photos!: string[];
}

export class ConfirmListingCreateDto {
  @IsString()
  @MaxLength(120)
  title!: string;

  @IsString()
  @MaxLength(2000)
  description!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  neighborhoodDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  neighborhood?: string;

  @IsString()
  @MaxLength(200)
  address!: string;

  @IsString()
  @MaxLength(80)
  city!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000)
  monthlyRent!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(20)
  bedrooms!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(20)
  bathrooms!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sqft?: number;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @IsString({ each: true })
  photos!: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  features?: string[];
}
