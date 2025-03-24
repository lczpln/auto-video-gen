import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { InjectQueue } from "@nestjs/bull";
import { Queue } from "bull";

import { Job, JobDocument, JobStatus } from "./models/job.schema";
import { CreateJobDto } from "./dtos/create-job.dto";
import { JobResponseDto } from "./dtos/job-response.dto";
import { LoggerService } from "../common/services/logger.service";
import { RegenerateImageDto } from "./dtos/regenerate-image.dto";
import { RegenerateAudioDto } from "./dtos/regenerate-audio.dto";

@Injectable()
export class JobsService {
  private readonly logger;
  private readonly AVAILABLE_WORKERS = ["content", "audio", "image", "video"];

  constructor(
    @InjectModel(Job.name) private jobModel: Model<JobDocument>,
    @InjectQueue("video-processing") private videoProcessingQueue: Queue,
    private loggerService: LoggerService
  ) {
    this.logger = this.loggerService.getLogger("jobs-service");
  }

  async createJob(createJobDto: CreateJobDto): Promise<JobResponseDto> {
    const { prompt, options } = createJobDto;

    // Create a new job document
    const job = new this.jobModel({
      prompt,
      options: options || {},
      status: JobStatus.PENDING,
      workers: this.AVAILABLE_WORKERS,
      completedWorkers: [],
    });

    // Save the job
    await job.save();
    this.logger.info(`Job created with ID: ${job.id}`);

    // Add job to the queue - start with content worker
    await this.videoProcessingQueue.add("content", {
      jobId: job.id,
      prompt,
      options,
    });

    return {
      jobId: job.id,
      status: job.status,
    };
  }

  async getJob(jobId: string): Promise<JobResponseDto> {
    const job = await this.jobModel.findOne({ id: jobId });

    if (!job) {
      throw new Error(`Job not found with ID: ${jobId}`);
    }

    return {
      jobId: job.id,
      status: job.status,
      prompt: job.prompt,
      content: job.content,
      audioUrls: job.audioUrls,
      imageUrls: job.imageUrls,
      videoUrl: job.videoUrl,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      error: job.error,
    };
  }

  async approveJob(jobId: string): Promise<boolean> {
    const job = await this.jobModel.findOne({ id: jobId });

    if (!job) {
      this.logger.error(`Job not found with ID: ${jobId}`);
      return false;
    }

    if (job.status !== JobStatus.READY) {
      this.logger.error(
        `Job ${jobId} is not in READY status, current status: ${job.status}`
      );
      return false;
    }

    // Update job status to APPROVED
    job.status = JobStatus.APPROVED;
    job.updatedAt = new Date();
    await job.save();

    // Queue the video worker
    await this.videoProcessingQueue.add("video", { jobId });
    this.logger.info(`Job ${jobId} approved for video generation`);

    return true;
  }

  async generateVideo(jobId: string): Promise<boolean> {
    const job = await this.jobModel.findOne({ id: jobId });

    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    if (job.status !== JobStatus.READY) {
      throw new BadRequestException(
        `Job must be in READY status to generate video. Current status: ${job.status}`
      );
    }

    // Update job status to GENERATING_VIDEO
    await this.updateJobStatus(jobId, JobStatus.GENERATING_VIDEO);

    // Add job to video queue
    await this.videoProcessingQueue.add("video", { jobId });

    this.logger.info(`Added job ${jobId} to video queue`);
    return true;
  }

  async regenerateImage(
    jobId: string,
    regenerateOptions: RegenerateImageDto
  ): Promise<boolean> {
    const job = await this.jobModel.findOne({ id: jobId });

    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    // Allow regeneration for jobs that are in READY, COMPLETED, or ERROR status
    const allowedStatuses = [
      JobStatus.READY,
      JobStatus.COMPLETED,
      JobStatus.ERROR,
    ];
    if (!allowedStatuses.includes(job.status)) {
      throw new BadRequestException(
        `Job must be in one of these statuses to regenerate images: ${allowedStatuses.join(", ")}. Current status: ${job.status}`
      );
    }

    if (!job.content) {
      throw new BadRequestException(
        "Job has no content available for image generation"
      );
    }

    const { imageIndex, prompt: overridePrompt } = regenerateOptions;

    // Add job to image regeneration queue
    await this.videoProcessingQueue.add("regenerate-image", {
      jobId,
      imageIndex,
      overridePrompt,
    });

    this.logger.info(
      `Added job ${jobId} to regenerate-image queue${
        imageIndex !== undefined
          ? ` for image index ${imageIndex}`
          : " for all images"
      }`
    );
    return true;
  }

