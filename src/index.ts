import {getPoolState} from './pool';
import {decideSwap} from './strategy';
import {executeSwap} from './swap';
import {config} from './config';
import {account} from './client';

const sleep = async (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms));

console.log('🤖 Starting Uniswap V3 Volatility Simulator Bot...');
console.log(`Pool: ${config.poolAddress}`);
console.log(`Router: ${config.swapRouterAddress}`);
console.log(
  `Price thresholds: ${config.priceThresholds.lower} - ${config.priceThresholds.upper}`,
);
console.log(`Check interval: ${config.intervalMs}ms\n`);
console.log(`Wallet address: ${account.address}\n`);

// eslint-disable-next-line no-constant-condition
while (true) {
  try {
    console.log('--- Checking pool state ---');
    const poolState = await getPoolState();

    const decision = decideSwap(poolState);
    console.log(
      `Decision: ${decision.amount.formatted} ${decision.zeroForOne ? poolState.token0Symbol : poolState.token1Symbol}`,
    );

    if (!decision.shouldSwap) {
      console.log('⏭️  No swap needed');
      continue;
    }
    const txHash = await executeSwap({
      zeroForOne: decision.zeroForOne,
      amount: decision.amount.scaled,
      poolState,
    });
    console.log(`✅ Swap completed: ${txHash}`);
  } catch (error) {
    console.error('❌ Error during tick:', error);
  }
  await sleep(config.intervalMs);
}
console.log('Bot is running. Press Ctrl+C to stop.\n');
