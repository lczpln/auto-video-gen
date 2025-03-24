import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { LoggerService } from '../../common/services/logger.service';
import { AudioService } from '../services/audio.service';
import { JobsService } from '../../jobs/jobs.service';
import { JobStatus } from '../../jobs/models/job.schema';

@Processor('video-processing')
export class AudioProcessor {
  private readonly logger;

  constructor(
    private readonly audioService: AudioService,
    private readonly jobsService: JobsService,
    private readonly loggerService: LoggerService,
  ) {
    this.logger = this.loggerService.getLogger('audio-processor');
  }

  @Process('audio')
  async processAudio(job: Job) {
    try {
      const { jobId, content } = job.data;
      this.logger.info(`Processing audio for job: ${jobId}`);

      // Generate audio using the audio service
      const audioUrls = await this.audioService.generateAudio(jobId, content);

      // Update job audio URLs
      await this.jobsService.updateJobAudioUrls(jobId, audioUrls);

      // Mark worker as completed
      const updatedJob = await this.jobsService.addCompletedWorker(jobId, 'audio');

      this.logger.info(`Audio processing completed for job: ${jobId}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Error processing audio: ${error.message}`);
      
      // Update job status to ERROR
      await this.jobsService.updateJobStatus(
        job.data.jobId, 
        JobStatus.ERROR, 
        `Audio processing error: ${error.message}`
      );
      
      throw error;
    }
  }
} 