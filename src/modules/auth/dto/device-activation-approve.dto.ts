import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class DeviceActivationApproveDto {
  @ApiProperty({ example: 'Q7K9M2PJ' })
  @IsString()
  @MinLength(6)
  @MaxLength(20)
  activationCode!: string;
}
