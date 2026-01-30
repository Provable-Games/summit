import {
  START_TIMESTAMP,
  SUMMIT_DURATION_SECONDS,
  SUMMIT_REWARDS_PER_SECOND,
} from '@/contexts/GameDirector';

export const SUMMIT_TOTAL_REWARDS = SUMMIT_DURATION_SECONDS * SUMMIT_REWARDS_PER_SECOND; // 43,200 $SURVIVOR

export type SummitRewardsStatus = {
  startTimestamp: number;
  currentTimestamp: number;
  secondsElapsed: number;
  rewardPerSecond: number;
  totalRewards: number;
  rewardsStreamed: number;
  rewardsRemaining: number;
  percentRemaining: number; // 0..100
};

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export function getSummitRewardsStatus(currentTimestamp: number): SummitRewardsStatus {
  const startTimestamp = START_TIMESTAMP;
  const totalRewards = SUMMIT_TOTAL_REWARDS;
  const rewardPerSecond = SUMMIT_REWARDS_PER_SECOND;

  const safeTimestamp = Number.isFinite(currentTimestamp) ? currentTimestamp : 0;
  const secondsElapsed = Math.max(0, Math.floor(safeTimestamp - startTimestamp));
  const rewardsStreamed = secondsElapsed * rewardPerSecond;
  const rewardsRemaining = clamp(totalRewards - rewardsStreamed, 0, totalRewards);
  const percentRemaining = totalRewards > 0 ? clamp((rewardsRemaining / totalRewards) * 100, 0, 100) : 0;

  return {
    startTimestamp,
    currentTimestamp: safeTimestamp,
    secondsElapsed,
    rewardPerSecond,
    totalRewards,
    rewardsStreamed,
    rewardsRemaining,
    percentRemaining,
  };
}
