import { Process, Processor } from "@nestjs/bull";
import { Job } from "bull";
import { LoggerService } from "../../common/services/logger.service";
import { ImageService } from "../services/image.service";
import { JobsService } from "../../jobs/jobs.service";
import { JobStatus } from "../../jobs/models/job.schema";

@Processor("video-processing")
export class RegenerateImageProcessor {
  private readonly logger;

  constructor(
    private readonly imageService: ImageService,
    private readonly jobsService: JobsService,
    private readonly loggerService: LoggerService
  ) {
    this.logger = this.loggerService.getLogger("regenerate-image-processor");
  }

  @Process("regenerate-image")
  async regenerateImage(job: Job) {
    try {
      const { jobId, imageIndex, overridePrompt } = job.data;
      this.logger.info(
        `Regenerating image for job: ${jobId}, index: ${imageIndex !== undefined ? imageIndex : "all"}`
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
        `Set job ${jobId} status to GENERATING_ASSETS for image regeneration`
      );

      // Generate a single image if an index is provided, otherwise regenerate all
      if (imageIndex !== undefined && imageIndex !== null) {
        // Generate just one image
        const imageUrl = await this.imageService.generateSingleImage(
          jobId,
          jobData.content,
          overridePrompt,
          imageIndex
        );

        // Update just that image URL in the job
        await this.jobsService.updateImageUrl(jobId, imageIndex, imageUrl);

        this.logger.info(
          `Regenerated image at index ${imageIndex} for job: ${jobId}`
        );
      } else {
        // Regenerate all images
        const imageUrls = await this.imageService.generateImages(
          jobId,
          jobData.content,
          overridePrompt
        );

        // Update all image URLs
        await this.jobsService.updateJobImageUrls(jobId, imageUrls);

        this.logger.info(
          `Regenerated all ${imageUrls.length} images for job: ${jobId}`
        );
      }

      // Mark image worker as completed again
      await this.jobsService.addCompletedWorker(jobId, "image");
      this.logger.info(`Marked image worker as completed for job: ${jobId}`);

      return { success: true };
    } catch (error) {
      this.logger.error(`Error regenerating image: ${error.message}`);

      // Update job status to ERROR
      await this.jobsService.updateJobStatus(
        job.data.jobId,
        JobStatus.ERROR,
        `Image regeneration error: ${error.message}`
      );

      throw error;
    }
  }
}
