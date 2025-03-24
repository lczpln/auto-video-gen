import { Controller, Get, Res } from "@nestjs/common";
import { Response } from "express";
import { join } from "path";
import { LoggerService } from "../services/logger.service";

@Controller()
export class UIController {
  private readonly logger;

  constructor(private readonly loggerService: LoggerService) {
    this.logger = this.loggerService.getLogger("ui-controller");
  }

  @Get()
  serveRoot(@Res() response: Response) {
    this.logger.debug("Serving index.html from root path");
    response.sendFile(join(process.cwd(), "public", "index.html"));
  }

  @Get("ui")
  serveUI(@Res() response: Response) {
    this.logger.debug("Serving index.html from /ui path");
    response.sendFile(join(process.cwd(), "public", "ui", "index.html"));
  }

  @Get("ui/*")
  serveUIWildcard(@Res() response: Response) {
    this.logger.debug(
      "Serving index.html from UI wildcard route for SPA support"
    );
    response.sendFile(join(process.cwd(), "public", "ui", "index.html"));
  }
}
