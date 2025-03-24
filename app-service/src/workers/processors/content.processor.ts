import { Process, Processor } from "@nestjs/bull";
import { Job } from "bull";
import { InjectQueue } from "@nestjs/bull";
import { Queue } from "bull";
import { LoggerService } from "../../common/services/logger.service";
import { ContentService } from "../services/content.service";
import { JobsService } from "../../jobs/jobs.service";
import { JobStatus } from "../../jobs/models/job.schema";

@Processor("video-processing")
export class ContentProcessor {
  private readonly logger;

  constructor(
    private readonly contentService: ContentService,
    private readonly jobsService: JobsService,
    private readonly loggerService: LoggerService,
    @InjectQueue("video-processing") private videoProcessingQueue: Queue
  ) {
    this.logger = this.loggerService.getLogger("content-processor");
  }

  @Process("content")
  async processContent(job: Job) {
    try {
      const { jobId, prompt, options } = job.data;
      this.logger.info(`Processing content job: ${jobId}`);

      // Update job status to PROCESSING
      await this.jobsService.updateJobStatus(jobId, JobStatus.PROCESSING);

      // Generate content using the content service
      const content = await this.contentService.generateContent(
        prompt,
        options
      );

      // Update job content
      await this.jobsService.updateJobContent(jobId, content);

      // Mark worker as completed
      await this.jobsService.addCompletedWorker(jobId, "content");

      // Start audio and image workers in parallel
      await this.videoProcessingQueue.add("audio", { jobId, content });
      await this.videoProcessingQueue.add("image", { jobId, content });

      this.logger.info(`Content processing completed for job: ${jobId}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Error processing content: ${error.message}`);

      // Update job status to ERROR
      await this.jobsService.updateJobStatus(
        job.data.jobId,
        JobStatus.ERROR,
        `Content processing error: ${error.message}`
      );

      throw error;
    }
  }
}
