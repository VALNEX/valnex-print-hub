import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { $Enums } from '../../../../generated/prisma/client.js';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreatePrintDeviceDto {
  @ApiProperty({ example: 'a1f4f8fe-1111-4444-8888-0f9b4d4c1a11' })
  @IsUUID()
  tenantId!: string;

  @ApiProperty({ example: 'Epson TM-T20' })
  @IsString()
  @MaxLength(150)
  name!: string;

  @ApiProperty({ example: 'epson-front-desk' })
  @IsString()
  @MaxLength(80)
  code!: string;

  @ApiProperty({ enum: $Enums.PrintDeviceType, example: $Enums.PrintDeviceType.thermal })
  @IsEnum($Enums.PrintDeviceType)
  type!: $Enums.PrintDeviceType;

  @ApiProperty({ enum: $Enums.PrintConnectionType, example: $Enums.PrintConnectionType.network })
  @IsEnum($Enums.PrintConnectionType)
  connectionType!: $Enums.PrintConnectionType;

  @ApiProperty({ example: '192.168.1.80:9100' })
  @IsString()
  @MaxLength(255)
  identifier!: string;

  @ApiPropertyOptional({ enum: $Enums.PrintDeviceStatus, example: $Enums.PrintDeviceStatus.online })
  @IsOptional()
  @IsEnum($Enums.PrintDeviceStatus)
  status?: $Enums.PrintDeviceStatus;
}
