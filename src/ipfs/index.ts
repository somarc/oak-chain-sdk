/**
 * Oak Chain SDK - IPFS
 * 
 * Utilities for IPFS binary storage integration.
 */

import type { CID, BinaryReference } from '../types';

/**
 * IPFS client options
 */
export interface IPFSOptions {
  /** IPFS HTTP API endpoint (for uploads) */
  apiEndpoint?: string;
  /** IPFS gateway URL (for reads) */
  gatewayUrl?: string;
  /** Request timeout in ms */
  timeout?: number;
}

/**
 * Default IPFS configuration
 */
const DEFAULT_OPTIONS: Required<IPFSOptions> = {
  apiEndpoint: 'http://localhost:5001',
  gatewayUrl: 'https://ipfs.io',
  timeout: 60000,
};

/**
 * Upload result
 */
export interface UploadResult {
  /** IPFS CID */
  cid: CID;
  /** File size in bytes */
  size: number;
  /** MIME type */
  mimeType: string;
  /** Gateway URL for retrieval */
  gatewayUrl: string;
}

/**
 * Oak Chain IPFS Client
 * 
 * Handles binary uploads to IPFS and CID management.
 */
export class OakChainIPFS {
  private options: Required<IPFSOptions>;

  constructor(options: IPFSOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Upload a file to IPFS
   * 
   * Returns the CID to store in Oak Chain.
   */
  async upload(file: File | Blob | ArrayBuffer, options?: {
    filename?: string;
    mimeType?: string;
  }): Promise<UploadResult> {
    const formData = new FormData();
    
    let blob: Blob;
    if (file instanceof ArrayBuffer) {
      blob = new Blob([file], { type: options?.mimeType || 'application/octet-stream' });
    } else {
      blob = file;
    }

    formData.append('file', blob, options?.filename || 'file');

    const response = await fetch(`${this.options.apiEndpoint}/api/v0/add`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(this.options.timeout),
    });

    if (!response.ok) {
      throw new Error(`IPFS upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    const cid = result.Hash as CID;
    const size = parseInt(result.Size, 10);
    const mimeType = options?.mimeType || (file instanceof File ? file.type : 'application/octet-stream');

    return {
      cid,
      size,
      mimeType,
      gatewayUrl: this.getGatewayUrl(cid),
    };
  }

  /**
   * Upload from URL
   */
  async uploadFromUrl(url: string, options?: {
    filename?: string;
    mimeType?: string;
  }): Promise<UploadResult> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.statusText}`);
    }

    const blob = await response.blob();
    const filename = options?.filename || url.split('/').pop() || 'file';
    const mimeType = options?.mimeType || response.headers.get('content-type') || 'application/octet-stream';

    return this.upload(blob, { filename, mimeType });
  }

  /**
   * Get gateway URL for a CID
   */
  getGatewayUrl(cid: CID, filename?: string): string {
    const base = `${this.options.gatewayUrl}/ipfs/${cid}`;
    return filename ? `${base}?filename=${encodeURIComponent(filename)}` : base;
  }

  /**
   * Fetch binary from IPFS
   */
  async fetch(cid: CID): Promise<ArrayBuffer> {
    const url = this.getGatewayUrl(cid);
    const response = await fetch(url, {
      signal: AbortSignal.timeout(this.options.timeout),
    });

    if (!response.ok) {
      throw new Error(`IPFS fetch failed: ${response.statusText}`);
    }

    return response.arrayBuffer();
  }

  /**
   * Fetch as Blob
   */
  async fetchBlob(cid: CID, mimeType?: string): Promise<Blob> {
    const buffer = await this.fetch(cid);
    return new Blob([buffer], { type: mimeType || 'application/octet-stream' });
  }

  /**
   * Check if CID is available
   */
  async isAvailable(cid: CID): Promise<boolean> {
    try {
      const url = this.getGatewayUrl(cid);
      const response = await fetch(url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(10000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Calculate CID without uploading (for verification)
   * 
   * Note: This requires the IPFS API to be available.
   */
  async calculateCID(data: ArrayBuffer | Blob): Promise<CID> {
    const formData = new FormData();
    const blob = data instanceof Blob ? data : new Blob([data]);
    formData.append('file', blob);

    const response = await fetch(`${this.options.apiEndpoint}/api/v0/add?only-hash=true`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(this.options.timeout),
    });

    if (!response.ok) {
      throw new Error(`CID calculation failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.Hash as CID;
  }

  /**
   * Verify binary matches CID
   */
  async verify(cid: CID, data: ArrayBuffer | Blob): Promise<boolean> {
    const calculatedCID = await this.calculateCID(data);
    return calculatedCID === cid;
  }
}

/**
 * Create IPFS client
 */
export function createIPFSClient(options?: IPFSOptions): OakChainIPFS {
  return new OakChainIPFS(options);
}

/**
 * Create binary reference for Oak Chain
 */
export function createBinaryReference(
  cid: CID,
  mimeType: string,
  size: number,
  filename?: string
): BinaryReference {
  return {
    'ipfs:cid': cid,
    'jcr:mimeType': mimeType,
    size,
    filename,
  };
}

/**
 * Parse binary reference from Oak Chain content
 */
export function parseBinaryReference(node: Record<string, unknown>): BinaryReference | null {
  const cid = node['ipfs:cid'];
  const mimeType = node['jcr:mimeType'];
  const size = node['size'];

  if (typeof cid !== 'string' || typeof mimeType !== 'string' || typeof size !== 'number') {
    return null;
  }

  return {
    'ipfs:cid': cid as CID,
    'jcr:mimeType': mimeType,
    size,
    filename: typeof node['filename'] === 'string' ? node['filename'] : undefined,
  };
}

/**
 * List of public IPFS gateways
 */
export const PUBLIC_GATEWAYS = [
  'https://ipfs.io',
  'https://dweb.link',
  'https://cloudflare-ipfs.com',
  'https://gateway.pinata.cloud',
  'https://w3s.link',
] as const;

/**
 * Find fastest available gateway for a CID
 */
export async function findFastestGateway(cid: CID, gateways: string[] = [...PUBLIC_GATEWAYS]): Promise<string | null> {
  const controller = new AbortController();
  
  try {
    const result = await Promise.race(
      gateways.map(async (gateway) => {
        const url = `${gateway}/ipfs/${cid}`;
        const response = await fetch(url, {
          method: 'HEAD',
          signal: controller.signal,
        });
        if (response.ok) {
          return gateway;
        }
        throw new Error('Not available');
      })
    );
    
    controller.abort(); // Cancel other requests
    return result;
  } catch {
    return null;
  }
}
