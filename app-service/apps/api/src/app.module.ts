import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { BullModule } from "@nestjs/bull";
import { join } from "path";

import { JobsModule } from "../../../src/jobs/jobs.module";
import { WorkersModule } from "../../../src/workers/workers.module";
import { CommonModule } from "../../../src/common/common.module";
import { StaticFilesModule } from "../../../src/common/static.module";
import videoConfig from "../../../src/workers/video.config";

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [videoConfig],
    }),

    // MongoDB Connection
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        // Get MongoDB URI from environment with fallback
        const mongoUri = configService.get<string>(
          "MONGODB_URI",
          "mongodb://localhost:27017/auto-video-gen"
        );

        // Log the MongoDB connection for debugging
        console.log(
          `Connecting to MongoDB: ${mongoUri.replace(/\/\/([^:]+):([^@]+)@/, "//***:***@")}`
        );

        return {
          uri: mongoUri,
          useNewUrlParser: true,
          useUnifiedTopology: true,
        };
      },
    }),

    // Bull Queue Setup
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get("REDIS_HOST", "localhost"),
          port: configService.get("REDIS_PORT", 6379),
        },
        defaultJobOptions: {
          attempts: 3,
          removeOnComplete: false,
          removeOnFail: false,
        },
      }),
    }),

    // Application modules
    CommonModule,
    JobsModule,
    WorkersModule,
    StaticFilesModule,
  ],
})
export class AppModule {}
