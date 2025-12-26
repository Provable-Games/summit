export const SUMMIT_START_BLOCK = 4781329;
export const SUMMIT_TOTAL_REWARDS = 5000;
export const SUMMIT_REWARD_PER_BLOCK = 0.1;

export type SummitRewardsStatus = {
  startBlock: number;
  currentBlock: number;
  blocksElapsed: number;
  rewardPerBlock: number;
  totalRewards: number;
  rewardsStreamed: number;
  rewardsRemaining: number;
  percentRemaining: number; // 0..100
};

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export function getSummitRewardsStatus(currentBlock: number): SummitRewardsStatus {
  const startBlock = SUMMIT_START_BLOCK;
  const totalRewards = SUMMIT_TOTAL_REWARDS;
  const rewardPerBlock = SUMMIT_REWARD_PER_BLOCK;

  const safeCurrentBlock = Number.isFinite(currentBlock) ? currentBlock : 0;
  const blocksElapsed = Math.max(0, Math.floor(safeCurrentBlock - startBlock));
  const rewardsStreamed = blocksElapsed * rewardPerBlock;
  const rewardsRemaining = clamp(totalRewards - rewardsStreamed, 0, totalRewards);
  const percentRemaining = totalRewards > 0 ? clamp((rewardsRemaining / totalRewards) * 100, 0, 100) : 0;

  return {
    startBlock,
    currentBlock: safeCurrentBlock,
    blocksElapsed,
    rewardPerBlock,
    totalRewards,
    rewardsStreamed,
    rewardsRemaining,
    percentRemaining,
  };
}


