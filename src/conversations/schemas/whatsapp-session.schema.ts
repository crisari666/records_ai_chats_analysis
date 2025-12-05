import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { AppConstants } from '../../constants/app.constants';

export type WhatsAppSessionDocument = WhatsAppSession & Document;

@Schema({ timestamps: true })
export class WhatsAppSession {
  // A unique ID for this session (e.g., 'user-1', 'sales-team', etc.)
  @Prop({ required: true, unique: true })
  sessionId: string;

  // Optional title or name for the session
  @Prop({ type: String, required: false })
  title?: string;

  // Optional external reference for filtering/grouping (indexed)
  @Prop({ type: Types.ObjectId, required: false, index: true })
  refId?: Types.ObjectId;

  // The session data object provided by 'whatsapp-web.js' (stored by MongoStore)
  @Prop({ type: Object, required: false })
  sessionData?: any;

  // Current status of the session
  @Prop({
    type: String,
    enum: [
      'initializing',
      'qr_generated',
      'authenticated',
      'ready',
      'disconnected',
      'closed',
      'auth_failure',
      'error'
    ],
    default: 'initializing'
  })
  status: string;

  @Prop({ type: String, default: null })
  qrCode: string

  // Last time the session was active/seen
  @Prop({ type: Date, default: Date.now })
  lastSeen: Date;

  // Number of QR generation attempts for this session
  @Prop({ type: Number, default: 0, min: 0 })
  qrAttempts: number;

  // Maximum allowed QR generation attempts before auto-closing the session
  @Prop({ type: Number, default: AppConstants.MAX_QR_ATTEMPTS, min: 1 })
  maxQrAttempts: number;

  // Timestamp when the session was closed
  @Prop({ type: Date, required: false })
  closedAt?: Date;

  // Flag to explicitly mark a session as disconnected
  @Prop({ type: Boolean, default: false })
  isDisconnected: boolean;

  @Prop({ type: Boolean, default: false })
  disconnectedAt?: Date;

  // Timestamps (automatically added by Mongoose with { timestamps: true })
  createdAt?: Date;
  updatedAt?: Date;
}

export const WhatsAppSessionSchema = SchemaFactory.createForClass(WhatsAppSession);

// Increment QR attempts on status transition to 'qr_generated' and
// auto-close the session when attempts reach/exceed the maximu

