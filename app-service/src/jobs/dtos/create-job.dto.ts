import { IsNotEmpty, IsString, IsOptional } from "class-validator";

export class CreateJobDto {
  @IsString()
  @IsNotEmpty()
  prompt: string;

  @IsOptional()
  options?: Record<string, any>;
}
