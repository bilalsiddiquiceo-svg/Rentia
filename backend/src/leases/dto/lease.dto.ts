import { IsInt, IsString, IsOptional, Min, Max, Matches } from 'class-validator';

export class CreateLeaseDto {
  @IsString()
  property_id: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'start_date must be YYYY-MM-DD' })
  start_date: string;

  @IsInt()
  @Min(1, { message: 'months must be at least 1' })
  @Max(12, { message: 'months cannot exceed 12' })
  months: number;
}

export class RenewLeaseDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  months?: number;
}
