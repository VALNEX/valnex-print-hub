import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TenantDto {
  @ApiProperty({ example: 'a1f4f8fe-1111-4444-8888-0f9b4d4c1a11' })
  id!: string;

  @ApiProperty({ example: 'VALNEX' })
  name!: string;

  @ApiProperty({ example: 'valnex' })
  slug!: string;

  @ApiProperty({ example: 'active' })
  status!: string;
}