import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { WhatsAppChat, WhatsAppChatDocument } from './schemas/whatsapp-chat.schema';
import { WhatsAppMessage, WhatsAppMessageDocument } from './schemas/whatsapp-message.schema';
import { WhatsAppSession, WhatsAppSessionDocument } from './schemas/whatsapp-session.schema';
import { ChatData } from './interfaces/chat-data.interface';
import { MessageData } from './interfaces/message-data.interface';

@Injectable()
export class WhatsappStorageService {
  private readonly logger = new Logger(WhatsappStorageService.name);

  constructor(
    @InjectModel(WhatsAppChat.name) private whatsAppChatModel: Model<WhatsAppChatDocument>,
    @InjectModel(WhatsAppMessage.name) private whatsAppMessageModel: Model<WhatsAppMessageDocument>,
    @InjectModel(WhatsAppSession.name) private whatsAppSessionModel: Model<WhatsAppSessionDocument>,
  ) {}

  /**
   * Save or update a chat in the database
   * Validates if the chat already exists to avoid duplicates
   */
  async saveChat(sessionId: string, chat: ChatData): Promise<void> {
    try {
      // Check if the last message type is "e2e_notification"
      const isE2ENotification = chat.lastMessage?.type === 'e2e_notification';
      
      const chatData: any = {
        chatId: chat.id._serialized,
        sessionId,
        name: chat.name,
        isGroup: chat.isGroup,
        unreadCount: chat.unreadCount,
        timestamp: chat.timestamp,
        archived: chat.archived,
        pinned: chat.pinned,
        isReadOnly: chat.isReadOnly,
        isMuted: chat.isMuted,
        muteExpiration: chat.muteExpiration,
        lastMessage: chat.lastMessage?.body || null,
        lastMessageTimestamp: chat.lastMessage?.timestamp || null,
        lastMessageFromMe: chat.lastMessage?.fromMe || false,
      };

      // Only set deleted: false if the message type is NOT "e2e_notification"
      if (!isE2ENotification) {
        chatData.deleted = false;
      }

      // Use findOneAndUpdate with upsert to handle duplicates
      // Preserve deletedAt array history, only initialize it for new chats
      await this.whatsAppChatModel.findOneAndUpdate(
        { chatId: chat.id._serialized, sessionId },
        { 
          $set: chatData,
          $setOnInsert: { deletedAt: [] }
        },
        { upsert: true, new: true }
      );

      this.logger.debug(`💾 Chat saved: ${chat.id._serialized}`);
    } catch (error) {
      this.logger.error(`Error saving chat: ${error.message}`);
      throw error;
    }
  }

