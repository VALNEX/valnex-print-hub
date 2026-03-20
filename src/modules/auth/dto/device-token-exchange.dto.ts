import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class DeviceTokenExchangeDto {
  @ApiProperty({ example: '11111111-2222-3333-4444-555555555555' })
  @IsString()
  @MinLength(36)
  @MaxLength(36)
  credentialId!: string;

  @ApiProperty({ example: 'Lzv0R7i8SxB9Y6mD3Qk2_8Pp1n4Ew5u7Rr0Tt2Qq9Lk' })
  @IsString()
  @MinLength(32)
  @MaxLength(255)
  credentialSecret!: string;
}
