import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { $Enums } from '../../../../generated/prisma/client.js';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class PresentPrintDeviceDto {
  @ApiProperty({ example: 'ANDROID-PIXEL-7-01' })
  @IsString()
  @MaxLength(255)
  identifier!: string;

  @ApiProperty({ example: 'AA:BB:CC:DD:EE:FF' })
  @IsString()
  @MaxLength(50)
  macAddress!: string;

  @ApiProperty({ example: 'Impresora Movil Patio Norte' })
  @IsString()
  @MaxLength(150)
  name!: string;

  @ApiPropertyOptional({ example: 'mobile-patio-norte' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  code?: string;

  @ApiPropertyOptional({ enum: $Enums.PrintDeviceType, example: $Enums.PrintDeviceType.thermal })
  @IsOptional()
  @IsEnum($Enums.PrintDeviceType)
  type?: $Enums.PrintDeviceType;

  @ApiPropertyOptional({ enum: $Enums.PrintConnectionType, example: $Enums.PrintConnectionType.bluetooth })
  @IsOptional()
  @IsEnum($Enums.PrintConnectionType)
  connectionType?: $Enums.PrintConnectionType;
}
