import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.APP_PORT;

  app.setGlobalPrefix('ai-rest');

  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const rmqUser = process.env.RABBIT_MQ_USER;
  const rmqPass = process.env.RABBIT_MQ_PASS;
  const rmqHost = process.env.RABBIT_MQ_HOST || 'localhost';
  const rmqPort = process.env.RABBIT_MQ_PORT || '5672';

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [`amqp://${rmqUser}:${rmqPass}@${rmqHost}:${rmqPort}`],
      queue: 'records_ai_chats_analysis_events',
      queueOptions: {
        durable: true,
      },
      noAck: false, // Enable manual acknowledgment
    },
  });
  await app.startAllMicroservices();


  await app.listen(port);
}
bootstrap();
