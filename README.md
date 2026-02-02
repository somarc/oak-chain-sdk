# @oak-chain/sdk

Official SDK for Oak Chain - decentralized content repository built on Jackrabbit Oak with Ethereum payments and IPFS binary storage.

## Installation

```bash
npm install @oak-chain/sdk
# or
yarn add @oak-chain/sdk
# or
pnpm add @oak-chain/sdk
```

### Peer Dependencies

For signing and payment operations, you'll need ethers.js:

```bash
npm install ethers
```

## Quick Start

```typescript
import { OakChain } from '@oak-chain/sdk';
import { ethers } from 'ethers';

// Create SDK instance
const oak = new OakChain({
  network: 'sepolia', // or 'mainnet', 'localhost'
  signer: wallet, // ethers.js Signer
});

// Read content
const response = await oak.client.readContent('/oak-chain/0x742d.../content/page');
if (response.success) {
  console.log(response.data);
}

// Subscribe to real-time updates
oak.sse.onContentChange((event) => {
  console.log('Content changed:', event.data.path);
});
oak.connect();
```

## Features

### Content Operations

```typescript
import { createClient } from '@oak-chain/sdk';

const client = createClient({
  endpoint: 'https://validators.oak-chain.io',
  network: 'mainnet',
});

// Read content (maps to /api/explore?path=...)
const content = await client.readContent('/oak-chain/0x.../content/page');

// Read tree depth is not supported by the validator API (reserved for future)
const tree = await client.readContentTree('/oak-chain/0x.../content', 2); // returns NOT_SUPPORTED

// List children is not supported by the validator API (reserved for future)
const children = await client.listChildren('/oak-chain/0x.../content'); // returns NOT_SUPPORTED

// Check existence
const exists = await client.exists('/oak-chain/0x.../content/page');
```

### Write Operations

```typescript
import { signWriteProposal } from '@oak-chain/sdk';
import { ethers } from 'ethers';

// 1. Pay for write via smart contract (get txHash)
const txHash = await payForWrite(wallet, 'express');

// 2. Sign the write proposal
const proposal = await signWriteProposal(wallet, {
  message: JSON.stringify({
    'jcr:primaryType': 'nt:unstructured',
    'jcr:title': 'My Page',
    'text': 'Hello, Oak Chain!',
  }),
  organization: 'MyOrg',
  paymentTier: 'express',
  ethereumTxHash: txHash,
});

// 3. Submit to validators
const result = await client.proposeWrite(proposal);
```

### Real-Time Streaming (SSE)

```typescript
import { createSSEClient } from '@oak-chain/sdk';

const sse = createSSEClient({
  endpoint: 'https://validators.oak-chain.io',
  eventTypes: ['content', 'delete', 'binary', 'wallet', 'consensus'],
});

// Subscribe to content changes
sse.onContentChange((event) => {
  console.log(`${event.data.action}: ${event.data.path}`);
});

// Subscribe to epoch finalization
sse.onEpochFinalized((event) => {
  console.log(`Epoch ${event.data.epoch} finalized`);
});

// Handle connection state
sse.onStateChange((state) => {
  console.log('Connection state:', state);
});

// Connect
sse.connect();

// Later: disconnect
sse.disconnect();
```

### IPFS Binary Storage

```typescript
import { createIPFSClient, createBinaryReference } from '@oak-chain/sdk';

const ipfs = createIPFSClient({
  apiEndpoint: 'http://localhost:5001',
  gatewayUrl: 'https://ipfs.io',
});

// Upload a file
const file = new File(['Hello, IPFS!'], 'hello.txt', { type: 'text/plain' });
const { cid, size, mimeType } = await ipfs.upload(file);

// Create binary reference for Oak Chain
const binaryRef = createBinaryReference(cid, mimeType, size, 'hello.txt');

// Include in content write
const content = {
  'jcr:primaryType': 'dam:Asset',
  'jcr:content': {
    'renditions': {
      'original': binaryRef,
    },
  },
};

// Fetch binary
const data = await ipfs.fetch(cid);

// Verify binary matches CID
const isValid = await ipfs.verify(cid, data);
```

## API Reference

### OakChainClient

Main client for HTTP API operations.

| Method | Description |
|--------|-------------|
| `readContent(path)` | Read content node |
| `readContentTree(path, depth)` | Not supported (reserved for future) |
| `listChildren(path, page, pageSize)` | Not supported (reserved for future) |
| `exists(path)` | Check if path exists |
| `proposeWrite(proposal)` | Submit write proposal |
| `proposeDelete(proposal)` | Submit delete proposal |
| `getPaymentTiers()` | Get payment tier config |
| `verifyPayment(txHash)` | Verify payment transaction |
| `getClusterStatus()` | Get cluster status |
| `getValidators()` | Get validator list |
| `healthCheck()` | Health check |

### OakChainSSE

SSE client for real-time streaming.

| Method | Description |
|--------|-------------|
| `connect()` | Connect to SSE stream |
| `disconnect()` | Disconnect from stream |
| `on(eventType, handler)` | Subscribe to event type |
| `onContentChange(handler)` | Subscribe to content changes |
| `onEpochFinalized(handler)` | Subscribe to epoch events |
| `onError(handler)` | Subscribe to errors |
| `onStateChange(handler)` | Subscribe to state changes |

### OakChainIPFS

IPFS client for binary storage.

| Method | Description |
|--------|-------------|
| `upload(file, options)` | Upload file to IPFS |
| `uploadFromUrl(url, options)` | Upload from URL |
| `fetch(cid)` | Fetch binary by CID |
| `fetchBlob(cid, mimeType)` | Fetch as Blob |
| `isAvailable(cid)` | Check CID availability |
| `calculateCID(data)` | Calculate CID without upload |
| `verify(cid, data)` | Verify data matches CID |
| `getGatewayUrl(cid)` | Get gateway URL |

## Types

All TypeScript types are exported:

```typescript
import type {
  WalletAddress,
  ContentPath,
  ContentNode,
  WriteProposal,
  PaymentTier,
  SSEEvent,
  // ... and more
} from '@oak-chain/sdk';
```

## Networks

| Network | Endpoint | Contract |
|---------|----------|----------|
| Mainnet | `https://validators.oak-chain.io` | TBD |
| Sepolia | `https://sepolia.validators.oak-chain.io` | TBD |
| Localhost | `http://localhost:8090` | N/A |

## License

Apache-2.0

## Links

- [Documentation](https://oak-chain.io/docs)
- [GitHub](https://github.com/oak-chain/sdk)
- [Oak Chain](https://oak-chain.io)
