import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as fs from "fs";
import * as path from "path";

@Injectable()
export class LoggerService {
  private readonly logPath: string;
  private readonly logLevel: string;
  private readonly logLevels = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
  };

  constructor(private readonly configService: ConfigService) {
    this.logPath = this.configService.get<string>("LOG_PATH", "./logs");
    this.logLevel = this.configService.get<string>("LOG_LEVEL", "info");

    // Ensure log directory exists
    if (!fs.existsSync(this.logPath)) {
      fs.mkdirSync(this.logPath, { recursive: true });
    }
  }

  /**
   * Get a logger for a specific context
   * @param context The context for which to get the logger
   * @returns A logger object with methods for different log levels
   */
  getLogger(context: string) {
    return {
      error: (message: string) => this.log("error", context, message),
      warn: (message: string) => this.log("warn", context, message),
      info: (message: string) => this.log("info", context, message),
      debug: (message: string) => this.log("debug", context, message),
    };
  }

  /**
   * Log a message with the specified level and context
   * @param level The log level
   * @param context The context
   * @param message The message to log
   */
  private log(level: string, context: string, message: string): void {
    // Check if we should log this level
    if (this.logLevels[level] > this.logLevels[this.logLevel]) {
      return;
    }

    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${context}] [${level}]: ${message}`;

    // Log to console
    console.log(logMessage);

    // Log to file
    const logFile = path.join(this.logPath, `${context}.log`);
    fs.appendFileSync(logFile, logMessage + "\n");
  }
}
