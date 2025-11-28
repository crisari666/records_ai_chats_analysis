# Alerts API Documentation

This document describes all available endpoints for the WhatsApp Alerts API. Use this documentation to implement the frontend service for managing alerts.

## Base URL

All endpoints are prefixed with `/ai-rest/alerts`

**Example:** `http://localhost:3000/ai-rest/alerts`

## Alert Types

The following alert types are supported:
- `disconnected` - WhatsApp session disconnected
- `message_deleted` - A message was deleted
- `message_edited` - A message was edited
- `chat_removed` - A chat was removed

## Alert Object Structure

```typescript
interface Alert {
  _id: string;                    // MongoDB ObjectId
  session: string;                 // Session ObjectId (MongoDB)
  sessionId: string;               // Session ID (string identifier)
  type: 'disconnected' | 'message_deleted' | 'message_edited' | 'chat_removed';
  message?: string;                // Optional human-readable message
  isRead: boolean;                 // Whether the alert has been read
  readAt?: Date;                   // Timestamp when alert was marked as read
  createdAt?: Date;                // Alert creation timestamp
  updatedAt?: Date;                // Alert last update timestamp
  // Type-specific fields (only present for relevant alert types):
  messageId?: string;              // For message_deleted and message_edited
  chatId?: string;                 // For message_deleted, message_edited, and chat_removed
  timestamp?: number;              // Unix timestamp for message_deleted, message_edited, and chat_removed
  callData?: {                     // Optional metadata for call alerts
    callId?: string;
    from?: string;
    to?: string;
    duration?: number;
    isVideo?: boolean;
    isGroup?: boolean;
  };
}
```

---

## Endpoints

### 1. Get All Alerts

Retrieve all alerts with optional filtering and pagination.

**Endpoint:** `GET /ai-rest/alerts`

**Query Parameters:**
- `isRead` (optional, string): Filter by read status. Values: `"true"` or `"false"`
- `limit` (optional, string): Maximum number of alerts to return (pagination)
- `skip` (optional, string): Number of alerts to skip (pagination)

**Example Request:**
```http
GET /ai-rest/alerts?isRead=false&limit=10&skip=0
```

**Example Response:**
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "session": "507f1f77bcf86cd799439012",
    "sessionId": "session_123",
    "type": "message_deleted",
    "messageId": "msg_456",
    "chatId": "chat_789",
    "timestamp": 1705312200000,
    "message": "--",
    "isRead": false,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
]
```

---

### 2. Get Unread Count

Get the count of unread alerts, optionally filtered by session.

**Endpoint:** `GET /ai-rest/alerts/unread/count`

**Query Parameters:**
- `sessionId` (optional, string): Filter count by specific session ID

**Example Request:**
```http
GET /ai-rest/alerts/unread/count?sessionId=session_123
```

**Example Response:**
```json
{
  "count": 5
}
```

---

### 3. Get Session Alerts

Retrieve all alerts for a specific session.

**Endpoint:** `GET /ai-rest/alerts/sessions/:sessionId`

**Path Parameters:**
- `sessionId` (required, string): The session ID

**Query Parameters:**
- `isRead` (optional, string): Filter by read status. Values: `"true"` or `"false"`

**Example Request:**
```http
GET /ai-rest/alerts/sessions/session_123?isRead=false
```

**Example Response:**
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "session": "507f1f77bcf86cd799439012",
    "sessionId": "session_123",
    "type": "disconnected",
    "message": "WhatsApp session disconnected",
    "isRead": false,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
]
```

---

### 4. Get Chat Alerts

Retrieve all alerts for a specific chat within a session.

**Endpoint:** `GET /ai-rest/alerts/sessions/:sessionId/chats/:chatId`

**Path Parameters:**
- `sessionId` (required, string): The session ID
- `chatId` (required, string): The chat ID

**Query Parameters:**
- `isRead` (optional, string): Filter by read status. Values: `"true"` or `"false"`

**Example Request:**
```http
GET /ai-rest/alerts/sessions/session_123/chats/chat_789?isRead=false
```

