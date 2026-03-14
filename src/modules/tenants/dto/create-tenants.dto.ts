import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { $Enums } from '../../../../generated/prisma/client.js';
import { Prisma } from '../../../../generated/prisma/client.js';
import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateTenantDto {
  @ApiProperty({ example: 'VALNEX' })
  @IsString()
  @MaxLength(150)
  name!: string;

  @ApiProperty({ example: 'valnex' })
  @IsString()
  @MaxLength(100)
  slug!: string;

  @ApiPropertyOptional({ example: 'Valnex SA de CV' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  legalName?: string;

  @ApiPropertyOptional({ example: 'RFC123456XYZ' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  taxId?: string;

  @ApiPropertyOptional({ enum: $Enums.RecordStatus, example: $Enums.RecordStatus.active })
  @IsOptional()
  @IsEnum($Enums.RecordStatus)
  status?: $Enums.RecordStatus;

  @ApiPropertyOptional({ example: { defaultPrinter: 'front-desk' } })
  @IsOptional()
  @IsObject()
  settings?: Prisma.InputJsonValue;
}
