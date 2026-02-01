# Unipile Integration Guide

## Overview

This document describes the Unipile API integration for multi-platform social media publishing.

**Supported Platforms:**
- LinkedIn (with organization posting support)
- Instagram
- Twitter/X
- WhatsApp
- Messenger
- Telegram

## Architecture

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│   Frontend      │      │  Edge Functions  │      │   Unipile API   │
│   (React)       │◄────►│   (Supabase)     │◄────►│                 │
└─────────────────┘      └──────────────────┘      └─────────────────┘
        │                        │
        │                        ▼
        │                ┌──────────────────┐
        └───────────────►│   Supabase DB    │
                         │  (PostgreSQL)    │
                         └──────────────────┘
```

## Setup

### 1. Unipile Account

1. Create an account at [https://dashboard.unipile.com/signup](https://dashboard.unipile.com/signup)
2. Get your API credentials:
   - **API URL** (e.g., `https://api1.unipile.com:13111`)
   - **API Key** (X-API-KEY)

### 2. Environment Variables

Add these to your Supabase Edge Function secrets:

```bash
# In Supabase Dashboard > Project Settings > Edge Functions > Secrets
UNIPILE_API_URL=https://apiXXX.unipile.com:XXX
UNIPILE_API_KEY=your-api-key
APP_URL=https://your-app-domain.com
```

### 3. Database Migration

Run the migration to create required tables:

```bash
supabase db push
# or manually run: supabase/migrations/006_unipile_accounts.sql
```

### 4. Deploy Edge Functions

```bash
supabase functions deploy unipile-auth
supabase functions deploy unipile-callback
supabase functions deploy publish-post
```

## Usage

### Connecting a Social Account

```typescript
import { useUnipile } from '@/hooks/useUnipile';

function ConnectAccountButton() {
  const { connectAccount } = useUnipile();

  const handleConnect = async () => {
    // Generate hosted auth link
    const authUrl = await connectAccount(['LINKEDIN', 'INSTAGRAM']);
    
    if (authUrl) {
      // Redirect user to Unipile's hosted auth page
      window.location.href = authUrl;
    }
  };

  return <button onClick={handleConnect}>Connect Social Accounts</button>;
}
```

### Publishing to Multiple Accounts

```typescript
import { useUnipile } from '@/hooks/useUnipile';

function PublishButton({ content }: { content: string }) {
  const { accounts, publishPost } = useUnipile();

  const handlePublish = async () => {
    // Get active account IDs
    const accountIds = accounts
      .filter(a => a.status === 'OK')
      .map(a => a.id);

    const result = await publishPost(content, accountIds);
    
    if (result.success) {
      console.log('Published to:', result.results);
    }
  };

  return <button onClick={handlePublish}>Publish Now</button>;
}
```

### Scheduling Posts

```typescript
import { useScheduledPosts } from '@/hooks/useUnipile';

function SchedulePost() {
  const { schedulePost } = useScheduledPosts();

  const handleSchedule = async () => {
    const postId = await schedulePost(
      'My scheduled content',
      ['account-uuid-1', 'account-uuid-2'],
      new Date('2024-12-25T10:00:00Z')
    );
    
    console.log('Scheduled post ID:', postId);
  };
}
```

## Database Schema

### `unipile_accounts`
Stores connected social media accounts.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| profile_id | UUID | Link to profiles table |
| unipile_account_id | TEXT | Unipile's internal account ID |
| provider | ENUM | LINKEDIN, INSTAGRAM, etc. |
| account_name | TEXT | Display name |
| username | TEXT | Platform username |
| status | ENUM | OK, CREDENTIALS, ERROR, etc. |
| organizations | JSONB | LinkedIn organizations (for org posting) |

### `scheduled_posts`
Posts scheduled for future publishing.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| content | TEXT | Post content |
| scheduled_at | TIMESTAMPTZ | When to publish |
| status | TEXT | pending, published, failed, etc. |

### `scheduled_post_accounts`
Junction table linking posts to target accounts.

## API Endpoints

### Edge Functions

| Function | Method | Description |
|----------|--------|-------------|
| `/unipile-auth` | POST | Generate hosted auth link |
| `/unipile-callback` | POST | Webhook for account status updates |
| `/publish-post` | POST | Publish content to selected accounts |

## Rate Limits (LinkedIn)

| Action | Free Account | Paid Account |
|--------|--------------|--------------|
| Connection Requests | ~15/week | 80-100/day |
| Profile Visits | ~100/day | 100-150/day |
| Messages | N/A | 100-150/day |

## Security Considerations

1. **Never expose** `UNIPILE_API_KEY` to the frontend
2. All API calls go through Edge Functions
3. RLS policies protect user data
4. Webhook endpoint validates incoming requests

## Troubleshooting

### Account Shows "CREDENTIALS" Status
The account needs to be reconnected. Use `reconnectAccount(accountId)`.

### Checkpoint Errors
Some platforms (LinkedIn) may require 2FA. The hosted auth flow handles this automatically.

### Rate Limit Errors
Implement exponential backoff and respect platform limits.

## Resources

- [Unipile API Documentation](https://developer.unipile.com)
- [Hosted Auth Guide](https://developer.unipile.com/docs/hosted-auth)
- [LinkedIn Guide](https://developer.unipile.com/docs/linkedin)
- [Provider Limits](https://developer.unipile.com/docs/provider-limits-and-restrictions)
