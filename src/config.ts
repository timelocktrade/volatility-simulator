import type {Address, Hex} from 'viem';
import {z} from 'zod';

const ZHex = z
  .string()
  .regex(/^0x[a-fA-F0-9]+$/, 'Invalid hex string')
  .transform(v => v as Hex);

const ZAddress = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid address')
  .transform(v => v as Address);

const envSchema = z.object({
  PRIVATE_KEY: ZHex,
  RPC_URL: z.url('RPC_URL must be a valid URL'),
  POOL_ADDRESS: ZAddress,
  SWAP_ROUTER_ADDRESS: ZAddress,
});

export const env = envSchema.parse(process.env);

export const config = {
  privateKey: env.PRIVATE_KEY,
  rpcUrl: env.RPC_URL,
  poolAddress: env.POOL_ADDRESS,
  swapRouterAddress: env.SWAP_ROUTER_ADDRESS,

  priceThresholds: {
    lower: 1.5, // If price is close to this, push it up
    upper: 2, // If price is close to this, push it down
  },
  intervalMs: 60_000,

  minSwapAmount: 10000,
  maxSwapAmount: 20000,

  slippageBps: 50,
} as const;
