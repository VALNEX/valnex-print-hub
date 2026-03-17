import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class RenamePrintDeviceDto {
  @ApiProperty({ example: 'Bascula Patio Norte' })
  @IsString()
  @MaxLength(150)
  name!: string;
}
