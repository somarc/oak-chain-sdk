/**
 * Oak Chain SDK - Core Types
 * 
 * Type definitions for the Oak Chain decentralized content repository.
 */

// =============================================================================
// WALLET & IDENTITY
// =============================================================================

/**
 * Ethereum wallet address (0x-prefixed, 42 characters)
 */
export type WalletAddress = `0x${string}`;

/**
 * Ethereum transaction hash
 */
export type TransactionHash = `0x${string}`;

/**
 * Oak Chain proposal identifier (chain-backed bytes32 hex)
 */
export type ProposalId = `0x${string}`;

/**
 * IPFS Content Identifier (CIDv1)
 */
export type CID = string;

/**
 * Signature from wallet (secp256k1)
 */
export type Signature = `0x${string}`;

// =============================================================================
// CONTENT PATHS
// =============================================================================

/**
 * Oak Chain content path
 * Format: /oak-chain/{L1}/{L2}/{L3}/0x{wallet}/{organization}/content/...
 */
export type ContentPath = string;

/**
 * JCR node types supported by Oak Chain
 */
export type NodeType = 
  | 'nt:unstructured'
  | 'nt:folder'
  | 'nt:file'
  | 'nt:resource'
  | 'dam:Asset'
  | 'cq:Page'
  | 'cq:PageContent';

/**
 * Content node in Oak Chain
 */
export interface ContentNode {
  /** JCR primary type */
  'jcr:primaryType': NodeType;
  /** JCR mixin types */
  'jcr:mixinTypes'?: string[];
  /** Creation timestamp */
  'jcr:created'?: string;
  /** Last modified timestamp */
  'jcr:lastModified'?: string;
  /** Author wallet address */
  'oak:author'?: WalletAddress;
  /** Content signature */
  'oak:signature'?: Signature;
  /** Child nodes */
  [key: string]: unknown;
}

/**
 * Binary reference in Oak Chain (CID-only model)
 */
export interface BinaryReference {
  /** IPFS CID of the binary */
  'ipfs:cid': CID;
  /** MIME type */
  'jcr:mimeType': string;
  /** File size in bytes */
  size: number;
  /** Original filename */
  filename?: string;
}

// =============================================================================
// PAYMENT
// =============================================================================

/**
 * Payment class carried through contract and policy surfaces.
 *
 * This is not a public latency bucket.
 */
export type PaymentTier = 'priority' | 'express' | 'standard';

/**
 * Compatibility-only payment-class configuration
 */
export interface PaymentTierConfig {
  /** Tier name */
  tier: PaymentTier;
  /** Price in wei */
  priceWei: bigint;
  /** Price in ETH (display) */
  priceEth: string;
  /** Confirmation time in seconds */
  confirmationTime: number;
  /** Description */
  description: string;
}

/**
 * Payment request for write operation
 */
export interface PaymentRequest {
  /** Payer wallet address */
  wallet: WalletAddress;
  /** Payment tier */
  tier: PaymentTier;
  /** Amount in wei */
  amount: bigint;
  /** Optional: specific path being paid for */
  path?: ContentPath;
}

/**
 * Payment receipt from smart contract
 */
export interface PaymentReceipt {
  /** Transaction hash */
  txHash: TransactionHash;
  /** Block number */
  blockNumber: number;
  /** Payment ID from contract */
  paymentId: string;
  /** Tier paid for */
  tier: PaymentTier;
  /** Amount paid in wei */
  amount: bigint;
  /** Timestamp */
  timestamp: number;
  /** Expiration timestamp */
  expiresAt: number;
}

// =============================================================================
// WRITE PROPOSALS
// =============================================================================

/**
 * Write proposal to Oak Chain
 */