**Example Response:**
```json
[
  {
    "_id": "507f1f77bcf86cd799439013",
    "session": "507f1f77bcf86cd799439012",
    "sessionId": "session_123",
    "type": "message_deleted",
    "messageId": "msg_456",
    "chatId": "chat_789",
    "timestamp": 1705312200000,
    "message": "--",
    "isRead": false,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
]
```

---

### 5. Get Alert by ID

Retrieve a specific alert by its ID.

**Endpoint:** `GET /ai-rest/alerts/:alertId`

**Path Parameters:**
- `alertId` (required, string): The alert MongoDB ObjectId

**Example Request:**
```http
GET /ai-rest/alerts/507f1f77bcf86cd799439011
```

**Example Response:**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "session": "507f1f77bcf86cd799439012",
  "sessionId": "session_123",
  "type": "message_edited",
  "messageId": "msg_456",
  "chatId": "chat_789",
  "timestamp": 1705312200000,
  "message": "Message edited: msg_456",
  "isRead": false,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

---

### 6. Mark Alert as Read

Mark a single alert as read.

**Endpoint:** `PUT /ai-rest/alerts/:alertId/read`

**Path Parameters:**
- `alertId` (required, string): The alert MongoDB ObjectId

**Example Request:**
```http
PUT /ai-rest/alerts/507f1f77bcf86cd799439011/read
```

**Example Response:**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "session": "507f1f77bcf86cd799439012",
  "sessionId": "session_123",
  "type": "message_edited",
  "messageId": "msg_456",
  "chatId": "chat_789",
  "timestamp": 1705312200000,
  "message": "Message edited: msg_456",
  "isRead": true,
  "readAt": "2024-01-15T11:00:00.000Z",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T11:00:00.000Z"
}
```

---

### 7. Mark Multiple Alerts as Read (Bulk)

Mark multiple alerts as read in a single request.

**Endpoint:** `PUT /ai-rest/alerts/read/bulk`

**Request Body:**
```json
{
  "alertIds": [
    "507f1f77bcf86cd799439011",
    "507f1f77bcf86cd799439012",
    "507f1f77bcf86cd799439013"
  ]
}
```

**Example Request:**
```http
PUT /ai-rest/alerts/read/bulk
Content-Type: application/json

{
  "alertIds": ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"]
}
```

**Example Response:**
```json
{
  "message": "Marked 2 alerts as read",
  "modifiedCount": 2
}
```

---

### 8. Mark All Session Alerts as Read

Mark all unread alerts for a specific session as read.

**Endpoint:** `PUT /ai-rest/alerts/sessions/:sessionId/read`

**Path Parameters:**
- `sessionId` (required, string): The session ID

**Example Request:**
```http
PUT /ai-rest/alerts/sessions/session_123/read
```

**Example Response:**
```json
{
  "message": "Marked 5 alerts as read for session session_123",
  "modifiedCount": 5
}
```

---

### 9. Mark All Alerts as Read

Mark all unread alerts across all sessions as read.

**Endpoint:** `PUT /ai-rest/alerts/read/all`

**Example Request:**
```http
PUT /ai-rest/alerts/read/all
```

**Example Response:**
```json
{
  "message": "Marked 10 alerts as read",
  "modifiedCount": 10
}
```

---

## Error Responses

All endpoints may return standard HTTP error responses:

**400 Bad Request:**
```json
{
  "statusCode": 400,
  "message": "Validation error message",
  "error": "Bad Request"
}
```

**404 Not Found:**
```json
{
  "statusCode": 404,
  "message": "Alert not found",
  "error": "Not Found"
}
```

**500 Internal Server Error:**
```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "Internal Server Error"
}
```

---

## Frontend Service Implementation Guide

### TypeScript Interface

```typescript
interface Alert {
  _id: string;
  session: string;
  sessionId: string;
  type: 'disconnected' | 'message_deleted' | 'message_edited' | 'chat_removed';
  message?: string;
  isRead: boolean;
  readAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  messageId?: string;
  chatId?: string;
  timestamp?: number;
  callData?: {
    callId?: string;
    from?: string;
    to?: string;
    duration?: number;
    isVideo?: boolean;
    isGroup?: boolean;
  };
}

