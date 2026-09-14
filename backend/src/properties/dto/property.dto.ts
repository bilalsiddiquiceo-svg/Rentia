import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ArrayMaxSize,
} from 'class-validator';

export class CreatePropertyDto {
  @IsString()
  @MaxLength(120)
  title!: string;

  @IsString()
  @MaxLength(2000)
  description!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  neighborhood_description?: string;

  @IsString()
  @MaxLength(200)
  address!: string;

  @IsString()
  @MaxLength(80)
  city!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  neighborhood?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000)
  monthly_rent!: number;

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

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(5)
  photos?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  features?: string[];
}

export class UpdatePropertyDto {
  @IsOptional() @IsString() @MaxLength(120) title?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsString() @MaxLength(200) address?: string;
  @IsOptional() @IsString() @MaxLength(80) city?: string;
  @IsOptional() @IsString() @MaxLength(80) neighborhood?: string;
  @IsOptional() @IsString() @MaxLength(2000) neighborhood_description?: string;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(100000) monthly_rent?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(20) bedrooms?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(20) bathrooms?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) sqft?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) @ArrayMaxSize(5) photos?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) @ArrayMaxSize(20) features?: string[];
}

export class PropertyQueryDto {
  @IsOptional() @IsString() city?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) minPrice?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) maxPrice?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) bedrooms?: number;
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsString() sort?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) offset?: number;
  @IsOptional() light?: boolean;
}

export class PresignUploadDto {
  @IsString()
  @MaxLength(255)
  fileName!: string;

  @IsString()
  @MaxLength(100)
  contentType!: string;
}
