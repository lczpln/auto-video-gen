import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { LoggerService } from '../../common/services/logger.service';
import { ImageService } from '../services/image.service';
import { JobsService } from '../../jobs/jobs.service';
import { JobStatus } from '../../jobs/models/job.schema';

@Processor('video-processing')
export class ImageProcessor {
  private readonly logger;

  constructor(
    private readonly imageService: ImageService,
    private readonly jobsService: JobsService,
    private readonly loggerService: LoggerService,
  ) {
    this.logger = this.loggerService.getLogger('image-processor');
  }

  @Process('image')
  async processImage(job: Job) {
    try {
      const { jobId, content } = job.data;
      this.logger.info(`Processing images for job: ${jobId}`);

      // Generate images using the image service
      const imageUrls = await this.imageService.generateImages(jobId, content);

      // Update job image URLs
      await this.jobsService.updateJobImageUrls(jobId, imageUrls);

      // Mark worker as completed
      await this.jobsService.addCompletedWorker(jobId, 'image');

      this.logger.info(`Image processing completed for job: ${jobId}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Error processing images: ${error.message}`);
      
      // Update job status to ERROR
      await this.jobsService.updateJobStatus(
        job.data.jobId, 
        JobStatus.ERROR, 
        `Image processing error: ${error.message}`
      );
      
      throw error;
    }
  }
} 