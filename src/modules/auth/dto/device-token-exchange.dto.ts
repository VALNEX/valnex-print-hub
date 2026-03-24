import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class DeviceTokenExchangeDto {
  @ApiProperty({ example: 'dapi_33333333-4444-5555-6666-777777777777.Lzv0R7i8SxB9Y6mD3Qk2_8Pp1n4Ew5u7Rr0Tt2Qq9Lk' })
  @IsString()
  @MinLength(32)
  @MaxLength(512)
  apiKey!: string;
}
