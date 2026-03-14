import { PartialType } from '@nestjs/swagger';
import { CreatePrintJobLogDto } from './create-print-job-logs.dto';

export class UpdatePrintJobLogDto extends PartialType(CreatePrintJobLogDto) {}
