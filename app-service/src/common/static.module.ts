import { Module } from "@nestjs/common";
import { ServeStaticModule } from "@nestjs/serve-static";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { join } from "path";

@Module({
  imports: [
    // Serve static UI assets (CSS, JS, images, etc.)
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), "public"),
      serveRoot: "/",
      exclude: ["/api/*", "/health"],
    }),

    // Serve static storage files (videos, audios, images)
    ServeStaticModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const storagePath = configService.get<string>(
          "STORAGE_PATH",
          "./storage"
        );
        return [
          {
            rootPath: storagePath,
            serveRoot: "/storage",
            serveStaticOptions: {
              index: false,
              fallthrough: true,
            },
          },
        ];
      },
    }),
  ],
})
export class StaticFilesModule {}
