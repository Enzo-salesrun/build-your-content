/**
 * Unipile API Client
 * Documentation: https://developer.unipile.com
 */

// Types for Unipile API
export interface UnipileConfig {
  baseUrl: string;
  apiKey: string;
}

export type UnipileProvider = 
  | 'LINKEDIN' 
  | 'INSTAGRAM' 
  | 'TWITTER' 
  | 'WHATSAPP' 
  | 'MESSENGER' 
  | 'TELEGRAM';

export type AccountStatus = 'OK' | 'CREDENTIALS' | 'DISCONNECTED' | 'ERROR';

export interface UnipileAccount {
  id: string;
  object: 'Account';
  type: UnipileProvider;
  name: string;
  created_at: string;
  connection_params: {
    im?: {
      id: string;
      username?: string;
      publicIdentifier?: string;
      organizations?: Array<{
        name: string;
        messaging_enabled: boolean;
        organization_urn: string;
      }>;
    };
  };
  sources: Array<{
    id: string;
    status: AccountStatus;
  }>;
}

export interface UnipileAccountList {
  object: 'AccountList';
  items: UnipileAccount[];
  cursor: string | null;
}

export interface HostedAuthRequest {
  type: 'create' | 'reconnect';
  providers: UnipileProvider[] | '*';
  api_url: string;
  expiresOn: string;
  notify_url?: string;
  success_redirect_url?: string;
  failure_redirect_url?: string;
  name?: string; // Internal user ID for matching
  reconnect_account?: string; // Required for reconnect type
}

export interface HostedAuthResponse {
  object: 'HostedAuthURL';
  url: string;
}

export interface CreatePostRequest {
  account_id: string;
  text: string;
  attachments?: File[];
  repost?: string; // LinkedIn post ID for repost
  mentions?: Array<{
    identifier: string;
    name: string;
  }>;
  external_link?: string; // LinkedIn only
  as_organization?: string; // LinkedIn organization ID
  location?: string; // Instagram only
}

export interface CreatePostResponse {
  object: 'PostCreated';
  post_id: string;
}

export interface UnipileCheckpoint {
  object: 'Checkpoint';
  account_id: string;
  checkpoint: {
    type: '2FA' | 'OTP' | 'IN_APP_VALIDATION' | 'CAPTCHA' | 'PHONE_REGISTER';
  };
}

export interface UnipileError {
  title: string;
  detail?: string;
  type: string;
  status: number;
}

// Webhook callback payload
export interface AccountWebhookPayload {
  status: 'CREATION_SUCCESS' | 'RECONNECTED' | 'CREDENTIALS' | 'ERROR';
  account_id: string;
  name?: string; // Your internal user ID
}

/**
 * Unipile API Client Class
 */
export class UnipileClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(config: UnipileConfig) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'X-API-KEY': this.apiKey,
        'Accept': 'application/json',
        ...(options.headers || {}),
      },
    });

    if (!response.ok) {
      const error: UnipileError = await response.json();
      throw new Error(error.detail || error.title || 'Unipile API Error');
    }

    return response.json();
  }

  // ============================================
  // ACCOUNTS
  // ============================================

  /**
   * List all connected accounts
   */
  async listAccounts(options?: { 
    cursor?: string; 
    limit?: number 
  }): Promise<UnipileAccountList> {
    const params = new URLSearchParams();
    if (options?.cursor) params.set('cursor', options.cursor);
    if (options?.limit) params.set('limit', options.limit.toString());
    
    const query = params.toString() ? `?${params}` : '';
    return this.request<UnipileAccountList>(`/api/v1/accounts${query}`);
  }

  /**
   * Get a specific account by ID
   */
  async getAccount(accountId: string): Promise<UnipileAccount> {
    return this.request<UnipileAccount>(`/api/v1/accounts/${accountId}`);
  }

  /**
   * Delete an account connection
   */
  async deleteAccount(accountId: string): Promise<void> {
    await this.request(`/api/v1/accounts/${accountId}`, {
      method: 'DELETE',
    });
  }

  // ============================================
  // HOSTED AUTHENTICATION
  // ============================================

  /**
   * Generate a hosted authentication link
   * This is the recommended method for connecting user accounts
   */
  async createHostedAuthLink(params: HostedAuthRequest): Promise<HostedAuthResponse> {
    return this.request<HostedAuthResponse>('/api/v1/hosted/accounts/link', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });
  }

  // ============================================
  // POSTS
  // ============================================

  /**
   * Create a post on a connected social account
   */
  async createPost(params: CreatePostRequest): Promise<CreatePostResponse> {
    const formData = new FormData();
    formData.append('account_id', params.account_id);
    formData.append('text', params.text);
    
    if (params.attachments) {
      params.attachments.forEach((file) => {
        formData.append('attachments', file);
      });
    }
    
    if (params.repost) {
      formData.append('repost', params.repost);
    }
    
    if (params.mentions) {
      formData.append('mentions', JSON.stringify(params.mentions));
    }
    
    if (params.external_link) {
      formData.append('external_link', params.external_link);
    }
    
    if (params.as_organization) {
      formData.append('as_organization', params.as_organization);
    }
    
    if (params.location) {
      formData.append('location', params.location);
    }

    return this.request<CreatePostResponse>('/api/v1/posts', {
      method: 'POST',
      body: formData,
    });
  }

  // ============================================
  // CUSTOM AUTHENTICATION (Advanced)
  // ============================================

  /**
   * Connect a LinkedIn account with credentials
   * Note: Prefer Hosted Auth for most use cases
   */
  async connectLinkedIn(params: {
    username: string;
    password: string;
    proxy?: {
      host: string;
      port: number;
      username?: string;
      password?: string;
    };
  }): Promise<UnipileAccount | UnipileCheckpoint> {
    return this.request('/api/v1/accounts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        provider: 'LINKEDIN',
        ...params,
      }),
    });
  }

  /**
   * Solve a 2FA or OTP checkpoint
   */
  async solveCheckpoint(params: {
    provider: UnipileProvider;
    account_id: string;
    code: string;
  }): Promise<UnipileAccount | UnipileCheckpoint> {
    return this.request('/api/v1/accounts/checkpoint', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });
  }
}

/**
 * Helper to create expiration date for hosted auth links
 * @param minutes Number of minutes from now
 */
export function createExpirationDate(minutes: number = 30): string {
  const date = new Date();
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
}

/**
 * Provider display info for UI
 */
export const UNIPILE_PROVIDERS: Record<UnipileProvider, {
  name: string;
  color: string;
  icon: string;
}> = {
  LINKEDIN: { name: 'LinkedIn', color: '#0A66C2', icon: 'linkedin' },
  INSTAGRAM: { name: 'Instagram', color: '#E4405F', icon: 'instagram' },
  TWITTER: { name: 'X (Twitter)', color: '#000000', icon: 'twitter' },
  WHATSAPP: { name: 'WhatsApp', color: '#25D366', icon: 'message-circle' },
  MESSENGER: { name: 'Messenger', color: '#0084FF', icon: 'message-square' },
  TELEGRAM: { name: 'Telegram', color: '#0088CC', icon: 'send' },
};

/**
 * LinkedIn activity limits (recommended daily maximums)
 */
export const LINKEDIN_LIMITS = {
  invitations: { free: 15, paid: 100, weekly_max: 200 },
  profile_visits: { free: 100, premium: 100, sales_navigator: 150 },
  messages: { daily_max: 150 },
} as const;
