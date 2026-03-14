import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { $Enums } from '../../../../generated/prisma/client.js';
import { Prisma } from '../../../../generated/prisma/client.js';
import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreatePrintJobDto {
  @ApiProperty({ example: 'a1f4f8fe-1111-4444-8888-0f9b4d4c1a11' })
  @IsUUID()
  tenantId!: string;

  @ApiProperty({ example: 'ticket' })
  @IsString()
  @MaxLength(100)
  documentType!: string;

  @ApiProperty({ enum: $Enums.PrintJobFormat, example: $Enums.PrintJobFormat.escpos })
  @IsEnum($Enums.PrintJobFormat)
  format!: $Enums.PrintJobFormat;

  @ApiProperty({ example: { lines: ['A', 'B'] } })
  @IsObject()
  payload!: Prisma.InputJsonValue;

  @ApiPropertyOptional({ example: 'REQ-10001' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  requestId?: string;

  @ApiPropertyOptional({ example: 'EXT-10001' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  externalId?: string;

  @ApiPropertyOptional({ example: 'sha256:abc123' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  contentHash?: string;

  @ApiPropertyOptional({ enum: $Enums.PrintJobStatus, example: $Enums.PrintJobStatus.queued })
  @IsOptional()
  @IsEnum($Enums.PrintJobStatus)
  status?: $Enums.PrintJobStatus;
}