export interface WriteProposal {
  /** Client-supplied bytes32 proposal ID */
  proposalId: ProposalId;
  /** Author wallet address */
  walletAddress: WalletAddress;
  /** Backward-compatible wallet field (use walletAddress) */
  wallet?: WalletAddress;
  /** Organization/brand scope */
  organization?: string;
  /** Content to write (JSON string or text) */
  message: string;
  /** Content type (default "page") */
  contentType?: string;
  /** Payment transaction hash */
  ethereumTxHash: TransactionHash;
  /** Payment tier */
  paymentTier?: PaymentTier;
  /** Signature of the proposal */
  signature: Signature;
  /** Optional upload intent token */
  intentToken?: string;
  /** Optional IPFS CID for client-side upload */
  ipfsCid?: CID;
  /** Optional client identifier */
  clientId?: string;
}

/**
 * Write proposal response
 */
export interface WriteProposalResponse {
  /** Proposal ID */
  proposalId: string;
  /** Type */
  type?: 'WRITE';
  /** State */
  state?: 'PENDING' | 'VERIFIED' | 'COMMITTED' | 'REJECTED';
  /** Response message */
  message?: string;
  /** Payment transaction hash */
  ethereumTxHash?: TransactionHash;
  /** Timeout timestamp */
  timeoutTimestamp?: number;
  /** Wallet address */
  wallet?: WalletAddress;
  /** Full path where content was written */
  storagePath?: ContentPath;
  /** Content type */
  contentType?: string;
  /** Error message if rejected */
  error?: string;
}

/**
 * Delete proposal to Oak Chain
 */
export interface DeleteProposal {
  /** Client-supplied bytes32 proposal ID */
  proposalId: ProposalId;
  /** Author wallet address */
  walletAddress: WalletAddress;
  /** Backward-compatible wallet field (use walletAddress) */
  wallet?: WalletAddress;
  /** Full path to delete */
  contentPath: ContentPath;
  /** Payment transaction hash */
  ethereumTxHash: TransactionHash;
  /** Payment class (policy metadata, not latency bucket) */
  paymentTier?: PaymentTier;
  /** Signature of the proposal */
  signature: Signature;
  /** Optional client identifier */
  clientId?: string;
}

/**
 * Delete proposal response
 */
export interface DeleteProposalResponse {
  /** Proposal ID */
  proposalId: string;
  /** Type */
  type?: 'DELETE';
  /** State */
  state?: 'PENDING' | 'VERIFIED' | 'COMMITTED' | 'REJECTED';
  /** Response message */
  message?: string;
  /** Payment transaction hash */
  ethereumTxHash?: TransactionHash;
  /** Tier */
  tier?: 'STANDARD' | 'EXPRESS' | 'PRIORITY';
  /** Timeout timestamp */
  timeoutTimestamp?: number;
  /** Wallet address */
  wallet?: WalletAddress;
  /** Content path */
  contentPath?: ContentPath;
  /** GC debt incurred */
  gcDebtIncurred?: string;
  /** Total GC debt */
  totalDebt?: string;
  /** Pending GC debt */
  pendingDebt?: string;
  /** Writes blocked flag */
  writesBlocked?: boolean;
  /** Error message if rejected */
  error?: string;
}

// =============================================================================
// STREAMING (SSE)
// =============================================================================

/**
 * SSE event types
 */
export type SSEEventType = 
  | 'content-created'
  | 'content-updated'
  | 'content-deleted'
  | 'binary-added'
  | 'epoch-finalized'
  | 'leader-changed'
  | 'heartbeat';

/**
 * SSE event from validator
 */
export interface SSEEvent<T = unknown> {
  /** Event type */
  type: SSEEventType;
  /** Event ID */
  id: string;
  /** Timestamp */
  timestamp: number;
  /** Event data */
  data: T;
}

/**
 * Content change event data
 */
export interface ContentChangeEvent {
  /** Path that changed */
  path: ContentPath;
  /** Author wallet */
  author: WalletAddress;
  /** Change type */
  changeType: 'created' | 'updated' | 'deleted';
  /** Commit index */
  commitIndex: number;
}

/**
 * Epoch finalized event data
 */
