import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { PrintLocationsModule } from './modules/print-locations/print-locations.module';
import { PrintDevicesModule } from './modules/print-devices/print-devices.module';
import { PrintSourcesModule } from './modules/print-sources/print-sources.module';
import { PrintRoutingRulesModule } from './modules/print-routing-rules/print-routing-rules.module';
import { PrintJobsModule } from './modules/print-jobs/print-jobs.module';
import { PrintJobLogsModule } from './modules/print-job-logs/print-job-logs.module';
import { PublicPrintModule } from './modules/public-print/public-print.module';
import { RedisModule } from './modules/redis/redis.module';

@Module({
  imports: [
    RedisModule,
    AuthModule,
    PrismaModule,
    TenantsModule,
    PrintLocationsModule,
    PrintDevicesModule,
    PrintSourcesModule,
    PrintRoutingRulesModule,
    PrintJobsModule,
    PrintJobLogsModule,
    PublicPrintModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
