import { IsNotEmpty, IsString } from 'class-validator';

export class BecomeOwnerRequestDto {
  @IsNotEmpty({ message: 'Full name is required' })
  @IsString()
  name: string;

  @IsNotEmpty({ message: 'Phone number is required' })
  @IsString()
  phone: string;
}
