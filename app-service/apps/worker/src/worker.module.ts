import { Module } from '@nestjs/common';
import { WorkerController } from './worker.controller';
import { WorkerService } from './worker.service';
import { ConfigService } from '@nestjs/config';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { VideoProcessor } from './processors/video.processor';
import { VideoService } from './services/video.service';
import { LoggerService } from 'src/common/services/logger.service';
import { JobsService } from 'src/jobs/jobs.service';
import { JobsModule } from 'src/jobs/jobs.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Job } from 'src/jobs/models/job.schema';
import { JobSchema } from 'src/jobs/models/job.schema';
import { FfmpegService } from './services/ffmpeg.service';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
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
    BullModule.registerQueue({
      name: 'video-processing',
    }),
    // TODO: Ideally we should not have a mongoose connection here, but in the main module
    // The worker should communicate with the main module through the queue, not through the database
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
    MongooseModule.forFeature([
      { name: Job.name, schema: JobSchema }
    ]),
  ],
  controllers: [WorkerController],
  providers: [WorkerService, VideoProcessor, VideoService, LoggerService, JobsService, FfmpegService],
})
export class WorkerModule {}
