import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { LoggerService } from '../../common/services/logger.service';
import { VideoService } from '../services/video.service';
import { JobsService } from '../../jobs/jobs.service';
import { JobStatus } from '../../jobs/models/job.schema';

@Processor('video-processing')
export class VideoProcessor {
  private readonly logger;

  constructor(
    private readonly videoService: VideoService,
    private readonly jobsService: JobsService,
    private readonly loggerService: LoggerService,
  ) {
    this.logger = this.loggerService.getLogger('video-processor');
  }

  @Process('video')
  async processVideo(job: Job) {
    try {
      const { jobId } = job.data;
      this.logger.info(`Processing video for job: ${jobId}`);

      // Update job status to GENERATING_VIDEO
      await this.jobsService.updateJobStatus(jobId, JobStatus.GENERATING_VIDEO);

      // Get job details
      const jobDetails = await this.jobsService.getJob(jobId);
      const { audioUrls, imageUrls } = jobDetails;

      // Generate video using the video service
      const videoUrl = await this.videoService.generateVideo(jobId, audioUrls, imageUrls);

      // Update job video URL
      await this.jobsService.updateJobVideoUrl(jobId, videoUrl);

      // Mark worker as completed
      await this.jobsService.addCompletedWorker(jobId, 'video');

      // Update job status to COMPLETED
      await this.jobsService.updateJobStatus(jobId, JobStatus.COMPLETED);

      this.logger.info(`Video processing completed for job: ${jobId}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Error processing video: ${error.message}`);
      
      // Update job status to ERROR
      await this.jobsService.updateJobStatus(
        job.data.jobId, 
        JobStatus.ERROR, 
        `Video processing error: ${error.message}`
      );
      
      throw error;
    }
  }
} 