import { Module } from '@nestjs/common';
import { PrintSourcesService } from './print-sources.service';
import { PrintSourcesController } from './print-sources.controller';

@Module({
  controllers: [PrintSourcesController],
  providers: [PrintSourcesService],
  exports: [PrintSourcesService],
})
export class PrintSourcesModule {}