  async regenerateAudio(
    jobId: string,
    regenerateOptions: RegenerateAudioDto
  ): Promise<boolean> {
    const job = await this.jobModel.findOne({ id: jobId });

    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    // Allow regeneration for jobs that are in READY, COMPLETED, or ERROR status
    const allowedStatuses = [
      JobStatus.READY,
      JobStatus.COMPLETED,
      JobStatus.ERROR,
    ];
    if (!allowedStatuses.includes(job.status)) {
      throw new BadRequestException(
        `Job must be in one of these statuses to regenerate audios: ${allowedStatuses.join(", ")}. Current status: ${job.status}`
      );
    }

    if (!job.content) {
      throw new BadRequestException(
        "Job has no content available for audio generation"
      );
    }

    const { audioIndex, text } = regenerateOptions;

    // Add job to audio regeneration queue
    await this.videoProcessingQueue.add("regenerate-audio", {
      jobId,
      audioIndex,
      text,
    });

    this.logger.info(
      `Added job ${jobId} to regenerate-audio queue${
        audioIndex !== undefined
          ? ` for audio index ${audioIndex}`
          : " for all audios"
      }`
    );
    return true;
  }

  async listJobs(
    limit: number = 10,
    skip: number = 0,
    status?: JobStatus
  ): Promise<{ jobs: JobResponseDto[]; total: number }> {
    // Build the query
    const query: any = {};
    if (status) {
      query.status = status;
    }

    // Find jobs
    const jobs = await this.jobModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Count total jobs
    const total = await this.jobModel.countDocuments(query);

    return {
      jobs: jobs.map((job) => ({
        jobId: job.id,
        status: job.status,
        prompt: job.prompt,
        videoUrl: job.videoUrl,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      })),
      total,
    };
  }

  async updateJobStatus(
    jobId: string,
    status: JobStatus,
    error?: string
  ): Promise<void> {
    const updateData: any = { status, updatedAt: new Date() };

    if (error) {
      updateData.error = error;
    }

    await this.jobModel.findOneAndUpdate({ id: jobId }, { $set: updateData });

    this.logger.info(`Job ${jobId} status updated to ${status}`);
  }

  async addCompletedWorker(jobId: string, worker: string): Promise<Job> {
    const job = await this.jobModel.findOne({ id: jobId });

    if (!job) {
      throw new Error(`Job not found with ID: ${jobId}`);
    }

    // Add worker to completed workers if not already there
    if (!job.completedWorkers.includes(worker)) {
      job.completedWorkers.push(worker);
    }

    // Check if all assets are generated (except video)
    const assetWorkers = this.AVAILABLE_WORKERS.filter((w) => w !== "video");
    const allAssetWorkersCompleted = assetWorkers.every((w) =>
      job.completedWorkers.includes(w)
    );

    // Update status based on worker completion
    if (worker === "content") {
      // After content, update to PROCESSING
      job.status = JobStatus.GENERATING_ASSETS;
    } else if (allAssetWorkersCompleted && job.status !== JobStatus.READY) {
      // All asset workers completed, update to READY
      job.status = JobStatus.READY;
    } else if (worker === "video" && job.status !== JobStatus.COMPLETED) {
      // Video completed, update to COMPLETED
      job.status = JobStatus.COMPLETED;
    }

    job.updatedAt = new Date();
    await job.save();

    return job;
  }

  async updateJobContent(jobId: string, content: any): Promise<void> {
    await this.jobModel.findOneAndUpdate(
      { id: jobId },
      { $set: { content, updatedAt: new Date() } }
    );
  }

  async updateJobAudioUrls(jobId: string, audioUrls: string[]): Promise<void> {
    await this.jobModel.findOneAndUpdate(
      { id: jobId },
      { $set: { audioUrls, updatedAt: new Date() } }
    );
  }

  async updateJobImageUrls(jobId: string, imageUrls: string[]): Promise<void> {
    await this.jobModel.findOneAndUpdate(
      { id: jobId },
      { $set: { imageUrls, updatedAt: new Date() } }
    );
  }

  async updateJobVideoUrl(jobId: string, videoUrl: string): Promise<void> {
    await this.jobModel.findOneAndUpdate(
      { id: jobId },
      { $set: { videoUrl, updatedAt: new Date() } }
    );
  }

  async updateImageUrl(
    jobId: string,
    imageIndex: number,
    imageUrl: string
  ): Promise<void> {
    const job = await this.jobModel.findOne({ id: jobId });

    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    if (!job.imageUrls || job.imageUrls.length <= imageIndex) {
      throw new BadRequestException(
        `Image index ${imageIndex} is out of bounds for job ${jobId}`
      );
    }

    // Create a copy of the image URLs array
    const imageUrls = [...job.imageUrls];

    // Update the specific image URL
    imageUrls[imageIndex] = imageUrl;

    // Update the job with the new image URLs
    await this.jobModel.updateOne({ id: jobId }, { imageUrls });

    this.logger.info(
      `Updated image URL at index ${imageIndex} for job ${jobId}`
    );
  }
}
