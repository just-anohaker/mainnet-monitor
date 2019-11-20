import "reflect-metadata";
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, { cors: true });
    app.useWebSocketAdapter(new IoAdapter(app));
    await app.listen(5060);
}
bootstrap();
