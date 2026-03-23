import { describe, expect, it } from 'vitest';

import { generateProposalId, signDeleteProposal, signWriteProposal } from '../src/signing';

const WALLET = '0x1111111111111111111111111111111111111111' as const;
const TX_HASH = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const;
const SIGNATURE = '0x' + 'ab'.repeat(65);

describe('signing helpers', () => {
  it('generates bytes32 proposal ids', () => {
    const proposalId = generateProposalId();
    expect(proposalId).toMatch(/^0x[a-f0-9]{64}$/);
  });

  it('includes proposalId in signed write proposals', async () => {
    const proposalId = generateProposalId();
    let signedMessage = '';

    const signer = {
      async getAddress() {
        return WALLET;
      },
      async signMessage(message: string | Uint8Array) {
        signedMessage = String(message);
        return SIGNATURE;
      },
    };

    const proposal = await signWriteProposal(signer, {
      proposalId,
      message: '{"hello":"oak"}',
      ethereumTxHash: TX_HASH,
      paymentTier: 'standard',
    });

    expect(proposal.proposalId).toBe(proposalId);
    expect(proposal.walletAddress).toBe(WALLET);
    expect(proposal.paymentTier).toBe('standard');
    expect(signedMessage).toBe('{"hello":"oak"}');
  });

  it('includes proposalId in signed delete proposals', async () => {
    const proposalId = generateProposalId();

    const signer = {
      async getAddress() {
        return WALLET;
      },
      async signMessage() {
        return SIGNATURE;
      },
    };

    const proposal = await signDeleteProposal(signer, {
      proposalId,
      contentPath: '/oak-chain/demo/delete-me',
      ethereumTxHash: TX_HASH,
      paymentTier: 'standard',
    });

    expect(proposal.proposalId).toBe(proposalId);
    expect(proposal.paymentTier).toBe('standard');
    expect(proposal.contentPath).toBe('/oak-chain/demo/delete-me');
  });
});
