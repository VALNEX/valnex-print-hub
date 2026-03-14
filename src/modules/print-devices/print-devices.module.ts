import { Module } from '@nestjs/common';
import { PrintDevicesService } from './print-devices.service';
import { PrintDevicesController } from './print-devices.controller';

@Module({
  controllers: [PrintDevicesController],
  providers: [PrintDevicesService],
  exports: [PrintDevicesService],
})
export class PrintDevicesModule {}