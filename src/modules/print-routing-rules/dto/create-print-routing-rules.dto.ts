import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreatePrintRoutingRuleDto {
  @ApiProperty({ example: 'a1f4f8fe-1111-4444-8888-0f9b4d4c1a11' })
  @IsUUID()
  tenantId!: string;

  @ApiProperty({ example: 'Tickets Front Desk' })
  @IsString()
  @MaxLength(150)
  name!: string;

  @ApiProperty({ example: 'ticket' })
  @IsString()
  @MaxLength(100)
  documentType!: string;

  @ApiProperty({ example: 'b3f4f8fe-2222-4444-8888-0f9b4d4c1b22' })
  @IsUUID()
  printerId!: string;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  priority?: number;
}
