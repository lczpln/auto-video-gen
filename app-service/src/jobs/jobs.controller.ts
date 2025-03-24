import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpException,
} from "@nestjs/common";
import { JobsService } from "./jobs.service";
import { CreateJobDto } from "./dtos/create-job.dto";
import { JobResponseDto } from "./dtos/job-response.dto";
import { JobStatus } from "./models/job.schema";
import { LoggerService } from "../common/services/logger.service";
import { RegenerateImageDto } from "./dtos/regenerate-image.dto";
import { RegenerateAudioDto } from "./dtos/regenerate-audio.dto";

@Controller("jobs")
export class JobsController {
  private readonly logger;

  constructor(
    private readonly jobsService: JobsService,
    private readonly loggerService: LoggerService
  ) {
    this.logger = this.loggerService.getLogger("jobs-controller");
  }

  @Post()
  async createJob(
    @Body() createJobDto: CreateJobDto
  ): Promise<{ jobId: string; status: JobStatus; message: string }> {
    try {
      const result = await this.jobsService.createJob(createJobDto);
      return {
        jobId: result.jobId,
        status: result.status,
        message: "Job created successfully",
      };
    } catch (error) {
      this.logger.error(`Error creating job: ${error.message}`);
      throw new HttpException(
        "Failed to create job",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get(":jobId")
  async getJob(@Param("jobId") jobId: string): Promise<JobResponseDto> {
    try {
      return await this.jobsService.getJob(jobId);
    } catch (error) {
      this.logger.error(`Error getting job ${jobId}: ${error.message}`);

      if (error.message.includes("not found")) {
        throw new HttpException("Job not found", HttpStatus.NOT_FOUND);
      }

      throw new HttpException(
        "Failed to get job",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post(":jobId/approve")
  async approveJob(
    @Param("jobId") jobId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const success = await this.jobsService.approveJob(jobId);

      if (success) {
        return {
          success: true,
          message: "Job approved for video generation",
        };
      } else {
        return {
          success: false,
          message: "Failed to approve job",
        };
      }
    } catch (error) {
      this.logger.error(`Error approving job ${jobId}: ${error.message}`);
      throw new HttpException(
        "Failed to approve job",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post(":jobId/generate-video")
  async generateVideo(
    @Param("jobId") jobId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const result = await this.jobsService.generateVideo(jobId);
      return {
        success: true,
        message: "Video generation started successfully",
      };
    } catch (error) {
      this.logger.error(
        `Error generating video for job ${jobId}: ${error.message}`
      );
      return {
        success: false,
        message: error.message || "Failed to start video generation",
      };
    }
  }

  @Post(":jobId/regenerate-image")
  async regenerateImage(
    @Param("jobId") jobId: string,
    @Body() regenerateOptions: RegenerateImageDto
  ): Promise<{ success: boolean; message: string }> {
    try {
      const result = await this.jobsService.regenerateImage(
        jobId,
        regenerateOptions
      );
      const indexMsg =
        regenerateOptions.imageIndex !== undefined
          ? ` for image at index ${regenerateOptions.imageIndex}`
          : " for all images";

      return {
        success: true,
        message: `Image regeneration started successfully${indexMsg}`,
      };
    } catch (error) {
      this.logger.error(
        `Error regenerating image for job ${jobId}: ${error.message}`
      );
      return {
        success: false,
        message: error.message || "Failed to start image regeneration",
      };
    }
  }

  @Post(":jobId/regenerate-audio")
  async regenerateAudio(
    @Param("jobId") jobId: string,
    @Body() regenerateOptions: RegenerateAudioDto
  ): Promise<{ success: boolean; message: string }> {
    try {
      const result = await this.jobsService.regenerateAudio(
        jobId,
        regenerateOptions
      );
      const indexMsg =
        regenerateOptions.audioIndex !== undefined
          ? ` for audio at index ${regenerateOptions.audioIndex}`
          : " for all audios";

      return {
        success: true,
        message: `Audio regeneration started successfully${indexMsg}`,
      };
    } catch (error) {
      this.logger.error(
        `Error regenerating audio for job ${jobId}: ${error.message}`
      );
      return {
        success: false,
        message: error.message || "Failed to start audio regeneration",
      };
    }
  }

  @Get()
  async listJobs(
    @Query("limit") limit: number = 10,
    @Query("skip") skip: number = 0,
    @Query("status") status?: JobStatus
  ): Promise<{
    jobs: JobResponseDto[];
    total: number;
    limit: number;
    skip: number;
  }> {
    try {
      const { jobs, total } = await this.jobsService.listJobs(
        Number(limit),
        Number(skip),
        status
      );

      return {
        jobs,
        total,
        limit: Number(limit),
        skip: Number(skip),
      };
    } catch (error) {
      this.logger.error(`Error listing jobs: ${error.message}`);
      throw new HttpException(
        "Failed to list jobs",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
