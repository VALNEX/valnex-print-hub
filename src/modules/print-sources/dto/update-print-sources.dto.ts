import { PartialType } from '@nestjs/swagger';
import { CreatePrintSourceDto } from './create-print-sources.dto';

export class UpdatePrintSourceDto extends PartialType(CreatePrintSourceDto) {}
