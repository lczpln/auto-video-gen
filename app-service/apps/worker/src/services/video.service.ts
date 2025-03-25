import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { LoggerService } from "../../../../src/common/services/logger.service";
import * as path from "path";
import * as fs from "fs/promises";
import * as fsSync from "fs";
import { exec, execSync, spawn } from "child_process";
import { promisify } from "util";
import * as os from "os";
import { Scene } from "src/types/scene";
import { FfmpegService } from "./ffmpeg.service";

// Promisify exec para uso com async/await
const execPromise = promisify(exec);

// Interfaces para tipagem
interface VideoOptions {
  storagePath?: string;
  videoWidth?: number;
  videoHeight?: number;
  videoOutputDir?: string;
}

interface VideoJobData {
  id: string;
  audioUrls: string[];
  imageUrls: string[];
  content: any;
}

interface AudioSequenceItem {
  type: string;
  audio: string;
  image?: string;
  text?: string;
}

interface VideoData {
  audioSequence: AudioSequenceItem[];
  videoFileName?: string;
}

@Injectable()
export class VideoService {
  private readonly logger;
  private readonly storagePath: string;
  private readonly ffmpegPath: string;
  private readonly ffprobePath: string;
  private readonly videoWidth: number;
  private readonly videoHeight: number;
  private readonly videoOutputDir: string;

  constructor(
    private configService: ConfigService,
    private loggerService: LoggerService,
    // private jobsService: JobsService
    private ffmpegService: FfmpegService
  ) {
    this.logger = this.loggerService.getLogger("video-service");

    const videoConfig = this.configService.get("video");
    this.storagePath =
      videoConfig?.storagePath ||
      this.configService.get<string>("STORAGE_PATH", "./storage");
    this.ffmpegPath =
      process.env.FFMPEG_PATH || videoConfig?.ffmpegPath || "ffmpeg";
    this.ffprobePath =
      process.env.FFPROBE_PATH || videoConfig?.ffprobePath || "ffprobe";
    this.videoWidth = videoConfig?.videoWidth || 1080;
    this.videoHeight = videoConfig?.videoHeight || 1920;
    this.videoOutputDir = videoConfig?.videoOutputDir || "videos";

    this.logger.info(
      `Video service initialized with storage path: ${this.storagePath}`
    );
  }

  private async getAudioDuration(audioPath: string): Promise<number> {
    try {
      const cmd = `${this.ffprobePath} -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`;
      this.logger.debug(`Getting audio duration with command: \n ${cmd}`);
      const output = execSync(cmd).toString().trim();
      return parseFloat(output);
    } catch (err) {
      this.logger.error("Error getting audio duration:", err);
      return 3.0;
    }
  }

  private async createSceneVideo(
    imageFile: string,
    audioFile: string,
    outputFile: string,
    sceneDuration: number
  ): Promise<string> {
    try {
      // Criar diretório de saída se não existir
      const outputDir = path.dirname(outputFile);
      await fs.mkdir(outputDir, { recursive: true });

      await this.ffmpegService.generateSceneFromImageAndAudio(imageFile, audioFile, outputFile, {
        zoom: 1.2,
        frameRate: 30,
        fadeIn: 1.0,
        fadeOut: 1.0,
      });
      return outputFile;
    } catch (error) {
      this.logger.error("Error creating scene video:", error);
      throw error;
    }
  }

