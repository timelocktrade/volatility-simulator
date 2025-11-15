import type {PoolState} from './pool';
import {config} from './config';
import {wrapAmountUnscaled, type Amount} from 'timelock-sdk';

export interface SwapDecision {
  shouldSwap: boolean;
  zeroForOne: boolean;
  amount: Amount;
}
type PriceDirection = 'up' | 'down' | 'none';
type SwapIntensity = 'low' | 'medium' | 'high';

interface DirectionDecision {
  direction: PriceDirection;
  intensity: SwapIntensity;
}

const decideDirection = (poolState: PoolState): DirectionDecision => {
  const {lower, upper} = config.priceThresholds;
  const range = upper - lower;
  const price = poolState.price.unscaled.toNumber();

  if (price <= lower) return {direction: 'up', intensity: 'high'};
  if (price >= upper) return {direction: 'down', intensity: 'high'};

  if (price - lower < range * 0.1) {
    return {direction: 'up', intensity: 'medium'};
  }
  if (upper - price < range * 0.1) {
    return {direction: 'down', intensity: 'medium'};
  }
  const randomDirection = Math.random() > 0.5 ? 'up' : 'down';
  return {direction: randomDirection, intensity: 'low'};
};

export const decideSwap = (poolState: PoolState): SwapDecision => {
  const {direction, intensity} = decideDirection(poolState);
  const zeroForOne = direction === 'down';

  const amount = wrapAmountUnscaled(
    calculateSwapAmount(intensity),
    zeroForOne ? poolState.token0Decimals : poolState.token1Decimals,
  );
  return {shouldSwap: true, zeroForOne, amount};
};

const calculateSwapAmount = (intensity: SwapIntensity) => {
  const {minSwapAmount, maxSwapAmount} = config;
  const range = maxSwapAmount - minSwapAmount;

  let multiplier: number;
  let randomnessFactor: number;

  switch (intensity) {
    case 'high':
      multiplier = 75.0;
      randomnessFactor = 0.05;
      break;
    case 'medium':
      multiplier = 0.5;
      randomnessFactor = 0.15;
      break;
    case 'low':
      multiplier = 0.25;
      randomnessFactor = 0.2;
      break;
  }
  const baseAmount = Math.floor(range * multiplier);
  const randomness = Math.floor(Math.random() * range * randomnessFactor);

  return minSwapAmount + baseAmount + randomness;
};
