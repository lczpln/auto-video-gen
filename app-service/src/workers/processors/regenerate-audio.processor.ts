import { Process, Processor } from "@nestjs/bull";
import { Job } from "bull";
import { LoggerService } from "../../common/services/logger.service";
import { AudioService } from "../services/audio.service";
import { JobsService } from "../../jobs/jobs.service";
import { JobStatus } from "../../jobs/models/job.schema";

@Processor("video-processing")
export class RegenerateAudioProcessor {
  private readonly logger;

  constructor(
    private readonly audioService: AudioService,
    private readonly jobsService: JobsService,
    private readonly loggerService: LoggerService
  ) {
    this.logger = this.loggerService.getLogger("regenerate-audio-processor");
  }

  @Process("regenerate-audio")
  async regenerateAudio(job: Job) {
    try {
      const { jobId, audioIndex, text } = job.data;
      this.logger.info(
        `Regenerating audio for job: ${jobId}, index: ${audioIndex !== undefined ? audioIndex : "all"}`
      );

      // Get the job to access content
      const jobData = await this.jobsService.getJob(jobId);
      if (!jobData || !jobData.content) {
        throw new Error(`Could not find content for job: ${jobId}`);
      }

      // Update job status to GENERATING_ASSETS to indicate work in progress
      await this.jobsService.updateJobStatus(
        jobId,
        JobStatus.GENERATING_ASSETS
      );
      this.logger.info(
        `Set job ${jobId} status to GENERATING_ASSETS for audio regeneration`
      );

      // If we have a custom text, temporarily update the content
      let modifiedContent = { ...jobData.content };
      if (audioIndex !== undefined && text) {
        if (modifiedContent.scenes && modifiedContent.scenes[audioIndex]) {
          modifiedContent.scenes[audioIndex].text = text;
          this.logger.info(
            `Using custom text for audio at index ${audioIndex}: "${text.substring(0, 30)}..."`
          );
        }
      }

      // Generate a single audio if an index is provided, otherwise regenerate all
      if (audioIndex !== undefined && audioIndex !== null) {
        // Find the scene that corresponds to this audio index
        if (!modifiedContent.scenes || !modifiedContent.scenes[audioIndex]) {
          throw new Error(`Invalid audio index: ${audioIndex}`);
        }

        // Extract the scene
        const scene = modifiedContent.scenes[audioIndex];

        // Generate just one audio
        const audioPath = await this.audioService.generateSceneAudioWithRetries(
          jobId,
          scene,
          audioIndex,
          `${this.audioService.storagePath}/audio/${jobId}`
        );

        // Update just that audio URL in the job's audio URLs array
        const audioUrls = [...(jobData.audioUrls || [])];

        // Make sure we have enough elements in the array
        while (audioUrls.length <= audioIndex) {
          audioUrls.push(null);
        }

        audioUrls[audioIndex] = audioPath;
        await this.jobsService.updateJobAudioUrls(jobId, audioUrls);

        this.logger.info(
          `Regenerated audio at index ${audioIndex} for job: ${jobId}`
        );
      } else {
        // Regenerate all audios
        const audioUrls = await this.audioService.generateAudio(
          jobId,
          modifiedContent
        );

        // Update all audio URLs
        await this.jobsService.updateJobAudioUrls(jobId, audioUrls);

        this.logger.info(
          `Regenerated all ${audioUrls.length} audios for job: ${jobId}`
        );
      }

      // Mark audio worker as completed again
      await this.jobsService.addCompletedWorker(jobId, "audio");
      this.logger.info(`Marked audio worker as completed for job: ${jobId}`);

      return { success: true };
    } catch (error) {
      this.logger.error(`Error regenerating audio: ${error.message}`);

      // Update job status to ERROR
      await this.jobsService.updateJobStatus(
        job.data.jobId,
        JobStatus.ERROR,
        `Audio regeneration error: ${error.message}`
      );

      throw error;
    }
  }
}