interface BulkMarkReadResponse {
  message: string;
  modifiedCount: number;
}

interface UnreadCountResponse {
  count: number;
}
```

### Example Service Implementation

```typescript
class AlertsService {
  private baseUrl = 'http://localhost:3000/ai-rest/alerts';

  async getAllAlerts(params?: {
    isRead?: boolean;
    limit?: number;
    skip?: number;
  }): Promise<Alert[]> {
    const queryParams = new URLSearchParams();
    if (params?.isRead !== undefined) {
      queryParams.append('isRead', params.isRead.toString());
    }
    if (params?.limit) {
      queryParams.append('limit', params.limit.toString());
    }
    if (params?.skip) {
      queryParams.append('skip', params.skip.toString());
    }
    
    const response = await fetch(`${this.baseUrl}?${queryParams}`);
    return response.json();
  }

  async getUnreadCount(sessionId?: string): Promise<number> {
    const url = sessionId
      ? `${this.baseUrl}/unread/count?sessionId=${sessionId}`
      : `${this.baseUrl}/unread/count`;
    const response = await fetch(url);
    const data: UnreadCountResponse = await response.json();
    return data.count;
  }

  async getSessionAlerts(
    sessionId: string,
    isRead?: boolean
  ): Promise<Alert[]> {
    const queryParams = isRead !== undefined
      ? `?isRead=${isRead}`
      : '';
    const response = await fetch(
      `${this.baseUrl}/sessions/${sessionId}${queryParams}`
    );
    return response.json();
  }

  async getChatAlerts(
    sessionId: string,
    chatId: string,
    isRead?: boolean
  ): Promise<Alert[]> {
    const queryParams = isRead !== undefined
      ? `?isRead=${isRead}`
      : '';
    const response = await fetch(
      `${this.baseUrl}/sessions/${sessionId}/chats/${chatId}${queryParams}`
    );
    return response.json();
  }

  async getAlertById(alertId: string): Promise<Alert> {
    const response = await fetch(`${this.baseUrl}/${alertId}`);
    return response.json();
  }

  async markAlertAsRead(alertId: string): Promise<Alert> {
    const response = await fetch(`${this.baseUrl}/${alertId}/read`, {
      method: 'PUT',
    });
    return response.json();
  }

  async markMultipleAlertsAsRead(
    alertIds: string[]
  ): Promise<BulkMarkReadResponse> {
    const response = await fetch(`${this.baseUrl}/read/bulk`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ alertIds }),
    });
    return response.json();
  }

  async markSessionAlertsAsRead(
    sessionId: string
  ): Promise<BulkMarkReadResponse> {
    const response = await fetch(
      `${this.baseUrl}/sessions/${sessionId}/read`,
      {
        method: 'PUT',
      }
    );
    return response.json();
  }

  async markAllAlertsAsRead(): Promise<BulkMarkReadResponse> {
    const response = await fetch(`${this.baseUrl}/read/all`, {
      method: 'PUT',
    });
    return response.json();
  }
}
```

---

## Notes

1. **Query Parameter Formatting**: Boolean query parameters must be passed as strings `"true"` or `"false"`, not as actual boolean values.

2. **Pagination**: When using `limit` and `skip`, ensure `skip` is a multiple of `limit` for consistent pagination.

3. **Sorting**: All list endpoints return alerts sorted by `createdAt` in descending order (newest first).

4. **Session ID vs Session ObjectId**: 
   - `sessionId` is a string identifier used in path and query parameters
   - `session` is the MongoDB ObjectId stored in the database

5. **Alert Filtering**: The `isRead` filter can be used on most endpoints to filter by read status. When omitted, both read and unread alerts are returned.

6. **Bulk Operations**: Bulk mark-as-read operations return the count of modified alerts, not the full alert objects.

