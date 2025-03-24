import { IsBoolean, IsOptional } from "class-validator";

export class ApproveJobDto {
  @IsBoolean()
  @IsOptional()
  autoGenerateVideo?: boolean;
}
