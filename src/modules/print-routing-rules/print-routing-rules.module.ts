import { Module } from '@nestjs/common';
import { PrintRoutingRulesService } from './print-routing-rules.service';
import { PrintRoutingRulesController } from './print-routing-rules.controller';

@Module({
  controllers: [PrintRoutingRulesController],
  providers: [PrintRoutingRulesService],
  exports: [PrintRoutingRulesService],
})
export class PrintRoutingRulesModule {}