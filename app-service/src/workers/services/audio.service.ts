import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { LoggerService } from "../../common/services/logger.service";
import * as path from "path";
import * as fs from "fs/promises";
import axios from "axios";

@Injectable()
export class AudioService {
  private readonly logger;
  readonly storagePath: string;
  private readonly useTTS: boolean;
  private readonly ttsApiUrl: string;
  private readonly maxRetries: number = 12;
  private readonly retryDelay: number = 5000;

  constructor(
    private configService: ConfigService,
    private loggerService: LoggerService
  ) {
    this.logger = this.loggerService.getLogger("audio-service");
    this.storagePath = this.configService.get<string>(
      "STORAGE_PATH",
      "./storage"
    );
    this.useTTS = this.configService.get<boolean>("USE_TTS", false);
    this.ttsApiUrl = this.configService.get<string>(
      "TTS_API_URL",
      "https://text.pollinations.ai"
    );
  }

  /**
   * Generate audio for all scenes in the content
   * @param jobId - The ID of the job
   * @param content - The content with scenes
   * @returns Array of URLs to the generated audio files
   */
  async generateAudio(jobId: string, content: any): Promise<string[]> {
    this.logger.info(`Generating audio for job: ${jobId}`);

    // Ensure audio directory exists
    const audioPath = path.join(this.storagePath, "audio", jobId);
    await fs.mkdir(audioPath, { recursive: true });

    const audioUrls = [];

    // Generate audio for each scene
    if (content && content.scenes && Array.isArray(content.scenes)) {
      for (let i = 0; i < content.scenes.length; i++) {
        const scene = content.scenes[i];
        this.logger.info(
          `Processing audio for scene ${i + 1}/${content.scenes.length} for job ${jobId}`
        );

        // Generate audio with retries - will throw error if all retries fail
        const audioUrl = await this.generateSceneAudioWithRetries(
          jobId,
          scene,
          i,
          audioPath
        );

        audioUrls.push(audioUrl);
        this.logger.info(
          `Audio ${i + 1}/${content.scenes.length} generated successfully for job ${jobId}`
        );
      }
    } else {
      // No scenes found - throw error
      this.logger.error(`No scenes found in content for job ${jobId}`);
      throw new Error(`No scenes found in content for job ${jobId}`);
    }

    this.logger.info(`Audio files generated: ${audioUrls.length}`);
    return audioUrls;
  }

  /**
   * Generate audio for a single scene with retries
   * @param jobId - The ID of the job
   * @param scene - The scene data
   * @param index - The scene index
   * @param audioPath - The path to save audio files
   * @returns URL to the generated audio file
   */
  async generateSceneAudioWithRetries(
    jobId: string,
    scene: any,
    index: number,
    audioPath: string
  ): Promise<string> {
    const sceneText = scene.text || `Scene ${index + 1}`;
    let lastError;

    // Try multiple times to generate the audio
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        this.logger.info(
          `Attempt ${attempt}/${this.maxRetries} to generate audio for scene ${index + 1}`
        );

        const audioUrl = await this.generateSceneAudio(
          jobId,
          sceneText,
          index,
          audioPath,
          attempt
        );

        // Success! Return the URL
        return audioUrl;
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `Audio generation attempt ${attempt} failed: ${error.message}`
        );

