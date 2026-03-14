import { Module } from '@nestjs/common';
import { PrintLocationsService } from './print-locations.service';
import { PrintLocationsController } from './print-locations.controller';

@Module({
  controllers: [PrintLocationsController],
  providers: [PrintLocationsService],
  exports: [PrintLocationsService],
})
export class PrintLocationsModule {}