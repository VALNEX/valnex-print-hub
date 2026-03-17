import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class AdminRegisterDto {
  @ApiProperty({ example: 'admin@valnex.local' })
  @IsEmail()
  @MaxLength(150)
  email!: string;

  @ApiProperty({ example: 'StrongPassword123!' })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password!: string;

  @ApiPropertyOptional({ example: 'Administrador Principal' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  fullName?: string;
}
