import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class AuthLoginDto {
  @ApiProperty({ example: 'admin@valnex.local o valnex' })
  @IsString()
  @MaxLength(150)
  identifier!: string;

  @ApiProperty({ example: 'StrongPassword123! o tenant-api-key' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  password!: string;
}
