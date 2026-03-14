import { PartialType } from '@nestjs/swagger';
import { CreatePrintDeviceDto } from './create-print-devices.dto';

export class UpdatePrintDeviceDto extends PartialType(CreatePrintDeviceDto) {}
