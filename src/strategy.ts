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

  // Calculate distance from midpoint (-1 to 1, where -1 is at lower, 0 is middle, 1 is at upper)
  const midpoint = lower + range / 2;
  const normalizedPosition = (price - midpoint) / (range / 2);

  // Start with 50% probability of going down, adjust based on position
  // If price is high (normalizedPosition > 0), increase probability of going down
  // If price is low (normalizedPosition < 0), decrease probability of going down
  const downProbability = Math.min(0.5 + normalizedPosition * 0.3, 0.9);

  const direction = Math.random() < downProbability ? 'down' : 'up';

  // Determine intensity based on distance from boundaries
  let intensity: SwapIntensity;

  if (price <= lower || price >= upper) {
    intensity = 'high';
  } else if (price - lower < range * 0.2 || upper - price < range * 0.2) {
    intensity = 'medium';
  } else {
    intensity = 'low';
  }
  return {direction, intensity};
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
      multiplier = 0.75;
      randomnessFactor = 0.25;
      break;
    case 'medium':
      multiplier = 0.5;
      randomnessFactor = 0.3;
      break;
    case 'low':
      multiplier = 0.25;
      randomnessFactor = 0.7;
      break;
  }
  return (
    minSwapAmount + range * (multiplier + Math.random() * randomnessFactor)
  );
};
