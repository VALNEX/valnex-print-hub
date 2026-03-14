import { Module } from '@nestjs/common';
import { PrintJobsService } from './print-jobs.service';
import { PrintJobsController } from './print-jobs.controller';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [RealtimeModule],
  controllers: [PrintJobsController],
  providers: [PrintJobsService],
  exports: [PrintJobsService],
})
export class PrintJobsModule {}