        // Wait before retrying
        if (attempt < this.maxRetries) {
          const waitTime = this.retryDelay * Math.min(attempt, 3); // Exponential but capped
          this.logger.info(
            `Waiting ${waitTime / 1000} seconds before retry...`
          );
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }
    }

    // If we get here, all attempts failed
    this.logger.error(
      `Failed to generate audio for scene ${index + 1} after all retries`
    );
    throw (
      lastError ||
      new Error(`Failed to generate audio after ${this.maxRetries} retries`)
    );
  }

  /**
   * Generate audio for a single scene
   * @param jobId - The ID of the job
   * @param sceneText - The text to convert to speech
   * @param index - The scene index
   * @param audioPath - The path to save audio files
   * @param attempt - The current attempt number
   * @returns URL to the generated audio file
   */
  private async generateSceneAudio(
    jobId: string,
    sceneText: string,
    index: number,
    audioPath: string,
    attempt: number = 1
  ): Promise<string> {
    const audioFileName = `${jobId}-scene-${index + 1}-${Date.now()}.mp3`;
    const audioFilePath = path.join(audioPath, audioFileName);

    if (this.useTTS) {
      // Configure API options
      this.logger.info(
        `Calling TTS API for text: "${sceneText.substring(0, 30)}..."`
      );

      const response = await axios.get(
        `${this.ttsApiUrl}/${encodeURIComponent(`# EXACTLY THIS TEXT: ${sceneText}`)}`,
        {
          params: {
            model: "openai-audio",
            voice: "alloy", // Default voice
          },
          responseType: "arraybuffer",
        }
      );

      // Check response
      if (!response.data || response.data.length < 100) {
        throw new Error("Invalid audio data received from TTS API");
      }

      // Save audio file
      await fs.writeFile(audioFilePath, response.data);
      this.logger.info(`TTS audio generated successfully: ${audioFilePath}`);

      // Verify the file was created
      const stats = await fs.stat(audioFilePath);
      if (stats.size < 100) {
        throw new Error("Generated audio file is too small, may be corrupted");
      }
    } else {
      // Write a placeholder file for development/testing
      await this.writePlaceholderAudio(audioFilePath, sceneText);
    }

    const audioUrl = `/storage/audio/${jobId}/${audioFileName}`;
    this.logger.info(`Generated audio for scene ${index + 1}: ${audioUrl}`);

    return audioUrl;
  }

  /**
   * Write placeholder audio content to a file
   * @param filePath - Path to write the file
   * @param text - Text that would be converted to speech
   */
  private async writePlaceholderAudio(
    filePath: string,
    text: string
  ): Promise<void> {
    const content = `Placeholder audio for: ${text}
Generated at: ${new Date().toISOString()}`;

    await fs.writeFile(filePath, content);

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  /**
   * Generate subtitles from text
   * @param jobId - The ID of the job
   * @param content - The content with scenes
   * @returns URL to the generated SRT file
   */
  async generateSubtitles(jobId: string, content: any): Promise<string> {
    try {
      this.logger.info(`Generating subtitles for job: ${jobId}`);

      const subtitlesPath = path.join(this.storagePath, "subtitles", jobId);
      await fs.mkdir(subtitlesPath, { recursive: true });

      // Generate a unique filename for the SRT file
      const timestamp = Date.now();
      const srtFileName = `${jobId}-subtitles-${timestamp}.srt`;
      const srtFilePath = path.join(subtitlesPath, srtFileName);

      let srtContent = "";
      let subtitleIndex = 1;

      // Generate subtitles from content scenes
      if (content && content.scenes && Array.isArray(content.scenes)) {
        for (let i = 0; i < content.scenes.length; i++) {
          const scene = content.scenes[i];
          const sceneText = scene.text || `Scene ${i + 1}`;

          // Simple subtitle generation (5 seconds per scene)
          const startTime = this.formatSrtTime(i * 5);
          const endTime = this.formatSrtTime((i + 1) * 5);

          srtContent += `${subtitleIndex}\n${startTime} --> ${endTime}\n${sceneText}\n\n`;
          subtitleIndex++;
        }
      } else {
        // Fallback for no scenes
        const fallbackText = content?.title || "No text available";
        srtContent += `1\n00:00:00,000 --> 00:00:05,000\n${fallbackText}\n\n`;
      }

      // Save SRT file
      await fs.writeFile(srtFilePath, srtContent);

      return `/storage/subtitles/${jobId}/${srtFileName}`;
    } catch (error) {
      this.logger.error(`Error generating subtitles: ${error.message}`);
      throw error; // Propagate the error to fail the job
    }
  }

  /**
   * Format time for SRT file (HH:MM:SS,mmm)
   * @param seconds - Time in seconds
   * @returns Formatted time string
   */
  private formatSrtTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}:${String(secs).padStart(2, "0")},${String(milliseconds).padStart(3, "0")}`;
  }
}
