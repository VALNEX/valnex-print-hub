import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class DeviceCredentialRevokeDto {
  @ApiProperty({ example: '11111111-2222-3333-4444-555555555555' })
  @IsString()
  @MinLength(36)
  @MaxLength(36)
  credentialId!: string;

  @ApiPropertyOptional({ example: 'Device reported as compromised' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
