import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { $Enums } from '../../../../generated/prisma/client.js';

export class DeviceActivationRequestDto {
  @ApiProperty({ example: 'valnex' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  tenantSlug!: string;

  @ApiProperty({ example: 'WPF-FRONT-01' })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  identifier!: string;

  @ApiProperty({ example: 'AA:BB:CC:DD:EE:FF' })
  @IsString()
  @MinLength(12)
  @MaxLength(50)
  macAddress!: string;

  @ApiProperty({ example: 'Front Desk Printer' })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name!: string;

  @ApiPropertyOptional({ example: 'front-desk' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  code?: string;

  @ApiPropertyOptional({ enum: $Enums.PrintDeviceType, example: $Enums.PrintDeviceType.thermal })
  @IsOptional()
  @IsEnum($Enums.PrintDeviceType)
  type?: $Enums.PrintDeviceType;

  @ApiPropertyOptional({
    enum: $Enums.PrintConnectionType,
    example: $Enums.PrintConnectionType.bridge,
  })
  @IsOptional()
  @IsEnum($Enums.PrintConnectionType)
  connectionType?: $Enums.PrintConnectionType;
}