export interface EpochFinalizedEvent {
  /** Epoch number */
  epoch: number;
  /** Finalization timestamp */
  finalizedAt: number;
  /** Payments processed in this epoch */
  paymentsProcessed: number;
}

// =============================================================================
// VALIDATOR & CLUSTER
// =============================================================================

/**
 * Validator node information
 */
export interface ValidatorInfo {
  /** Validator ID */
  validatorId?: string;
  /** Validator URL */
  validatorUrl?: string;
  /** Status (READY, PROBATION, OFFLINE) */
  status?: 'READY' | 'PROBATION' | 'OFFLINE';
  /** Last seen timestamp (ms) */
  lastSeen?: number;
  /** Endpoint alias (compat) */
  endpoint?: string;
  /** Generic ID (compat) */
  id?: string;
}

/**
 * Cluster status
 */
export interface ClusterStatus {
  /** Consensus type */
  consensusType?: string;
  /** Current role */
  currentRole?: string;
  /** Is leader */
  isLeader?: boolean;
  /** Current leader URL */
  currentLeader?: string;
  /** Current epoch */
  currentEpoch?: number;
  /** Current term */
  currentTerm?: number;
  /** Reachable validators */
  reachableValidators?: number;
  /** Followers */
  allFollowers?: string[];
  /** Ethereum epoch */
  ethereumEpoch?: number;
  /** Allow additional fields */
  [key: string]: unknown;
}

/**
 * Proposal status from the validator API
 */
export interface ProposalStatus {
  /** Proposal ID */
  proposalId: string;
  /** Proposal kind */
  type?: 'WRITE' | 'DELETE';
  /** Lifecycle state */
  state?: 'PENDING' | 'VERIFIED' | 'COMMITTED' | 'REJECTED';
  /** Optional message */
  message?: string;
  /** Allow additional fields */
  [key: string]: unknown;
}

/**
 * Validator blockchain/runtime config surface
 */
export interface BlockchainRuntimeConfig {
  /** Public scheduler model */
  schedulerModel?: string;
  /** Operator toggle for premium direct release */
  priorityDirectReleaseEnabled?: boolean;
  /** Human-readable payment class semantics */
  paymentClasses?: Record<string, unknown>;
  /** Allow additional fields */
  [key: string]: unknown;
}

/**
 * Release-flow overview from the validator
 */
export interface ReleaseFlowSnapshot {
  /** Public scheduler model */
  schedulerModel?: string;
  /** Ordered release stages */
  stages?: string[];
  /** Allow additional fields */
  [key: string]: unknown;
}

// =============================================================================
// API RESPONSES
// =============================================================================

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  /** Success flag */
  success: boolean;
  /** Response data */
  data?: T;
  /** Error information */
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  /** Request metadata */
  meta?: {
    requestId: string;
    timestamp: number;
    duration: number;
  };
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  /** Items in current page */
  items: T[];
  /** Total count */
  total: number;
  /** Current page (0-indexed) */
  page: number;
  /** Page size */
  pageSize: number;
  /** Has more pages */
  hasMore: boolean;
  /** Cursor for next page */
  nextCursor?: string;
}

// =============================================================================
// SDK CONFIGURATION
// =============================================================================

/**
 * Oak Chain SDK configuration
 */
export interface OakChainConfig {
  /** Validator endpoint URL */
  endpoint: string;
  /** Network (mainnet, sepolia, localhost) */
  network: 'mainnet' | 'sepolia' | 'localhost';
  /** Smart contract address */
  contractAddress?: WalletAddress;
  /** Request timeout in ms */
  timeout?: number;
  /** Retry configuration */
  retry?: {
    maxRetries: number;
    retryDelay: number;
  };
}

/**
 * SDK initialization options
 */
export interface OakChainOptions extends OakChainConfig {
  /** Wallet for signing (ethers Signer or private key) */
  signer?: unknown;
  /** IPFS gateway URL */
  ipfsGateway?: string;
}
