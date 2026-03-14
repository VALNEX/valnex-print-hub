import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { $Enums } from '../../../../generated/prisma/client.js';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreatePrintSourceDto {
  @ApiProperty({ example: 'a1f4f8fe-1111-4444-8888-0f9b4d4c1a11' })
  @IsUUID()
  tenantId!: string;

  @ApiProperty({ example: 'Billing Service' })
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 'billing' })
  @IsString()
  @MaxLength(80)
  code!: string;

  @ApiPropertyOptional({ enum: $Enums.RecordStatus, example: $Enums.RecordStatus.active })
  @IsOptional()
  @IsEnum($Enums.RecordStatus)
  status?: $Enums.RecordStatus;
}
