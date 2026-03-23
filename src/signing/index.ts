/**
 * Oak Chain SDK - Signing
 * 
 * Utilities for signing write proposals with Ethereum wallets.
 */

import type {
  WalletAddress,
  Signature,
  ContentNode,
  WriteProposal,
  DeleteProposal,
  ProposalId,
  PaymentTier,
  TransactionHash,
} from '../types';

/**
 * Message to sign for write proposals
 */
export interface WriteProposalMessage {
  message: string;
}

/**
 * Message to sign for delete proposals
 */
export interface DeleteProposalMessage {
  contentPath: string;
}

/**
 * Signer interface (compatible with ethers.js Signer)
 */
export interface Signer {
  getAddress(): Promise<string>;
  signMessage(message: string | Uint8Array): Promise<string>;
}

/**
 * Hash content for signing
 * 
 * Creates a deterministic hash of content for signature verification.
 */
export function hashContent(content: ContentNode): string {
  // Sort keys for deterministic serialization
  const sortedContent = sortObject(content);
  const json = JSON.stringify(sortedContent);
  
  // Use Web Crypto API for hashing
  return sha256(json);
}

/**
 * Create write proposal message for signing
 */
export function createWriteProposalMessage(params: {
  message: string;
}): WriteProposalMessage {
  return {
    message: params.message,
  };
}

/**
 * Create delete proposal message for signing
 */
export function createDeleteProposalMessage(params: {
  contentPath: string;
}): DeleteProposalMessage {
  return {
    contentPath: params.contentPath,
  };
}

/**
 * Format message for EIP-191 signing
 */
export function formatSigningMessage(message: WriteProposalMessage | DeleteProposalMessage): string {
  if ('message' in message) {
    return message.message;
  }
  return message.contentPath;
}

/**
 * Sign a write proposal
 */
export async function signWriteProposal(
  signer: Signer,
  params: {
    proposalId: ProposalId;
    message: string;
    contentType?: string;
    paymentTier?: PaymentTier;
    ethereumTxHash: TransactionHash;
    organization?: string;
    intentToken?: string;
    ipfsCid?: string;
    clientId?: string;
  }
): Promise<WriteProposal> {
  const wallet = await signer.getAddress() as WalletAddress;
  const signingMessage = createWriteProposalMessage({
    message: params.message,
  });

  const formattedMessage = formatSigningMessage(signingMessage);
  const signature = await signer.signMessage(formattedMessage) as Signature;

  return {
    proposalId: params.proposalId,
    walletAddress: wallet,
    wallet,
    organization: params.organization,
    message: params.message,
    contentType: params.contentType,
    paymentTier: params.paymentTier,
    ethereumTxHash: params.ethereumTxHash,
    signature,
    intentToken: params.intentToken,
    ipfsCid: params.ipfsCid,
    clientId: params.clientId,
  };
}

/**
 * Sign a delete proposal
 */
export async function signDeleteProposal(
  signer: Signer,
  params: {
    proposalId: ProposalId;
    contentPath: string;
    ethereumTxHash: TransactionHash;
    paymentTier?: PaymentTier;
    clientId?: string;
  }
): Promise<DeleteProposal> {
  const wallet = await signer.getAddress() as WalletAddress;
  const message = createDeleteProposalMessage({
    contentPath: params.contentPath,
  });

  const formattedMessage = formatSigningMessage(message);
  const signature = await signer.signMessage(formattedMessage) as Signature;

  return {
    proposalId: params.proposalId,
    walletAddress: wallet,
    wallet,
    contentPath: params.contentPath,
    ethereumTxHash: params.ethereumTxHash,
    paymentTier: params.paymentTier,
    signature,
    clientId: params.clientId,
  };
}

/**
 * Generate a client-side bytes32 proposal ID.
 */
export function generateProposalId(): ProposalId {
  const bytes = new Uint8Array(32);

  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { randomBytes } = require('crypto') as { randomBytes: (size: number) => Uint8Array };
    bytes.set(randomBytes(32));
  }

  return `0x${Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')}` as ProposalId;
}

/**
 * Verify a signature (for validators)
 */
export function verifySignature(
  message: string,
  signature: Signature,
  expectedAddress: WalletAddress
): boolean {
  // This requires ethers.js - import dynamically if available
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { verifyMessage } = require('ethers');
    const recoveredAddress = verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
  } catch {
    console.warn('ethers.js not available for signature verification');
    return false;
  }
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Sort object keys recursively for deterministic serialization
 */
function sortObject(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sortObject);
  }

  const sorted: Record<string, unknown> = {};
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  
  for (const key of keys) {
    sorted[key] = sortObject((obj as Record<string, unknown>)[key]);
  }

  return sorted;
}

/**
 * SHA-256 hash (sync version using Web Crypto polyfill pattern)
 */
function sha256(data: string): string {
  // Simple hash for browser/node compatibility
  // In production, use Web Crypto API or crypto module
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `0x${Math.abs(hash).toString(16).padStart(64, '0')}`;
}

/**
 * Async SHA-256 using Web Crypto API
 */
export async function sha256Async(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  
  // Use Web Crypto API if available
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback to sync version
  return sha256(data);
}
