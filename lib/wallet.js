// Pure Sepolia / provider-error helpers, so the chain-switch logic can be
// unit-tested without a wallet. Error codes follow EIP-1193 / EIP-3085:
//   4902  = requested chain is not added to the wallet
//   4001  = user rejected the request
//   -32002 = a request is already pending in the wallet
export const SEPOLIA_PARAMS = {
  chainId: '0xaa36a7',
  chainName: 'Sepolia',
  nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: ['https://rpc.sepolia.org'],
  blockExplorerUrls: ['https://sepolia.etherscan.io'],
};

// What ensureSepolia should do next, given a switch-chain failure.
export function sepChainAction(error) {
  const code = error?.code;
  if (code === 4902) return 'add-chain';
  if (code === 4001) return 'user-rejected';
  if (code === -32002) return 'request-pending';
  return 'fail';
}

export function sepErrorMessage(error, step) {
  const action = sepChainAction(error);
  if (action === 'user-rejected') return `${step} cancelled: you rejected the request in the wallet. Nothing was sent.`;
  if (action === 'request-pending') return `${step} blocked: the wallet already has a request waiting. Open MetaMask and finish or reject it first.`;
  if (error?.message) return `${step} failed: ${error.message}`;
  return `${step} failed.`;
}
