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
  Min,
} from 'class-validator';

export class PublicSubmitPrintDto {
  @ApiProperty({ example: 'valnex' })
  @IsString()
  @MaxLength(100)
  tenantSlug!: string;

  @ApiProperty({ example: 'ticket' })
  @IsString()
  @MaxLength(100)
  documentType!: string;

  @ApiProperty({ enum: $Enums.PrintJobFormat, example: $Enums.PrintJobFormat.escpos })
  @IsEnum($Enums.PrintJobFormat)
  format!: $Enums.PrintJobFormat;

  @ApiProperty({
    example: {
      jobs: [
        {
          type: 'text',
          value: 'KON KENN\\n',
          align: 'center',
          bold: true,
          width: 2,
          height: 2,
        },
        {
          type: 'feed',
          lines: 1,
        },
        {
          type: 'cut',
        },
      ],
    },
  })
  @IsObject()
  payload!: Prisma.InputJsonValue;

  @ApiPropertyOptional({ example: 'front-desk' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  printerCode?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Min(1)
  copies?: number;

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
}
