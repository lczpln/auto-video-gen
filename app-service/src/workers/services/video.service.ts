import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { LoggerService } from "../../common/services/logger.service";
import * as path from "path";
import * as fs from "fs/promises";
import * as fsSync from "fs";
import { JobsService } from "../../jobs/jobs.service";
import { exec, execSync, spawn } from "child_process";
import { promisify } from "util";
import * as os from "os";

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
    private jobsService: JobsService
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

      // Efeito de zoom suave usando filtros do FFmpeg
      const filter = `[0:v]scale=8000:-1,zoompan=z='zoom+0.001':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${this.videoWidth}x${this.videoHeight},trim=duration=${sceneDuration},fade=t=in:st=0:d=1,fade=t=out:st=${sceneDuration - 1}:d=1[v]`;

      const cmd = `${this.ffmpegPath} -y -loop 1 -i "${imageFile}" -i "${audioFile}" -filter_complex "${filter}" -map "[v]" -map 1:a -c:v libx264 -c:a aac -shortest "${outputFile}"`;

      execSync(cmd, { stdio: "inherit" });
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
        maxWordsPerLine: 3,
        minWordsPerLine: 1,
        lineBreakThreshold: 0.5,
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

  private async concatenateVideos(
    videoFiles: string[],
    outputFile: string
  ): Promise<string> {
    try {
      // Criar arquivo de lista para concatenação
      const concatList = path.join(path.dirname(outputFile), "concat_list.txt");
      const listContent = videoFiles.map((file) => `file '${file}'`).join("\n");
      await fs.writeFile(concatList, listContent);

      // Concatenar vídeos
      const cmd = `${this.ffmpegPath} -y -f concat -safe 0 -i "${concatList}" -c copy "${outputFile}"`;
      execSync(cmd, { stdio: "inherit" });

      // Limpar arquivo temporário
      await fs.unlink(concatList);

      return outputFile;
    } catch (error) {
      this.logger.error("Error concatenating videos:", error);
      throw error;
    }
  }

  async generateVideo(
    jobId: string,
    audioUrls: string[],
    imageUrls: string[]
  ): Promise<string> {
    try {
      this.logger.info(`Generating video for job: ${jobId}`);

      const job = await this.jobsService.getJob(jobId);
      if (!job || !job.content) {
        throw new Error(`Job ${jobId} not found or has no content`);
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
      }

      // Concatenar todos os vídeos
      const rawVideoPath = path.join(tempDir, "raw_video.mp4");
      await this.concatenateVideos(sceneVideos, rawVideoPath);

      // Gerar legendas
      const fullText = job.content.scenes
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
