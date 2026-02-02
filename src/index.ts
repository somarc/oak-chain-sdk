/**
 * Oak Chain SDK
 * 
 * Official SDK for Oak Chain - decentralized content repository.
 * 
 * @packageDocumentation
 */

// =============================================================================
// TYPES
// =============================================================================

export type {
  // Wallet & Identity
  WalletAddress,
  TransactionHash,
  CID,
  Signature,
  
  // Content
  ContentPath,
  NodeType,
  ContentNode,
  BinaryReference,
  
  // Payment
  PaymentTier,
  PaymentTierConfig,
  PaymentRequest,
  PaymentReceipt,
  
  // Write Operations
  WriteProposal,
  WriteProposalResponse,
  DeleteProposal,
  DeleteProposalResponse,
  
  // Streaming
  SSEEventType,
  SSEEvent,
  ContentChangeEvent,
  EpochFinalizedEvent,
  
  // Cluster
  ValidatorInfo,
  ClusterStatus,
  
  // API
  ApiResponse,
  PaginatedResponse,
  
  // Config
  OakChainConfig,
  OakChainOptions,
} from './types';

// =============================================================================
// CLIENT
// =============================================================================

export { OakChainClient, createClient } from './client';

// =============================================================================
// SIGNING
// =============================================================================

export {
  hashContent,
  createWriteProposalMessage,
  createDeleteProposalMessage,
  formatSigningMessage,
  signWriteProposal,
  signDeleteProposal,
  verifySignature,
  sha256Async,
} from './signing';

export type {
  WriteProposalMessage,
  DeleteProposalMessage,
  Signer,
} from './signing';

// =============================================================================
// STREAMING
// =============================================================================

export {
  OakChainSSE,
  createSSEClient,
} from './streaming';

export type {
  SSEOptions,
  SSEEventHandler,
  SSEErrorHandler,
  SSEConnectionState,
} from './streaming';

// =============================================================================
// IPFS
// =============================================================================

export {
  OakChainIPFS,
  createIPFSClient,
  createBinaryReference,
  parseBinaryReference,
  findFastestGateway,
  PUBLIC_GATEWAYS,
} from './ipfs';

export type {
  IPFSOptions,
  UploadResult,
} from './ipfs';

// =============================================================================
// CONVENIENCE
// =============================================================================

/**
 * Create a fully configured Oak Chain instance
 * 
 * @example
 * ```ts
 * import { OakChain } from '@oak-chain/sdk';
 * 
 * const oak = new OakChain({
 *   network: 'sepolia',
 *   signer: wallet,
 * });
 * 
 * // Read content
 * const content = await oak.client.readContent('/oak-chain/0x.../content/page');
 * 
 * // Subscribe to changes
 * oak.sse.onContentChange((event) => {
 *   console.log('Content changed:', event.data.path);
 * });
 * oak.sse.connect();
 * 
 * // Upload binary
 * const { cid } = await oak.ipfs.upload(file);
 * ```
 */
export class OakChain {
  /** HTTP client for API calls */
  public readonly client: import('./client').OakChainClient;
  
  /** SSE client for streaming */
  public readonly sse: import('./streaming').OakChainSSE;
  
  /** IPFS client for binaries */
  public readonly ipfs: import('./ipfs').OakChainIPFS;

  constructor(options: import('./types').OakChainOptions & {
    ipfs?: import('./ipfs').IPFSOptions;
  }) {
    const { OakChainClient } = require('./client');
    const { OakChainSSE } = require('./streaming');
    const { OakChainIPFS } = require('./ipfs');

    this.client = new OakChainClient(options);
    this.sse = new OakChainSSE({ endpoint: options.endpoint });
    this.ipfs = new OakChainIPFS(options.ipfs);
  }

  /**
   * Connect SSE streaming
   */
  connect(): void {
    this.sse.connect();
  }

  /**
   * Disconnect SSE streaming
   */
  disconnect(): void {
    this.sse.disconnect();
  }
}

/**
 * SDK Version
 */
export const VERSION = '0.1.0';

/**
 * Default export
 */
export default OakChain;