  /**
   * Save multiple chats (batch operation)
   */
  async saveChats(sessionId: string, chats: ChatData[]): Promise<void> {
    try {
      const operations = chats.map(chat => {
        // Check if the last message type is "e2e_notification"
        const isE2ENotification = chat.lastMessage?.type === 'e2e_notification';
        
        const updateOperation: any = {
          updateOne: {
            filter: { chatId: chat.id._serialized, sessionId },
            update: {
              $set: {
                chatId: chat.id._serialized,
                sessionId,
                name: chat.name,
                isGroup: chat.isGroup,
                unreadCount: chat.unreadCount,
                timestamp: chat.timestamp,
                archived: chat.archived,
                pinned: chat.pinned,
                isReadOnly: chat.isReadOnly,
                isMuted: chat.isMuted,
                muteExpiration: chat.muteExpiration,
                lastMessage: chat.lastMessage?.body || null,
                lastMessageTimestamp: chat.lastMessage?.timestamp || null,
                lastMessageFromMe: chat.lastMessage?.fromMe || false,
              },
              $setOnInsert: {
                deletedAt: [],
              },
            },
            upsert: true,
          },
        };

        // Only set deleted: false if the message type is NOT "e2e_notification"
        if (!isE2ENotification) {
          updateOperation.updateOne.update.$setOnInsert.deleted = false;
        }

        return updateOperation;
      });

      if (operations.length > 0) {
        await this.whatsAppChatModel.bulkWrite(operations);
        this.logger.log(`💾 Batch saved ${chats.length} chats for session ${sessionId}`);
      }
    } catch (error) {
      this.logger.error(`Error batch saving chats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Save or update a message in the database
   */
  async saveMessage(sessionId: string, message: MessageData, chatId?: string): Promise<void> {
    try {
      // Use provided chatId or fallback to message context
      const messageChatId = chatId || message.id.remote || message.from || message.to;
      const messageData = {
        messageId: message.id._serialized,
        sessionId,
        chatId: messageChatId,
        body: message.body || '',
        type: message.type,
        from: message.from,
        to: message.to,
        author: message.author,
        fromMe: message.fromMe,
        isForwarded: message.isForwarded || false,
        forwardingScore: message.forwardingScore || 0,
        isStatus: message.isStatus || false,
        hasMedia: message.hasMedia || false,
        mediaType: message.hasMedia ? message.type : null,
        hasQuotedMsg: message.hasQuotedMsg || false,
        isStarred: message.isStarred || false,
        isGif: message.isGif || false,
        isEphemeral: message.isEphemeral || false,
        timestamp: message.timestamp,
        ack: message.ack || 0,
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
        edition: [],
        deviceType: message.deviceType,
        broadcast: message.broadcast || false,
        mentionedIds: message.mentionedIds || [],
        rawData: message.rawData || {},
      };

      // Check if message already exists
      const existingMessage = await this.whatsAppMessageModel.findOne({
        messageId: message.id._serialized,
        sessionId
      });

      if (!existingMessage) {
        const newMessage = await this.whatsAppMessageModel.create(messageData);
        this.logger.debug(`💾 Message saved: ${newMessage.chatId}`);
      } else {
        // Update only if message data has changed
        await this.whatsAppMessageModel.updateOne(
          { messageId: message.id._serialized, sessionId },
          { $set: messageData }
        );
        this.logger.debug(`✏️ Message updated: ${message.id._serialized}`);
      }
    } catch (error) {
      this.logger.error(`Error saving message: ${error.message}`);
    }
  }

  /**
   * Batch save messages (more efficient for bulk operations)
   */
  async saveMessages(sessionId: string, messages: MessageData[], chatId?: string): Promise<void> {
    try {
      if (messages.length === 0) {
        return;
      }

      const operations = messages.map(message => {
        // Use provided chatId or fallback to message context
        const messageChatId = chatId || message.id.remote || message.from || message.to;
        
        return {
          updateOne: {
            filter: { 
              messageId: message.id._serialized,
              sessionId 
            },
            update: {
              $set: {
                messageId: message.id._serialized,
                sessionId,
                chatId: messageChatId,
                body: message.body || '',
                type: message.type,
                from: message.from,
                to: message.to,
                author: message.author,
                fromMe: message.fromMe,
                isForwarded: message.isForwarded || false,
                forwardingScore: message.forwardingScore || 0,
                isStatus: message.isStatus || false,
                hasMedia: message.hasMedia || false,
                mediaType: message.hasMedia ? message.type : null,
                hasQuotedMsg: message.hasQuotedMsg || false,
                isStarred: message.isStarred || false,
                isGif: message.isGif || false,
                isEphemeral: message.isEphemeral || false,
                timestamp: message.timestamp,
                ack: message.ack || 0,
                isDeleted: false,
                deletedAt: null,
                deletedBy: null,
                edition: [],
                deviceType: message.deviceType,
                broadcast: message.broadcast || false,
                mentionedIds: message.mentionedIds || [],
                rawData: message.rawData || {},
              },
              $setOnInsert: { createdAt: new Date() },
            },
            upsert: true,
          },
        };
      });

      await this.whatsAppMessageModel.bulkWrite(operations);
      this.logger.log(`💾 Batch saved ${messages.length} messages for session ${sessionId}`);
    } catch (error) {
      this.logger.error(`Error batch saving messages: ${error.message}`);
      throw error;
    }
  }

  /**
   * Mark message as deleted
   */
  async markMessageAsDeleted(sessionId: string, messageId: string, deletedBy: string = 'everyone'): Promise<void> {
    try {
      await this.whatsAppMessageModel.updateOne(
        { messageId, sessionId },
        { 
          $set: { 
            isDeleted: true,
            deletedAt: new Date(),
            deletedBy,
          }
        }
      );
      
      this.logger.debug(`🗑️ Message marked as deleted: ${messageId} by ${deletedBy}`);
    } catch (error) {
      this.logger.error(`Error marking message as deleted: ${error.message}`);
    }
  }

  /**
   * Update message edition history
   */
  async updateMessageEdition(sessionId: string, messageId: string, newBody: string, prevBody: string): Promise<void> {
    try {
      const existingMessage = await this.whatsAppMessageModel.findOne({ 
        messageId,
        sessionId 
      });

      const editionHistory = existingMessage?.edition || [];
      editionHistory.push(prevBody);

      await this.whatsAppMessageModel.updateOne(
        { messageId, sessionId },
        { 
          $set: { 
            body: newBody,
            edition: editionHistory,
          }
        }
      );
      
      this.logger.debug(`✏️ Message edition saved: ${messageId}`);
    } catch (error) {
      this.logger.error(`Error updating message edition: ${error.message}`);
    }
  }

  /**
   * Get all chats from database for a session
   */
  async getStoredChats(sessionId: string, options?: {
    archived?: boolean;
    isGroup?: boolean;
    limit?: number;
    skip?: number;
  }): Promise<WhatsAppChat[]> {
    try {
      const query: any = { sessionId };
      
      if (options?.archived !== undefined) {
        query.archived = options.archived;
      }
      
      if (options?.isGroup !== undefined) {
        query.isGroup = options.isGroup;
      }

      const chats = await this.whatsAppChatModel
        .find(query)
        .sort({ timestamp: -1 })
        .limit(options?.limit || 500)
        .skip(options?.skip || 0)
        .exec();

      return chats;
    } catch (error) {
      this.logger.error(`Error getting stored chats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get a specific chat from database
   */
  async getStoredChat(sessionId: string, chatId: string): Promise<WhatsAppChat | null> {
    try {
      const chat = await this.whatsAppChatModel
        .findOne({ sessionId, chatId })
        .exec();

      return chat;
    } catch (error) {
      this.logger.error(`Error getting stored chat: ${error.message}`);
      throw error;
    }
  }

  /**
   * Mark chat as deleted
   */
  async markChatAsDeleted(sessionId: string, chatId: string): Promise<void> {
    try {
      const deletionDate = new Date();
      
      const chat = await this.whatsAppChatModel.findOne({ chatId, sessionId });
      if (!chat) {
        this.logger.warn(`Chat not found: ${chatId} in session ${sessionId}`);
        return;
      }
      await this.whatsAppChatModel.updateOne(
        { chatId, sessionId },
        { 
          $set: { 
            deleted: true,
          },
          $push: {
            deletedAt: deletionDate,
          }
        }
      );
      
      this.logger.debug(`🗑️ Chat marked as deleted: ${chatId} in session ${sessionId} at ${deletionDate.toISOString()}`);
    } catch (error) {
      this.logger.error(`Error marking chat as deleted: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all stored messages from database
   */
  async getStoredMessages(sessionId: string, chatId?: string, options?: {
    includeDeleted?: boolean;
    limit?: number;
    skip?: number;
    startTimestamp?: number;
    endTimestamp?: number;
  }): Promise<WhatsAppMessage[]> {
    try {
      const query: any = { sessionId };
      
      if (chatId) {
        query.chatId = chatId;
      }
      
      if (!options?.includeDeleted) {
        query.isDeleted = false;
      }
      
      if (options?.startTimestamp) {
        query.timestamp = { $gte: options.startTimestamp };
      }
      
      if (options?.endTimestamp) {
        if (!query.timestamp) {
          query.timestamp = {};
        }
        query.timestamp.$lte = options.endTimestamp;
      }
      
      const messages = await this.whatsAppMessageModel
        .find(query)
        .sort({ timestamp: -1 })
        .limit(options?.limit || 50)
        .skip(options?.skip || 0)
        .exec();
      
      return messages;
    } catch (error) {
      this.logger.error(`Error getting stored messages: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get message by ID
   */
  async getStoredMessageById(sessionId: string, messageId: string): Promise<WhatsAppMessage | null> {
    try {
      const message = await this.whatsAppMessageModel.findOne({ 
        sessionId, 
        messageId 
      }).exec();
      
      return message;
    } catch (error) {
      this.logger.error(`Error getting stored message: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get deleted messages
   */
  async getDeletedMessages(sessionId: string, chatId?: string, limit?: number): Promise<WhatsAppMessage[]> {
    try {
      const query: any = { sessionId, isDeleted: true };
      
      if (chatId) {
        query.chatId = chatId;
      }
      
      const messages = await this.whatsAppMessageModel
        .find(query)
        .sort({ deletedAt: -1 })
        .limit(limit || 50)
        .exec();
      
      return messages;
    } catch (error) {
      this.logger.error(`Error getting deleted messages: ${error.message}`);
      throw error;
    }
  }

  /**
   * Set message group ID
   */
  async setMessageGroup(sessionId: string, messageId: string, groupId: string): Promise<void> {
    try {
      const result = await this.whatsAppMessageModel.updateOne(
        { sessionId, messageId },
        { $set: { groupId } },
      );
      if (result.matchedCount === 0) {
        throw new Error('Message not found');
      }
    } catch (error) {
      this.logger.error(`Error setting groupId for message ${messageId} in session ${sessionId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Store session metadata
   */
  async storeSessionMetadata(sessionId: string, metadata: {
    status?: string;
    lastSeen?: Date;
    isDisconnected?: boolean;
    disconnectedAt?: Date;
    refId?: string;
  }): Promise<void> {
    try {
      await this.whatsAppSessionModel.updateOne(
        { sessionId: sessionId },
        { 
          $set: {
            sessionId: sessionId,
            ...metadata,
          }
        },
        { upsert: true }
      );
    } catch (error) {
      this.logger.error(`Error storing session metadata for ${sessionId}:`, error);
    }
  }

  /**
   * Update session data (only editable fields: title and refId for grouping)
   */
  async updateSession(sessionId: string, updateData: { title?: string; sessionId?: string }): Promise<void> {
    try {
      // Only allow updating specific editable fields
      const allowedFields: any = {};
      
      if (updateData.title !== undefined) {
        allowedFields.title = updateData.title;
      }

      if (updateData.sessionId !== undefined) {
        // Map sessionId from DTO to refId in database
        allowedFields.refId = new Types.ObjectId(updateData.sessionId);
      }

      if (Object.keys(allowedFields).length === 0) {
        throw new Error('No valid fields to update');
      }

      const result = await this.whatsAppSessionModel.updateOne(
        { sessionId },
        { $set: allowedFields }
      );
      
      if (result.matchedCount === 0) {
        throw new Error(`Session not found: ${sessionId}`);
      }
      
      this.logger.debug(`✏️ Session updated: ${sessionId}`, allowedFields);
    } catch (error) {
      this.logger.error(`Error updating session for ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Get stored sessions
   */
  async getStoredSessions(): Promise<any[]> {
    try {
      const sessions = await this.whatsAppSessionModel.find({}).exec();
      return sessions.map(session => ({
        sessionId: session.sessionId,
        status: session.status,
        lastSeen: session.lastSeen,
        updatedAt: session.updatedAt,
        createdAt: session.createdAt,
      }));
    } catch (error) {
      this.logger.error('Error fetching stored sessions:', error);
      return [];
    }
  }

  /**
   * Get sessions by status
   */
  async getSessionsByStatus(statuses: string[]): Promise<any[]> {
    try {
      const sessions = await this.whatsAppSessionModel.find({
        status: { $in: statuses }
      }).exec();
      
      return sessions.map(session => ({
        sessionId: session.sessionId,
        status: session.status,
        lastSeen: session.lastSeen,
      }));
    } catch (error) {
      this.logger.error('Error fetching sessions by status:', error);
      return [];
    }
  }
}

