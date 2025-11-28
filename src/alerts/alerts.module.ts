import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { WhatsAppAlert, WhatsAppAlertSchema } from 'src/conversations/schemas/whatsapp-alert.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WhatsAppAlert.name, schema: WhatsAppAlertSchema },
    ]),
  ],
  controllers: [AlertsController],
  providers: [AlertsService],
  exports: [AlertsService],
})
export class AlertsModule {}

