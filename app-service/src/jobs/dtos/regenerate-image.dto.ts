import { IsNumber, IsOptional, IsString, Min } from "class-validator";

export class RegenerateImageDto {
  /**
   * Index of the image to regenerate. If not provided, all images will be regenerated.
   */
  @IsNumber()
  @Min(0)
  @IsOptional()
  imageIndex?: number;

  /**
   * Optional prompt override for image generation
   */
  @IsString()
  @IsOptional()
  prompt?: string;
}
