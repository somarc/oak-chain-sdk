/**
 * Oak Chain SDK - Client
 * 
 * HTTP client for interacting with Oak Chain validators.
 */

import type {
  OakChainConfig,
  OakChainOptions,
  ApiResponse,
  PaginatedResponse,
  ContentNode,
  ContentPath,
  WriteProposal,
  WriteProposalResponse,
  DeleteProposal,
  DeleteProposalResponse,
  ClusterStatus,
  ValidatorInfo,
  PaymentTier,
  PaymentTierConfig,
  WalletAddress,
  TransactionHash,
} from '../types';

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Partial<OakChainConfig> = {
  timeout: 30000,
  retry: {
    maxRetries: 3,
    retryDelay: 1000,
  },
};

/**
 * Network configurations
 */
const NETWORK_CONFIGS: Record<string, Partial<OakChainConfig>> = {
  mainnet: {
    endpoint: 'https://validators.oak-chain.io',
    contractAddress: '0x0000000000000000000000000000000000000000' as WalletAddress, // TBD
  },
  sepolia: {
    endpoint: 'https://sepolia.validators.oak-chain.io',
    contractAddress: '0x0000000000000000000000000000000000000000' as WalletAddress, // TBD
  },
  localhost: {
    endpoint: 'http://localhost:8090',
  },
};

/**
 * Oak Chain Client
 * 
 * Main client for interacting with Oak Chain validators.
 */
export class OakChainClient {
  private config: OakChainConfig;

  constructor(options: OakChainOptions) {
    const networkConfig = NETWORK_CONFIGS[options.network] || {};
    
    this.config = {
      ...DEFAULT_CONFIG,
      ...networkConfig,
      ...options,
    } as OakChainConfig;

  }

  // ===========================================================================
  // CONTENT OPERATIONS
  // ===========================================================================

  /**
   * Read content from Oak Chain
   */
  async readContent(path: ContentPath): Promise<ApiResponse<ContentNode>> {
    return this.request<ContentNode>('GET', '/api/explore', {
      params: { path },
    });
  }

  /**
   * Read content with children
   */
  async readContentTree(
    path: ContentPath,
    depth: number = 1
  ): Promise<ApiResponse<ContentNode>> {
    void depth;
    return this.request<ContentNode>('GET', '/api/explore', {
      params: { path },
    });
  }

  /**
   * List children of a path
   */
  async listChildren(
    path: ContentPath,
    page: number = 0,
    pageSize: number = 100
  ): Promise<ApiResponse<PaginatedResponse<ContentNode>>> {
    void path;
    void page;
    void pageSize;
    return {
      success: false,
      error: {
        code: 'NOT_SUPPORTED',
        message: 'listChildren is not supported by the validator API (use /api/explore).',
      },
    };
  }

  /**
   * Check if path exists
   */
  async exists(path: ContentPath): Promise<boolean> {
    try {
      const response = await this.request<unknown>('GET', '/api/explore', {
        params: { path },
      });
      return response.success;
    } catch {
      return false;
    }
  }

  // ===========================================================================
  // WRITE OPERATIONS
  // ===========================================================================

  /**
   * Propose a write to Oak Chain
   * 
   * Requires payment transaction hash from smart contract.
   */
  async proposeWrite(proposal: WriteProposal): Promise<ApiResponse<WriteProposalResponse>> {
    return this.requestForm<WriteProposalResponse>('POST', '/v1/propose-write', proposal);
  }

  /**
   * Propose a delete to Oak Chain
   * 
   * Only the content owner (wallet) can delete.
   */
  async proposeDelete(proposal: DeleteProposal): Promise<ApiResponse<DeleteProposalResponse>> {
    return this.requestForm<DeleteProposalResponse>('POST', '/v1/propose-delete', proposal);
  }

  // ===========================================================================
  // PAYMENT OPERATIONS
  // ===========================================================================

  /**
   * Get payment tier configuration
   */
  async getPaymentTiers(): Promise<ApiResponse<PaymentTierConfig[]>> {
    return this.request<PaymentTierConfig[]>('GET', '/v1/payment/tiers');
  }

