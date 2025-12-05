# Sessions API Documentation

This document describes the endpoint for updating WhatsApp session data. Use this documentation to implement the frontend service for managing session updates.

## Base URL

All endpoints are prefixed with `/conversations`

**Example:** `http://localhost:3000/conversations`

---

## Endpoints

### Update Session

Update the title of a WhatsApp session. Only the `title` field can be modified through this endpoint.

**Endpoint:** `PUT /conversations/sessions/:sessionId`

**Path Parameters:**
- `sessionId` (required, string): The unique session identifier

**Request Body:**
```json
{
  "title": "My Custom Session Title"
}
```

**Request Body Schema:**
```typescript
interface UpdateSessionRequest {
  title?: string;  // Optional: New title for the session
}
```

**Example Request:**
```http
PUT /conversations/sessions/session_123
Content-Type: application/json

{
  "title": "Sales Team WhatsApp"
}
```

**Example Response (Success):**
```json
{
  "message": "Session updated successfully",
  "sessionId": "session_123"
}
```

**Example Response (Session Not Found - 404):**
```json
{
  "statusCode": 404,
  "message": "Session not found: session_123",
  "error": "Not Found"
}
```

**Example Response (Validation Error - 400):**
```json
{
  "statusCode": 400,
  "message": [
    "title must be a string"
  ],
  "error": "Bad Request"
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
  "message": "Session not found: {sessionId}",
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

### TypeScript Interfaces

```typescript
interface UpdateSessionRequest {
  title?: string;
}

interface UpdateSessionResponse {
  message: string;
  sessionId: string;
}
```

### Example Service Implementation

```typescript
class SessionsService {
  private baseUrl = 'http://localhost:3000/conversations';

  /**
   * Update a session's title
   * @param sessionId - The unique session identifier
   * @param title - The new title for the session
   * @returns Promise resolving to the update response
   * @throws Error if the session is not found or update fails
   */
  async updateSession(
    sessionId: string,
    title: string
  ): Promise<UpdateSessionResponse> {
    const response = await fetch(`${this.baseUrl}/sessions/${sessionId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title }),
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Session not found: ${sessionId}`);
      }
      const error = await response.json();
      throw new Error(error.message || 'Failed to update session');
    }

    return response.json();
  }
}
```

### React Hook Example

```typescript
import { useState } from 'react';

function useUpdateSession() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateSession = async (sessionId: string, title: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `http://localhost:3000/conversations/sessions/${sessionId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ title }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update session');
      }

      const data = await response.json();
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { updateSession, loading, error };
}

// Usage in component:
function SessionSettings({ sessionId }: { sessionId: string }) {
  const { updateSession, loading, error } = useUpdateSession();
  const [title, setTitle] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSession(sessionId, title);
      alert('Session updated successfully!');
    } catch (err) {
      console.error('Failed to update session:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Session title"
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Updating...' : 'Update Session'}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </form>
  );
}
```

---

## Notes

1. **Editable Fields**: Only the `title` field can be updated through this endpoint. Other session properties (such as `status`, `refId`, `sessionData`, etc.) cannot be modified via this API.

2. **Title Validation**: The `title` field is optional and must be a string if provided. An empty string is allowed.

3. **Session ID**: The `sessionId` must match an existing session in the database. If the session doesn't exist, a 404 error will be returned.

4. **Idempotency**: Multiple requests with the same `title` value will result in the same state. The endpoint is idempotent.

5. **Response Format**: On success, the endpoint returns a simple confirmation message with the `sessionId` to verify which session was updated.

6. **Error Handling**: Always check the response status code and handle errors appropriately. The API returns descriptive error messages to help with debugging.

