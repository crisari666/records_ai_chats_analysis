import { IsString, IsOptional, IsMongoId } from 'class-validator';

export class UpdateWhatsappSessionDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsMongoId()
  groupId?: string;
}

