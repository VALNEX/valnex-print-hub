import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class DeviceTokenRefreshDto {
  @ApiProperty({ example: 'm5Q9hQ3k4s9vS6f2Qe4bVxwQx4f1F3J5Kp2u7Q4m9x8' })
  @IsString()
  @MinLength(32)
  @MaxLength(255)
  refreshToken!: string;
}