  /**
   * Verify a payment transaction
   */
  async verifyPayment(txHash: TransactionHash): Promise<ApiResponse<{
    verified: boolean;
    tier: PaymentTier;
    wallet: WalletAddress;
    expiresAt: number;
  }>> {
    return this.request('GET', `/v1/payment/verify/${txHash}`);
  }

  // ===========================================================================
  // CLUSTER OPERATIONS
  // ===========================================================================

  /**
   * Get cluster status
   */
  async getClusterStatus(): Promise<ApiResponse<ClusterStatus>> {
    return this.request<ClusterStatus>('GET', '/v1/consensus/status');
  }

  /**
   * Get validator list
   */
  async getValidators(): Promise<ApiResponse<ValidatorInfo[]>> {
    return this.request<ValidatorInfo[]>('GET', '/v1/peers');
  }

  /**
   * Get current leader
   */
  async getLeader(): Promise<ApiResponse<ValidatorInfo | null>> {
    const status = await this.request<ClusterStatus>('GET', '/v1/consensus/status');
    if (!status.success) {
      return status as ApiResponse<ValidatorInfo | null>;
    }
    const leaderUrl = status.data?.currentLeader;
    return {
      success: true,
      data: leaderUrl
        ? {
            id: 'leader',
            endpoint: leaderUrl,
            status: 'READY',
          }
        : null,
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.request<{ status: string }>('GET', '/health');
      return response.success && response.data?.status === 'ok';
    } catch {
      return false;
    }
  }

  // ===========================================================================
  // INTERNAL
  // ===========================================================================

  /**
   * Make HTTP request to validator
   */
  private async request<T>(
    method: string,
    path: string,
    options: {
      params?: Record<string, string>;
      body?: unknown;
      headers?: Record<string, string>;
    } = {}
  ): Promise<ApiResponse<T>> {
    const url = new URL(path, this.config.endpoint);
    
    if (options.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    };

    const fetchOptions: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(this.config.timeout || 30000),
    };

    if (options.body && method !== 'GET' && method !== 'HEAD') {
      const contentType = headers['Content-Type'];
      if (contentType === 'application/x-www-form-urlencoded') {
        if (options.body instanceof URLSearchParams) {
          fetchOptions.body = options.body.toString();
        } else if (typeof options.body === 'string') {
          fetchOptions.body = options.body;
        } else {
          const params = new URLSearchParams();
          Object.entries(options.body as Record<string, unknown>).forEach(([key, value]) => {
            if (value === undefined || value === null) {
              return;
            }
            params.set(key, String(value));
          });
          fetchOptions.body = params.toString();
        }
      } else {
        fetchOptions.body = JSON.stringify(options.body);
      }
    }

    let lastError: Error | null = null;
    const maxRetries = this.config.retry?.maxRetries || 3;
    const retryDelay = this.config.retry?.retryDelay || 1000;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url.toString(), fetchOptions);
        
        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          return {
            success: false,
            error: {
              code: `HTTP_${response.status}`,
              message: response.statusText,
              details: errorBody,
            },
          };
        }

        // HEAD requests don't have body
        if (method === 'HEAD') {
          return { success: true };
        }

        const data = await response.json();
        return {
          success: true,
          data: data as T,
        };
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on abort
        if (error instanceof DOMException && error.name === 'AbortError') {
          break;
        }

        // Wait before retry
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
        }
      }
    }

    return {
      success: false,
      error: {
        code: 'REQUEST_FAILED',
        message: lastError?.message || 'Request failed after retries',
      },
    };
  }

  /**
   * Make form-encoded request to validator
   */
  private async requestForm<T>(
    method: string,
    path: string,
    body: Record<string, unknown> | object
  ): Promise<ApiResponse<T>> {
    return this.request<T>(method, path, {
      body,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
    });
  }

  /**
   * Get current configuration
   */
  getConfig(): OakChainConfig {
    return { ...this.config };
  }
}

/**
 * Create Oak Chain client
 */
export function createClient(options: OakChainOptions): OakChainClient {
  return new OakChainClient(options);
}
