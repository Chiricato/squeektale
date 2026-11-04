import test from 'node:test';
import assert from 'node:assert/strict';
import { sepChainAction, sepErrorMessage, SEPOLIA_PARAMS } from '../lib/wallet.js';

test('Sepolia params pin chain 0xaa36a7 and testnet ETH only', () => {
  assert.equal(SEPOLIA_PARAMS.chainId, '0xaa36a7');
  assert.equal(SEPOLIA_PARAMS.nativeCurrency.symbol, 'ETH');
  assert.equal(SEPOLIA_PARAMS.chainName, 'Sepolia');
});

test('switch failure 4902 means add-chain, nothing else does', () => {
  assert.equal(sepChainAction({ code: 4902 }), 'add-chain');
  assert.equal(sepChainAction({ code: 4001 }), 'user-rejected');
  assert.equal(sepChainAction({ code: -32002 }), 'request-pending');
  assert.equal(sepChainAction({ code: 1234 }), 'fail');
  assert.equal(sepChainAction(null), 'fail');
  assert.equal(sepChainAction({}), 'fail');
});

test('user-facing Sepolia errors name the cause, not just the code', () => {
  assert.match(sepErrorMessage({ code: 4001 }, 'Switching to Sepolia'), /rejected/);
  assert.match(sepErrorMessage({ code: -32002 }, 'Switching to Sepolia'), /already has a request waiting/);
  assert.match(sepErrorMessage({ code: 4902, message: 'x' }, 'Switching'), /x/);
});
