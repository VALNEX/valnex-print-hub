import { Module } from '@nestjs/common';
import { PrintJobsModule } from '../print-jobs/print-jobs.module';
import { PublicPrintController } from './public-print.controller';
import { PublicPrintService } from './public-print.service';

@Module({
  imports: [PrintJobsModule],
  controllers: [PublicPrintController],
  providers: [PublicPrintService],
})
export class PublicPrintModule {}
