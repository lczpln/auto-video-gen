import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { Logger, ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get("APP_PORT", 3000);

  // Enable validation pipe globally
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    })
  );

  // Enable CORS
  app.enableCors();

  // Set global API prefix, excluding certain routes
  app.setGlobalPrefix("api", {
    exclude: ["health", "ui", "ui/*", "/"], // Exclude non-API routes from the prefix
  });

  await app.listen(port);
  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`API is available at: http://localhost:${port}/api/jobs`);
  logger.log(`Health check is available at: http://localhost:${port}/health`);
}

bootstrap();
