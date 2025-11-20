import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { WhatsappStorageService } from './whatsapp-storage.service';
import { WhatsappAlertsService } from './whatsapp-alerts.service';
import { ConversationsController } from './conversations.controller';
import { WhatsAppChat, WhatsAppChatSchema } from './schemas/whatsapp-chat.schema';
import { WhatsAppMessage, WhatsAppMessageSchema } from './schemas/whatsapp-message.schema';
import { WhatsAppAlert, WhatsAppAlertSchema } from './schemas/whatsapp-alert.schema';
import { WhatsAppSession, WhatsAppSessionSchema } from './schemas/whatsapp-session.schema';
import { ConversationsQueueController } from './conversations.queue';
import { RabbitService } from 'src/shared/rabbit.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WhatsappWebGateway } from 'src/websocket/whatsapp-web.gateway';
import { ConversationsService } from './conversations.service';
import { HttpService } from './http.service';
import { AuthService } from './auth.service';
import { OllamaService } from './ollama.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: WhatsAppChat.name, schema: WhatsAppChatSchema },
      { name: WhatsAppMessage.name, schema: WhatsAppMessageSchema },
      { name: WhatsAppAlert.name, schema: WhatsAppAlertSchema },
      { name: WhatsAppSession.name, schema: WhatsAppSessionSchema },
    ]),
    ClientsModule.registerAsync([
      {
        name: 'WHATSAPP_WEB_MICROSERVICE',
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService) => {
          const rmqUser = configService.get<string>('RABBIT_MQ_USER');
          const rmqPass = configService.get<string>('RABBIT_MQ_PASS');
          const rmqHost = configService.get<string>('RABBIT_MQ_HOST') || 'localhost';
          const rmqPort = configService.get<string>('RABBIT_MQ_PORT') || '5672';
          return {
            transport: Transport.RMQ,
            options: {
              urls: [`amqp://${rmqUser}:${rmqPass}@${rmqHost}:${rmqPort}`],
              queue: 'whatsapp_events_queue', // where MS2 is listening
              queueOptions: { durable: true },
            },
          };
        },
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [ConversationsController, ConversationsQueueController],
  providers: [AuthService, WhatsappStorageService, WhatsappAlertsService, RabbitService, WhatsappWebGateway, ConversationsService, HttpService, OllamaService],
  exports: [WhatsappStorageService, WhatsappAlertsService],
})
export class ConversationsModule { }

