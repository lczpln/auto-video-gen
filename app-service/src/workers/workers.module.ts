import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bull";

import { JobsModule } from "../jobs/jobs.module";
import { ContentProcessor } from "./processors/content.processor";
import { AudioProcessor } from "./processors/audio.processor";
import { ImageProcessor } from "./processors/image.processor";
// import { VideoProcessor } from "../../apps/worker/src/processors/video.processor";
import { RegenerateImageProcessor } from "./processors/regenerate-image.processor";
import { RegenerateAudioProcessor } from "./processors/regenerate-audio.processor";
import { ContentService } from "./services/content.service";
import { AudioService } from "./services/audio.service";
import { ImageService } from "./services/image.service";
import { VideoService } from "../../apps/worker/src/services/video.service";
import { FfmpegService } from "apps/worker/src/services/ffmpeg.service";

@Module({
  imports: [
    BullModule.registerQueue({
      name: "video-processing",
    }),
    JobsModule,
  ],
  providers: [
    // Processors
    ContentProcessor,
    AudioProcessor,
    ImageProcessor,
    // VideoProcessor,
    RegenerateImageProcessor,
    RegenerateAudioProcessor,

    // Services
    ContentService,
    AudioService,
    ImageService,
    VideoService,
    FfmpegService,
  ],
})
export class WorkersModule {}
