import { PartialType } from '@nestjs/swagger';
import { CreatePrintLocationDto } from './create-print-locations.dto';

export class UpdatePrintLocationDto extends PartialType(CreatePrintLocationDto) {}
