import { Module } from '@nestjs/common';
import { PrintEventsGateway } from './print-events.gateway';

@Module({
  providers: [PrintEventsGateway],
  exports: [PrintEventsGateway],
})
export class RealtimeModule {}
