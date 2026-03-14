import { ApiPropertyOptional } from '@nestjs/swagger';

export class ApiMetaDto {
  @ApiPropertyOptional({ example: 1 })
  page?: number;

  @ApiPropertyOptional({ example: 25 })
  pageSize?: number;
}

export function buildSuccessResponse<T>(
  path: string,
  message: string,
  data: T,
  meta?: ApiMetaDto,
) {
  return {
    success: true,
    message,
    data,
    meta,
    timestamp: new Date().toISOString(),
    path,
  };
}