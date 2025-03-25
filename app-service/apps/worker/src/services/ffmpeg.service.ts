import { ConfigService } from "@nestjs/config";
import { exec, execSync, spawn } from "child_process";
import { Logger } from "@nestjs/common";
import * as fs from "fs/promises";
import * as path from "path";

interface SceneGeneratorOptions {
  zoom: number;
  frameRate: number;
  fadeIn: number;
  fadeOut: number;
}

export class FfmpegService {
  private readonly logger = new Logger(FfmpegService.name);


  async generateSceneFromImageAndAudio(imagePath: string, audioPath: string, outputPath: string, options: SceneGeneratorOptions = {
    zoom: 1.5,
    frameRate: 30,
    fadeIn: 1.0,
    fadeOut: 1.0,
  }): Promise<void> {
    const { zoom, frameRate, fadeIn, fadeOut } = options;
    const clipDuration = await this.getAudioDuration(audioPath);
    const zoomStep = (zoom - 1.0) / (clipDuration / frameRate);
    
    this.logger.log(`Generating scene from image: ${imagePath} and audio: ${audioPath}`);
    this.logger.log(`Clip duration: ${clipDuration.toFixed(2)}s, zoom: ${zoom}, frameRate: ${frameRate}`);
    
    const args = [
      '-y',
      '-loop', '1',
      '-framerate', `${frameRate}`,
      '-i', imagePath,
      '-i', audioPath,
      '-filter_complex',
      `[0:v] scale=8000:-1, zoompan=z='min(zoom+${zoomStep},${zoom})':d=700:x='if(gte(zoom,${zoom}),x,x+1/a)':y='if(gte(zoom,${zoom}),y,y+1)':s=1080x1920, fps=${frameRate}, trim=duration=${clipDuration}, fade=t=in:st=0:d=${fadeIn}, fade=t=out:st=${clipDuration - fadeOut}:d=${fadeOut} [v]`,
      '-map', '[v]',
      '-map', '1:a',
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-pix_fmt', 'yuv420p',
      '-crf', '28',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-shortest',
      outputPath
    ];

    return new Promise((resolve, reject) => {
      const ffmpegProcess = spawn('ffmpeg', args);
      let lastProgress = 0;
      
      ffmpegProcess.stderr.on('data', (data) => {
        const output = data.toString();
        
        // Extract progress information
        const timeMatch = output.match(/time=(\d+:\d+:\d+\.\d+)/);
        if (timeMatch) {
          const timeStr = timeMatch[1];
          const [hours, minutes, seconds] = timeStr.split(':').map(parseFloat);
          const currentTime = hours * 3600 + minutes * 60 + seconds;
          const progressPercent = Math.min(100, Math.round((currentTime / clipDuration) * 100));
          
          // Only log if progress has changed by at least x%
          const progressChange = progressPercent - lastProgress;
          const threshold = 25;
          if (progressChange >= threshold || progressPercent === 100) {
            lastProgress = progressPercent;
            
            // Create a progress bar
            const barLength = 30;
            const completedLength = Math.floor(barLength * progressPercent / 100);
            const progressBar = '█'.repeat(completedLength) + '░'.repeat(barLength - completedLength);
            
            this.logger.debug(`Processing: [${progressBar}] ${progressPercent}% (${currentTime.toFixed(1)}s / ${clipDuration.toFixed(1)}s)`);
          }
        }
      });
      
      ffmpegProcess.on('close', (code) => {
        if (code === 0) {
          this.logger.log(`Scene generation complete: ${outputPath}`);
          resolve();
        } else {
          const errorMessage = `FFmpeg process exited with code ${code}`;
          this.logger.error(errorMessage);
          reject(new Error(errorMessage));
        }
      });
      
      ffmpegProcess.on('error', (err) => {
        const errorMessage = `Error running FFmpeg: ${err.message}`;
        this.logger.error(errorMessage);
        reject(new Error(errorMessage));
      });
    });
  }

  async concatenateVideos(
    videoFiles: string[],
    outputFile: string
  ): Promise<string> {
    try {
      // Criar arquivo de lista para concatenação
      const concatList = path.join(path.dirname(outputFile), "concat_list.txt");
      const listContent = videoFiles.map((file) => `file '${file.split('/').pop()}'`).join("\n");
      await fs.writeFile(concatList, listContent);

      // Concatenar vídeos
      const cmd = `ffmpeg -y -f concat -safe 0 -i "${concatList}" -c copy "${outputFile}"`;
      execSync(cmd, { stdio: "inherit" });

      // Limpar arquivo temporário
      await fs.unlink(concatList);

      return outputFile;
    } catch (error) {
      this.logger.error("Error concatenating videos:", error);
      throw error;
    }
  }

  private async getAudioDuration(audioPath: string): Promise<number> {
    try {
      const cmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`;
      const output = execSync(cmd).toString().trim();
      return parseFloat(output);
    } catch (err) {
      const errorMessage = `Error getting audio duration: ${err.message}`;
      this.logger.error(errorMessage);
      return 3.0;
    }
  }
}
