import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WhatsappStorageService } from './whatsapp-storage.service';
import { WhatsappAlertsService } from './whatsapp-alerts.service';
import { ConversationsController } from './conversations.controller';
import { WhatsAppChat, WhatsAppChatSchema } from './schemas/whatsapp-chat.schema';
import { WhatsAppMessage, WhatsAppMessageSchema } from './schemas/whatsapp-message.schema';
import { WhatsAppAlert, WhatsAppAlertSchema } from './schemas/whatsapp-alert.schema';
import { WhatsAppSession, WhatsAppSessionSchema } from './schemas/whatsapp-session.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WhatsAppChat.name, schema: WhatsAppChatSchema },
      { name: WhatsAppMessage.name, schema: WhatsAppMessageSchema },
      { name: WhatsAppAlert.name, schema: WhatsAppAlertSchema },
      { name: WhatsAppSession.name, schema: WhatsAppSessionSchema },
    ]),
  ],
  controllers: [ConversationsController],
  providers: [WhatsappStorageService, WhatsappAlertsService],
  exports: [WhatsappStorageService, WhatsappAlertsService],
})
export class ConversationsModule {}

