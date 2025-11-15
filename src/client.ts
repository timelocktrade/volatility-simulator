import {createWalletClient, createPublicClient, http} from 'viem';
import {privateKeyToAccount} from 'viem/accounts';
import {monadTestnet} from 'viem/chains';
import {config} from './config';

export const account = privateKeyToAccount(config.privateKey);

export const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(config.rpcUrl),
});
export const walletClient = createWalletClient({
  account,
  chain: monadTestnet,
  transport: http(config.rpcUrl),
});
