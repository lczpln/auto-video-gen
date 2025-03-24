import { Controller, Get } from "@nestjs/common";
import { LoggerService } from "../services/logger.service";

@Controller("health")
export class HealthController {
  private readonly logger;

  constructor(private readonly loggerService: LoggerService) {
    this.logger = this.loggerService.getLogger("health-controller");
  }

  @Get()
  getHealth() {
    this.logger.debug("Health check requested");
    return { status: "ok", timestamp: new Date().toISOString() };
  }
}
