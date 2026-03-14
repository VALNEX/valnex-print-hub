import { ApiPropertyOptional } from '@nestjs/swagger';
import { $Enums } from '../../../../generated/prisma/client.js';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class FilterPrintDeviceDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 25 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  pageSize?: number;

  @ApiPropertyOptional({ example: 'a1f4f8fe-1111-4444-8888-0f9b4d4c1a11' })
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @ApiPropertyOptional({
    enum: $Enums.PrintDeviceStatus,
    example: $Enums.PrintDeviceStatus.online,
  })
  @IsOptional()
  @IsEnum($Enums.PrintDeviceStatus)
  status?: $Enums.PrintDeviceStatus;

  @ApiPropertyOptional({
    example: true,
    description:
      'True: devices considered active (online, busy). False: inactive (offline, paused, error, unknown).',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true' || normalized === '1') {
        return true;
      }
      if (normalized === 'false' || normalized === '0') {
        return false;
      }
    }
    return value;
  })
  @IsBoolean()
  active?: boolean;
}
