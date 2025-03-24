import { JobStatus } from '../models/job.schema';

export class JobResponseDto {
  jobId: string;
  status: JobStatus;
  prompt?: string;
  content?: any;
  audioUrls?: string[];
  imageUrls?: string[];
  videoUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
  error?: string;
} 