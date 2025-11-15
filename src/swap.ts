import {erc20Abi, maxUint256, type Address} from 'viem';
import type {PoolState} from './pool';
import {walletClient, publicClient, account} from './client';
import {config} from './config';
import {swapRouterAbi} from './abi/swapRouter';

export interface SwapParams {
  zeroForOne: boolean;
  amount: bigint;
  poolState: PoolState;
}

export const executeSwap = async (params: SwapParams): Promise<string> => {
  const {zeroForOne, amount, poolState} = params;
  const {token0, token1, fee} = poolState;
  const account = walletClient.account!;

  const tokenIn = zeroForOne ? token0 : token1;
  const tokenOut = zeroForOne ? token1 : token0;

  await ensureApproval(tokenIn, amount);

  const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20);
  const amountOutMinimum = 0n; // In production, calculate based on slippage
  const sqrtPriceLimitX96 = 0n; // No price limit

  const swapParams = {
    tokenIn,
    tokenOut,
    fee,
    recipient: account.address,
    deadline,
    amountIn: amount,
    amountOutMinimum,
    sqrtPriceLimitX96,
  };
  try {
    await publicClient.simulateContract({
      address: config.swapRouterAddress,
      abi: swapRouterAbi,
      functionName: 'exactInputSingle',
      args: [swapParams],
      account: walletClient.account,
    });
  } catch (error) {
    console.error('Swap simulation failed:', error);
    throw error;
  }

  const hash = await walletClient.writeContract({
    address: config.swapRouterAddress,
    abi: swapRouterAbi,
    functionName: 'exactInputSingle',
    args: [swapParams],
    chain: walletClient.chain,
    account: account,
  });
  console.log(`Swap transaction sent: ${hash}`);

  const receipt = await publicClient.waitForTransactionReceipt({hash});
  console.log(`Swap confirmed in block ${receipt.blockNumber}`);
  return hash;
};

const ensureApproval = async (
  tokenAddress: Address,
  amount: bigint,
): Promise<void> => {
  const currentAllowance = await publicClient.readContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [account.address, config.swapRouterAddress],
  });
  if (currentAllowance < amount) {
    console.log(`Approving ${tokenAddress} for router...`);

    const hash = await walletClient.writeContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'approve',
      args: [config.swapRouterAddress, maxUint256],
      chain: walletClient.chain,
      account,
    });
    await publicClient.waitForTransactionReceipt({hash});
    console.log('Approval confirmed');
  }
};
