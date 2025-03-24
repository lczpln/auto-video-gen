import { Module, Global } from "@nestjs/common";
import { LoggerService } from "./services/logger.service";
import { HealthController } from "./controllers/health.controller";
import { UIController } from "./controllers/ui.controller";
@Global()
@Module({
  controllers: [HealthController, UIController],
  providers: [LoggerService],
  exports: [LoggerService],
})
export class CommonModule {}
