import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class DeviceActivationApproveDto {
  @ApiProperty({ example: '11111111-2222-3333-4444-555555555555' })
  @IsString()
  @MinLength(36)
  @MaxLength(36)
  activationRequestId!: string;

  @ApiProperty({ example: 'Q7K9M2PJ' })
  @IsString()
  @MinLength(6)
  @MaxLength(20)
  activationCode!: string;
}
