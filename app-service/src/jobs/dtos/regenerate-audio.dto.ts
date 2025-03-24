import { IsOptional, IsNumber, IsString } from "class-validator";

export class RegenerateAudioDto {
  /**
   * Index of the audio to regenerate. If not provided, all audios will be regenerated.
   */
  @IsOptional()
  @IsNumber()
  audioIndex?: number;

  /**
   * Optional custom text to use for audio generation
   */
  @IsOptional()
  @IsString()
  text?: string;
}
