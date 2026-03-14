import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { $Enums } from '../../../../generated/prisma/client.js';
import { Prisma } from '../../../../generated/prisma/client.js';
import { IsEnum, IsObject, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreatePrintJobLogDto {
  @ApiProperty({ example: 'a1f4f8fe-1111-4444-8888-0f9b4d4c1a11' })
  @IsUUID()
  tenantId!: string;

  @ApiProperty({ example: 'a1f4f8fe-2222-4444-8888-0f9b4d4c1a22' })
  @IsUUID()
  jobId!: string;

  @ApiProperty({ enum: $Enums.PrintLogEvent, example: $Enums.PrintLogEvent.sent_to_printer })
  @IsEnum($Enums.PrintLogEvent)
  event!: $Enums.PrintLogEvent;

  @ApiPropertyOptional({ example: 'info' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  level?: string;

  @ApiPropertyOptional({ example: 'Job dispatched to device' })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({ example: 'ACK_TIMEOUT' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  errorCode?: string;

  @ApiPropertyOptional({ example: { latencyMs: 123 } })
  @IsOptional()
  @IsObject()
  context?: Prisma.InputJsonValue;

}
