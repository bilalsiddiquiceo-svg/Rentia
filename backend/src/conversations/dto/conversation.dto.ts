import { IsString, IsOptional, IsArray, MaxLength } from 'class-validator';

export class CreateConversationDto {
  @IsString()
  propertyId: string;
}

export class SendMessageDto {
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  text?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachmentUrls?: string[];
}

export class EditMessageDto {
  @IsString()
  @MaxLength(4000)
  text: string;
}

export class PresignChatUploadDto {
  @IsString()
  fileName: string;

  @IsString()
  contentType: string;
}
