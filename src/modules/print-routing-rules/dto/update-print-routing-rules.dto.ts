import { PartialType } from '@nestjs/swagger';
import { CreatePrintRoutingRuleDto } from './create-print-routing-rules.dto';

export class UpdatePrintRoutingRuleDto extends PartialType(CreatePrintRoutingRuleDto) {}
