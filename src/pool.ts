import {config} from './config';
import {poolAbi} from './abi/pool';
import {publicClient} from './client';
import {getPriceAtSqrtPriceX96, getTimelockLens, wrapPrice} from 'timelock-sdk';

export type PoolState = Awaited<ReturnType<typeof getPoolState>>;

export const getPoolState = async () => {
  const timelockLens = getTimelockLens(publicClient);
  const poolAddress = config.poolAddress;

  const [slot0, poolData] = await Promise.all([
    publicClient.readContract({
      address: poolAddress,
      abi: poolAbi,
      functionName: 'slot0',
    }),
    timelockLens.read.getPoolData([poolAddress]),
  ]);
  const sqrtPriceX96 = slot0[0];
  const tick = slot0[1];

  const price = wrapPrice(
    getPriceAtSqrtPriceX96(sqrtPriceX96),
    poolData.token0Decimals,
    poolData.token1Decimals,
  );
  return {price, sqrtPriceX96, tick, ...poolData};
};
