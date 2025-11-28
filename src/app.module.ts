import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConversationsModule } from './conversations/conversations.module';
import { AlertsModule } from './alerts/alerts.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import databaseConfig from './config/database.config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';

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
    ScheduleModule.forRoot(),
    ConversationsModule,
    AlertsModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
