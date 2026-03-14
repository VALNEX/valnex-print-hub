import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class PrinterLoginDto {
  @ApiProperty({ example: 'tenant-slug' })
  @IsString()
  @MaxLength(100)
  username!: string;

  @ApiProperty({ example: 'tenant-api-key' })
  @IsString()
  @MaxLength(255)
  password!: string;
}
