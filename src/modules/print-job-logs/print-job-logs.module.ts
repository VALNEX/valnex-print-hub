import { Module } from '@nestjs/common';
import { PrintJobLogsService } from './print-job-logs.service';
import { PrintJobLogsController } from './print-job-logs.controller';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [RealtimeModule],
  controllers: [PrintJobLogsController],
  providers: [PrintJobLogsService],
  exports: [PrintJobLogsService],
})
export class PrintJobLogsModule {}