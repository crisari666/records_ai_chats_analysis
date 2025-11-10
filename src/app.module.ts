import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConversationsModule } from './conversations/conversations.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import databaseConfig from './config/database.config';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RabbitService } from './shared/rabbit.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        return ({
          uri: configService.get<string>('database.uri'),
        })
      },
      inject: [ConfigService],
    }),
    ClientsModule.register([
      {
        name: 'WHATSAPP_WEB_MICROSERVICE',
        transport: Transport.RMQ,
        options: {
          urls: ['amqp://guest:guest@localhost:5672'],
          queue: 'whatsapp_events', // where MS2 is listening
          queueOptions: { durable: true },
        },
      },
    ]),
    ConversationsModule
  ],
  controllers: [AppController],
  providers: [AppService, RabbitService],
})
export class AppModule {}
