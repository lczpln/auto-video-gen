import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { LoggerService } from "../../common/services/logger.service";
import * as path from "path";
import * as fs from "fs/promises";
import axios from "axios";
import { randomUUID } from "crypto";

@Injectable()
export class ImageService {
  private readonly logger;
  private readonly storagePath: string;
  private readonly maxRetries: number = 3;
  private readonly retryDelay: number = 3000; // 3 seconds
  private readonly imageApiUrl: string;

  constructor(
    private configService: ConfigService,
    private loggerService: LoggerService
  ) {
    this.logger = this.loggerService.getLogger("image-service");
    this.storagePath = this.configService.get<string>(
      "STORAGE_PATH",
      "./storage"
    );
    this.imageApiUrl = this.configService.get<string>(
      "IMAGE_API_URL",
      "https://image.pollinations.ai/prompt/"
    );
  }

  /**
   * Generate multiple images based on job content
   */
  async generateImages(
    jobId: string,
    content: any,
    overridePrompt?: string
  ): Promise<string[]> {
    this.logger.info(`Generating images for job: ${jobId}`);

    // Ensure images directory exists
    const imagesPath = path.join(this.storagePath, "images", jobId);
    await fs.mkdir(imagesPath, { recursive: true });

    // Generate image URLs array
    const imageUrls: string[] = [];

    // Extract image prompts from content
    const imagePrompts = this.extractImagePrompts(content, overridePrompt);

    if (imagePrompts.length === 0) {
      this.logger.error(`No image prompts generated for job ${jobId}`);
      throw new Error(`No image prompts could be generated from content`);
    }

    // Generate each image
    for (let i = 0; i < imagePrompts.length; i++) {
      const prompt = imagePrompts[i];
      this.logger.info(
        `Processing image ${i + 1}/${imagePrompts.length} for job ${jobId}`
      );

      // Generate image with retries - will throw error if all retries fail
      const imageUrl = await this.generateSingleImageWithRetries(
        jobId,
        prompt,
        i
      );

      imageUrls.push(imageUrl);
      this.logger.info(
        `Image ${i + 1}/${imagePrompts.length} generated successfully for job ${jobId}`
      );
    }

    this.logger.info(`Images generated: ${imageUrls.length}`);
    return imageUrls;
  }

  /**
   * Generate a single image based on content and index
   */
  async generateSingleImage(
    jobId: string,
    content: any,
    overridePrompt?: string,
    imageIndex?: number
  ): Promise<string> {
    this.logger.info(
      `Generating single image for job: ${jobId} at index: ${imageIndex}`
    );

    // Extract image prompts from content
    const imagePrompts = this.extractImagePrompts(content, overridePrompt);

    // Ensure the index is valid
    if (
      imageIndex !== undefined &&
      (imageIndex < 0 || imageIndex >= imagePrompts.length)
    ) {
      throw new Error(
        `Invalid image index: ${imageIndex}. Must be between 0 and ${
          imagePrompts.length - 1
        }`
      );
    }

    // Determine which prompt to use
    const prompt =
      imageIndex !== undefined
        ? imagePrompts[imageIndex]
        : overridePrompt || content.title || "Generic image";

    // Generate image with retries
    return await this.generateSingleImageWithRetries(
      jobId,
      prompt,
      imageIndex || 0
    );
  }

  /**
   * Extract image prompts from content
   */
  private extractImagePrompts(content: any, overridePrompt?: string): string[] {
    if (overridePrompt) {
      // If an override prompt is provided, use it for all images
      return content.scenes?.map(() => overridePrompt) || [overridePrompt];
    }

    if (content.scenes && Array.isArray(content.scenes)) {
      // Extract prompts from content scenes
      return content.scenes.map((scene: any) => {
        return (
          scene.image ||
          `Scene about ${scene.text?.substring(0, 50) || "unknown content"}`
        );
      });
    }

    // Fallback if no scenes
    return [content.title || "Generic image"];
  }

  /**
   * Generate a single image with retries
   */
  private async generateSingleImageWithRetries(
    jobId: string,
    prompt: string,
    index: number
  ): Promise<string> {
    let lastError;

    // Try multiple times to generate the image
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        this.logger.info(
          `Attempt ${attempt}/${this.maxRetries} to generate image for prompt: ${prompt.substring(
            0,
            50
          )}...`
        );

        return await this.generateImageWithAPI(jobId, prompt, index, attempt);
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `Image generation attempt ${attempt} failed: ${error.message}`
        );

        // Wait before retrying
        if (attempt < this.maxRetries) {
          const waitTime = this.retryDelay * Math.min(attempt, 3); // Exponential but capped
          this.logger.info(
            `Waiting ${waitTime / 1000} seconds before retry...`
          );
          await new Promise((resolve) =>
            setTimeout(resolve, waitTime * attempt)
          );
        }
      }
    }

    // If we got here, all attempts failed
    this.logger.error(
      `Failed to generate image for index ${index} after all ${this.maxRetries} retries`
    );
    throw (
      lastError ||
      new Error(`Failed to generate image after ${this.maxRetries} retries`)
    );
  }

  /**
   * Generate image using an image generation API
   */
  private async generateImageWithAPI(
    jobId: string,
    prompt: string,
    index: number,
    attempt: number
  ): Promise<string> {
    // Ensure images directory exists
    const imagesPath = path.join(this.storagePath, "images", jobId);
    await fs.mkdir(imagesPath, { recursive: true });

    // Create a unique filename
    const timestamp = Date.now();
    const uuid = randomUUID().substring(0, 8);
    const imageFileName = `${jobId}-image-${index}-${timestamp}-${uuid}.jpg`;
    const imageFilePath = path.join(imagesPath, imageFileName);

    // Log API call
    this.logger.info(
      `Calling image API for prompt: "${prompt.substring(0, 30)}..."`
    );

    const useAI = this.configService.get<boolean>("USE_AI_IMAGES", true);

    if (useAI) {
      const width = 1080 * 2;
      const height = 1920 * 2;
      const model = "flux";
      const seed = Math.floor(Math.random() * 100000000000);
      const apiUrl = `${this.imageApiUrl}${encodeURIComponent(prompt)}?nologo=true&width=${width}&height=${height}&model=${model}&seed=${seed}`;

      const response = await axios.get(apiUrl, {
        responseType: "arraybuffer",
      });

      // Verify we received valid image data
      if (!response.data || response.data.length < 100) {
        throw new Error("Invalid image data received from API");
      }

      // Save the image file
      await fs.writeFile(imageFilePath, response.data);
      this.logger.info(`Image saved to: ${imageFilePath}`);
    } else {
      // Create placeholder for testing/development
      await this.createPlaceholderImage(imageFilePath, prompt, attempt);
    }

    // Verify the file was created
    const stats = await fs.stat(imageFilePath);
    if (stats.size < 100) {
      throw new Error("Generated image file is too small, may be corrupted");
    }

    // Return the URL to access the image
    return `/storage/images/${jobId}/${imageFileName}`;
  }

  /**
   * Create a placeholder image for development/testing
   */
  private async createPlaceholderImage(
    filePath: string,
    prompt: string,
    attempt: number
  ): Promise<void> {
    try {
      // In a real implementation, this would call an image generation API
      // For now, just write a text file to simulate the process
      const content = `Generated Image (Attempt ${attempt})
Prompt: ${prompt}
Generated at: ${new Date().toISOString()}`;

      await fs.writeFile(filePath, content);

      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      throw new Error(`Failed to create placeholder image: ${error.message}`);
    }
  }
}
