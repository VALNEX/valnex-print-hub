import { PartialType } from '@nestjs/swagger';
import { CreatePrintJobDto } from './create-print-jobs.dto';

export class UpdatePrintJobDto extends PartialType(CreatePrintJobDto) {}
