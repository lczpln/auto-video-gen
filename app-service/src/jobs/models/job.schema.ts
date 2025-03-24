import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type JobDocument = Job & Document;

export enum JobStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  GENERATING_ASSETS = 'GENERATING_ASSETS',
  READY = 'READY',
  APPROVED = 'APPROVED',
  GENERATING_VIDEO = 'GENERATING_VIDEO',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
  FAILED = 'FAILED',
}

@Schema({ timestamps: true })
export class Job {
  @Prop({ unique: true })
  id: string;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(JobStatus),
    default: JobStatus.PENDING,
  })
  status: JobStatus;

  @Prop({ required: true })
  prompt: string;

  @Prop({ type: Object, default: {} })
  options: Record<string, any>;

  @Prop({ type: Object, default: null })
  content: {
    title?: string;
    text?: string;
    [key: string]: any;
  };

  @Prop({ type: [String], default: [] })
  audioUrls: string[];

  @Prop({ type: [String], default: [] })
  imageUrls: string[];

  @Prop({ type: String, default: null })
  videoUrl: string;

  @Prop({ type: [String], default: [] })
  workers: string[];

  @Prop({ type: [String], default: [] })
  completedWorkers: string[];

  @Prop({ type: String, default: null })
  error: string;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const JobSchema = SchemaFactory.createForClass(Job);

// Add index on id field
JobSchema.index({ id: 1 }, { unique: true });

// Add hooks to update id field from _id
JobSchema.pre('save', function(next) {
  if (!this.id) {
    this.id = this._id.toString();
  }
  next();
}); 