  private async generateSubtitles(
    videoFile: string,
    text: string
  ): Promise<string> {
    try {
      const videoName = path.basename(videoFile, path.extname(videoFile));
      const outputSrtFile = path.join(
        path.dirname(videoFile),
        `${videoName}.srt`
      );

      // Dynamic import do Echogarden
      const Echogarden = await import("echogarden");

      const alignOptions = {
        language: "pt-BR",
        alignerConfig: {
          method: "dtw",
          maxWordDuration: 1.5,
          minWordDuration: 0.1,
        },
        wordTimestamps: true,
        synthesisConfig: {
          voice: "pt-BR",
          engine: "espeak",
        },
      };

      const alignResult = await Echogarden.align(videoFile, text, alignOptions);

      if (!alignResult || !alignResult.timeline) {
        throw new Error("Failed to align text with video");
      }

      const srtContent = Echogarden.timelineToSubtitles(alignResult.timeline, {
        format: "srt",
        mode: "word",
        language: "pt-BR",
        maxLineCount: 1,
        // maxWordsPerLine: 3,
        // minWordsPerLine: 1,
        // lineBreakThreshold: 0.5,
      });

      await fs.writeFile(outputSrtFile, srtContent);
      return outputSrtFile;
    } catch (error) {
      this.logger.error("Error generating subtitles:", error);
      throw error;
    }
  }

  private async addSubtitlesToVideo(
    videoFile: string,
    subtitleFile: string,
    outputFile: string
  ): Promise<string> {
    try {
      const cmd = `${this.ffmpegPath} -y -i "${videoFile}" -vf "subtitles=${subtitleFile}:force_style='FontName=Inter,FontSize=13,PrimaryColour=&HFFFFFF,BackColour=&H80000000,Outline=1,Shadow=1'" -c:a copy "${outputFile}"`;
      execSync(cmd, { stdio: "inherit" });
      return outputFile;
    } catch (error) {
      this.logger.error("Error adding subtitles to video:", error);
      throw error;
    }
  }

  async generateVideo(
    jobId: string,
    audioUrls: string[],
    imageUrls: string[],
    scenes: Scene[]
  ): Promise<string> {
    try {
      this.logger.info(`Generating video for job: ${jobId}`);

      if (!scenes) {
        throw new Error(`Job ${jobId} has no scenes`);
      }

      const tempDir = path.join(
        this.storagePath,
        this.videoOutputDir,
        `temp_${jobId}_${Date.now()}`
      );
      await fs.mkdir(tempDir, { recursive: true });

      // Gerar vídeos para cada cena
      const sceneVideos = [];
      for (let i = 0; i < audioUrls.length; i++) {
        const audioPath = audioUrls[i].startsWith("/storage/")
          ? path.join(this.storagePath, audioUrls[i].substring(9))
          : audioUrls[i];

        const imagePath = imageUrls[i]?.startsWith("/storage/")
          ? path.join(this.storagePath, imageUrls[i].substring(9))
          : imageUrls[i];

        const sceneDuration = (await this.getAudioDuration(audioPath)) + 1; // +1s para transição
        const sceneOutput = path.join(tempDir, `scene_${i}.mp4`);

        await this.createSceneVideo(
          imagePath,
          audioPath,
          sceneOutput,
          sceneDuration
        );
        sceneVideos.push(sceneOutput);
        break;
      }

      // Concatenar todos os vídeos
      const rawVideoPath = path.join(tempDir, "raw_video.mp4");
      await this.ffmpegService.concatenateVideos(sceneVideos, rawVideoPath);

      // Gerar legendas
      const fullText = scenes
        .map((scene) => scene.text)
        .filter(Boolean)
        .join(" ");

      const srtFile = await this.generateSubtitles(rawVideoPath, fullText);

      // Adicionar legendas ao vídeo final
      const finalVideoName = `video_${jobId}_${Date.now()}.mp4`;
      const finalVideoPath = path.join(
        this.storagePath,
        this.videoOutputDir,
        finalVideoName
      );
      await this.addSubtitlesToVideo(rawVideoPath, srtFile, finalVideoPath);

      // Limpar arquivos temporários
      await fs.rm(tempDir, { recursive: true, force: true });

      const videoUrl = `/storage/${this.videoOutputDir}/${finalVideoName}`;
      this.logger.info(`Video generation completed: ${videoUrl}`);

      return videoUrl;
    } catch (error) {
      this.logger.error("Error generating video:", error);
      throw error;
    }
  }
}
