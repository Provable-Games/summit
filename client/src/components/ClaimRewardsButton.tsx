import corpseTokenIcon from '@/assets/images/corpse-token.png';
import killTokenIcon from '@/assets/images/kill-token.png';
import rewardsIcon from '@/assets/images/rewards.png';
import { useController } from '@/contexts/controller';
import { useGameDirector } from '@/contexts/GameDirector';
import { useGameStore } from '@/stores/gameStore';
import { Beast } from '@/types/game';
import { gameColors } from '@/utils/themes';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { Badge, Box, Button, Divider, IconButton, Menu, MenuItem, Tooltip, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';

const survivorTokenIcon = '/images/survivor_token.png';

const SKULL_LIMIT = 250;
const CORPSE_LIMIT = 250;
const QUEST_REWARD_LIMIT = 2450;
const SUMMIT_REWARD_LIMIT = 295;

interface ClaimState {
  inProgress: boolean;
  claimed: number;
  total: number;
}

// Calculate quest rewards for a beast - matches contract logic exactly
// Returns reward amount in integer units (divide by 100 for display)
const calculateQuestRewards = (beast: Beast): number => {
  let totalRewards = 0;

  // First Blood - attacked the summit (bonus_xp > 0)
  if (beast.bonus_xp > 0) {
    totalRewards += 5;
  }

  // Second Wind - used revival potion
  if (beast.used_revival_potion) {
    totalRewards += 10;
  }

  // A Vital Boost - used attack potion
  if (beast.used_attack_potion) {
    totalRewards += 10;
  }

  // Level up bonuses (cumulative - expressed as running totals)
  const bonusLevels = beast.current_level - beast.level;
  if (bonusLevels >= 10) {
    totalRewards += 30; // 2+3+4+6
  } else if (bonusLevels >= 5) {
    totalRewards += 18;  // 2+3+4
  } else if (bonusLevels >= 3) {
    totalRewards += 10;  // 2+3
  } else if (bonusLevels >= 1) {
    totalRewards += 4;
  }

  // Summit Conqueror - captured the summit
  if (beast.captured_summit) {
    totalRewards += 10;
  }

  // Iron Grip - held summit for 10+ seconds
  if (beast.summit_held_seconds >= 10) {
    totalRewards += 20;
  }

  // Consistency is Key - reached max attack streak
  if (beast.max_attack_streak) {
    totalRewards += 10;
  }

  return totalRewards;
};

// Max possible reward per beast (in integer units)
const MAX_REWARD_PER_BEAST = 95;

const ClaimRewardsButton = () => {
  const { collection, setCollection, adventurerCollection, setAdventurerCollection } = useGameStore();
  const { executeGameAction, actionFailed } = useGameDirector();
  const { tokenBalances, setTokenBalances } = useController();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [skullClaimState, setSkullClaimState] = useState<ClaimState | null>(null);
  const [corpseClaimState, setCorpseClaimState] = useState<ClaimState | null>(null);
  const [survivorClaimState, setSurvivorClaimState] = useState<ClaimState | null>(null);
  const [summitClaimState, setSummitClaimState] = useState<ClaimState | null>(null);

  // Calculate all unclaimed rewards in a single pass through collection
  const claimableRewards = useMemo(() => {
    const skullBeasts: Beast[] = [];
    const questBeasts: Beast[] = [];
    const summitBeasts: Beast[] = [];

    let skullTokens = 0;
    let questTotalEarned = 0;
    let questTotalClaimed = 0;
    let summitTokens = 0;

    collection.forEach((beast: Beast) => {
      // Skull rewards (adventurers killed)
      const skullUnclaimed = (beast.adventurers_killed || 0) - (beast.kills_claimed || 0);
      if (skullUnclaimed > 0) {
        skullBeasts.push(beast);
        skullTokens += skullUnclaimed;
      }

      // Quest rewards (SURVIVOR from quests)
      const questEarned = calculateQuestRewards(beast);
      const questClaimed = beast.quest_rewards_claimed || 0;
      questTotalEarned += questEarned;
      questTotalClaimed += questClaimed;
      if (questEarned > questClaimed) {
        questBeasts.push(beast);
      }

      // Summit rewards (SURVIVOR from holding summit)
      const summitUnclaimed = beast.rewards_earned - beast.rewards_claimed;
      if (summitUnclaimed > 0) {
        summitBeasts.push(beast);
        summitTokens += summitUnclaimed;
      }
    });

    return {
      // Skull
      unclaimedSkullBeasts: skullBeasts,
      unclaimedSkullTokens: skullTokens,
      // Quest (SURVIVOR)
      unclaimedSurvivorBeasts: questBeasts,
      unclaimedSurvivorTokens: (questTotalEarned - questTotalClaimed) / 100,
      questTotalEarned,
      questTotalPossible: collection.length * MAX_REWARD_PER_BEAST,
      // Summit (SURVIVOR)
      unclaimedSummitBeasts: summitBeasts,
      unclaimedSummitTokens: summitTokens / 100000,
    };
  }, [collection]);

  const {
    unclaimedSkullBeasts,
    unclaimedSkullTokens,
    unclaimedSurvivorBeasts,
    unclaimedSurvivorTokens,
    questTotalEarned,
    questTotalPossible,
    unclaimedSummitBeasts,
    unclaimedSummitTokens,
  } = claimableRewards;

  // Corpse tokens are from adventurer collection (separate)
  const unclaimedCorpseTokens = useMemo(
    () => adventurerCollection.reduce((sum, adventurer) => sum + adventurer.level, 0),
    [adventurerCollection],
  );

  const totalRewards = (unclaimedSkullTokens > 0 ? 1 : 0) + (unclaimedCorpseTokens > 0 ? 1 : 0) + (unclaimedSurvivorTokens > 0 ? 1 : 0) + (unclaimedSummitTokens > 0 ? 1 : 0);

  // Reset claim state on action failure
  useEffect(() => {
    if (actionFailed) {
      setSkullClaimState(null);
      setCorpseClaimState(null);
      setSurvivorClaimState(null);
      setSummitClaimState(null);
    }
  }, [actionFailed]);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const claimSkulls = async () => {
    if (unclaimedSkullBeasts.length === 0) return;

    const totalSkulls = unclaimedSkullTokens;
    const beastIds = unclaimedSkullBeasts.map(beast => beast.token_id);

    setSkullClaimState({ inProgress: true, claimed: 0, total: totalSkulls });

    try {
      let allSucceeded = true;
      let claimedSoFar = 0;

      for (let i = 0; i < beastIds.length; i += SKULL_LIMIT) {
        const batch = beastIds.slice(i, i + SKULL_LIMIT);
        const batchSkulls = unclaimedSkullBeasts
          .slice(i, i + SKULL_LIMIT)
          .reduce(
            (sum: number, beast: Beast) =>
              sum + ((beast.adventurers_killed || 0) - (beast.kills_claimed || 0)),
            0,
          );

        const res = await executeGameAction({
          type: 'claim_skull_reward',
          beastIds: batch,
        });

        if (!res) {
          allSucceeded = false;
          break;
        }

        claimedSoFar += batchSkulls;
        setSkullClaimState({ inProgress: true, claimed: claimedSoFar, total: totalSkulls });
      }

      if (allSucceeded) {
        // Update local token balances
        setTokenBalances({
          ...tokenBalances,
          SKULL: (tokenBalances['SKULL'] || 0) + totalSkulls,
        });

        // Optimistically mark skulls as claimed for these beasts
        setCollection(prevCollection =>
          prevCollection.map((beast: Beast) => {
            if ((beast.adventurers_killed || 0) > (beast.kills_claimed || 0)) {
              return {
                ...beast,
                kills_claimed: beast.adventurers_killed ?? beast.kills_claimed,
              };
            }
            return beast;
          }),
        );
      }
    } catch (ex) {
      console.log(ex);
    } finally {
      setSkullClaimState(null);
    }
  };

  const claimCorpse = async () => {
    if (adventurerCollection.length === 0) return;

    const tokenAmount = unclaimedCorpseTokens;
    const adventurerIds = adventurerCollection.map(adv => adv.id);

    setCorpseClaimState({ inProgress: true, claimed: 0, total: tokenAmount });

    try {
      let allSucceeded = true;
      let claimedSoFar = 0;

      for (let i = 0; i < adventurerIds.length; i += CORPSE_LIMIT) {
        const batch = adventurerIds.slice(i, i + CORPSE_LIMIT);
        const batchTokens = adventurerCollection
          .slice(i, i + CORPSE_LIMIT)
          .reduce((sum, adv) => sum + adv.level, 0);

        const res = await executeGameAction({
          type: 'claim_corpse_reward',
          adventurerIds: batch,
        });

        if (!res) {
          allSucceeded = false;
          break;
        }

        claimedSoFar += batchTokens;
        setCorpseClaimState({ inProgress: true, claimed: claimedSoFar, total: tokenAmount });
      }

      if (allSucceeded) {
        setTokenBalances({
          ...tokenBalances,
          CORPSE: (tokenBalances['CORPSE'] || 0) + tokenAmount,
        });
        setAdventurerCollection([]);
      }
    } catch (ex) {
      console.log(ex);
    } finally {
      setCorpseClaimState(null);
    }
  };

  const claimSurvivor = async () => {
    if (unclaimedSurvivorBeasts.length === 0) return;

    const totalTokens = unclaimedSurvivorTokens;
    const beastIds = unclaimedSurvivorBeasts.map(beast => beast.token_id);

    setSurvivorClaimState({ inProgress: true, claimed: 0, total: totalTokens });

    try {
      let allSucceeded = true;
      let claimedSoFar = 0;

      for (let i = 0; i < beastIds.length; i += QUEST_REWARD_LIMIT) {
        const batch = beastIds.slice(i, i + QUEST_REWARD_LIMIT);
        const batchTokens = unclaimedSurvivorBeasts
          .slice(i, i + QUEST_REWARD_LIMIT)
          .reduce((sum: number, beast: Beast) => {
            const earned = calculateQuestRewards(beast);
            const claimed = beast.quest_rewards_claimed || 0;
            return sum + (earned - claimed);
          }, 0) / 100; // Convert to display units

        const res = await executeGameAction({
          type: 'claim_quest_reward',
          beastIds: batch,
        });

        if (!res) {
          allSucceeded = false;
          break;
        }

        claimedSoFar += batchTokens;
        setSurvivorClaimState({ inProgress: true, claimed: claimedSoFar, total: totalTokens });
      }

      if (allSucceeded) {
        // Update local token balances
        setTokenBalances({
          ...tokenBalances,
          SURVIVOR: (tokenBalances['SURVIVOR'] || 0) + totalTokens,
        });

        // Optimistically mark quest rewards as claimed for these beasts
        setCollection(prevCollection =>
          prevCollection.map((beast: Beast) => {
            const earned = calculateQuestRewards(beast);
            const claimed = beast.quest_rewards_claimed || 0;
            if (earned > claimed) {
              return {
                ...beast,
                quest_rewards_claimed: earned,
              };
            }
            return beast;
          }),
        );
      }
    } catch (ex) {
      console.log(ex);
    } finally {
      setSurvivorClaimState(null);
    }
  };

  const claimSummitRewards = async () => {
    if (unclaimedSummitBeasts.length === 0) return;

    const totalTokens = unclaimedSummitTokens;
    const beastIds = unclaimedSummitBeasts.map(beast => beast.token_id);

    setSummitClaimState({ inProgress: true, claimed: 0, total: totalTokens });

    try {
      let allSucceeded = true;
      let claimedSoFar = 0;

      for (let i = 0; i < beastIds.length; i += SUMMIT_REWARD_LIMIT) {
        const batch = beastIds.slice(i, i + SUMMIT_REWARD_LIMIT);
        const batchTokens = unclaimedSummitBeasts
          .slice(i, i + SUMMIT_REWARD_LIMIT)
          .reduce((sum: number, beast: Beast) => sum + (beast.rewards_earned - beast.rewards_claimed), 0);

        const res = await executeGameAction({
          type: 'claim_summit_reward',
          beastIds: batch,
        });

        if (!res) {
          allSucceeded = false;
          break;
        }

        claimedSoFar += batchTokens;
        setSummitClaimState({ inProgress: true, claimed: claimedSoFar, total: totalTokens });
      }

      if (allSucceeded) {
        // Update local token balances
        setTokenBalances({
          ...tokenBalances,
          SURVIVOR: (tokenBalances['SURVIVOR'] || 0) + totalTokens,
        });

        // Optimistically mark summit rewards as claimed for these beasts
        setCollection(prevCollection =>
          prevCollection.map((beast: Beast) => {
            if (beast.rewards_earned > beast.rewards_claimed) {
              return {
                ...beast,
                rewards_claimed: beast.rewards_earned,
              };
            }
            return beast;
          }),
        );
      }
    } catch (ex) {
      console.log(ex);
    } finally {
      setSummitClaimState(null);
    }
  };

  if (totalRewards === 0 && !skullClaimState && !corpseClaimState && !survivorClaimState && !summitClaimState) {
    return null;
  }

  const showSkulls = unclaimedSkullTokens > 0 || skullClaimState;
  const showCorpse = unclaimedCorpseTokens > 0 || corpseClaimState;
  const showSurvivor = unclaimedSurvivorTokens > 0 || survivorClaimState;
  const showSummit = unclaimedSummitTokens > 0 || summitClaimState;

  const progressPercent = questTotalPossible > 0
    ? (questTotalEarned / questTotalPossible) * 100
    : 0;

  return (
    <>
      <Badge
        badgeContent={totalRewards}
        color="error"
        sx={styles.badge}
      >
        <IconButton
          onClick={handleClick}
          sx={styles.iconButton}
        >
          <img src={rewardsIcon} alt="rewards" style={styles.buttonIcon} />
        </IconButton>
      </Badge>

      <Menu
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        slotProps={{
          paper: {
            sx: styles.menu,
          },
        }}
      >
        {showSkulls && (
          <MenuItem sx={styles.menuItem} disableRipple>
            <Box sx={styles.menuItemContent}>
              <Box sx={styles.iconContainer}>
                <img src={killTokenIcon} alt="skull" style={styles.tokenIcon} />
              </Box>
              <Box sx={styles.menuItemInfo}>
                <Box sx={styles.titleRow}>
                  <Typography sx={styles.menuItemTitle}>SKULL</Typography>
                  <Tooltip
                    title="Earned when your beasts kill adventurers in Loot Survivor. 1 skull per kill"
                    placement="top"
                    arrow
                    slotProps={{ tooltip: { sx: styles.tooltip } }}
                  >
                    <HelpOutlineIcon sx={styles.helpIcon} />
                  </Tooltip>
                </Box>
                <Typography sx={styles.menuItemSubtitle}>
                  {skullClaimState
                    ? `${skullClaimState.claimed}/${skullClaimState.total} claimed`
                    : `${unclaimedSkullTokens} available`}
                </Typography>
              </Box>
              <Button
                sx={styles.claimButton}
                onClick={claimSkulls}
                disabled={skullClaimState?.inProgress || unclaimedSkullBeasts.length === 0}
              >
                {skullClaimState?.inProgress ? (
                  <Box display="flex" alignItems="baseline">
                    <div className="dotLoader white" />
                  </Box>
                ) : (
                  <Typography sx={styles.claimButtonText}>CLAIM</Typography>
                )}
              </Button>
            </Box>
          </MenuItem>
        )}

        {showSkulls && showCorpse && (
          <Divider sx={styles.divider} />
        )}

        {showCorpse && (
          <MenuItem sx={styles.menuItem} disableRipple>
            <Box sx={styles.menuItemContent}>
              <Box sx={styles.iconContainer}>
                <img src={corpseTokenIcon} alt="corpse" style={styles.tokenIcon} />
              </Box>
              <Box sx={styles.menuItemInfo}>
                <Box sx={styles.titleRow}>
                  <Typography sx={styles.menuItemTitle}>CORPSE</Typography>
                  <Tooltip
                    title="Extracted from your dead adventurers in Loot Survivor. 1 corpse per adventurer level"
                    placement="top"
                    arrow
                    slotProps={{ tooltip: { sx: styles.tooltip } }}
                  >
                    <HelpOutlineIcon sx={styles.helpIcon} />
                  </Tooltip>
                </Box>
                <Typography sx={styles.menuItemSubtitle}>
                  {corpseClaimState
                    ? `${corpseClaimState.claimed}/${corpseClaimState.total} claimed`
                    : `${unclaimedCorpseTokens} available`}
                </Typography>
              </Box>
              <Button
                sx={styles.claimButton}
                onClick={claimCorpse}
                disabled={corpseClaimState?.inProgress || adventurerCollection.length === 0}
              >
                {corpseClaimState?.inProgress ? (
                  <Box display="flex" alignItems="baseline">
                    <div className="dotLoader white" />
                  </Box>
                ) : (
                  <Typography sx={styles.claimButtonText}>CLAIM</Typography>
                )}
              </Button>
            </Box>
          </MenuItem>
        )}

        {(showSkulls || showCorpse) && showSurvivor && (
          <Divider sx={styles.divider} />
        )}

        {showSurvivor && (
          <MenuItem sx={styles.survivorMenuItem} disableRipple>
            <Box sx={styles.survivorContent}>
              <Box sx={styles.survivorHeader}>
                <Box sx={styles.iconContainer}>
                  <img src={survivorTokenIcon} alt="survivor" style={styles.tokenIcon} />
                </Box>
                <Box sx={styles.menuItemInfo}>
                  <Box sx={styles.titleRow}>
                    <Typography sx={styles.survivorTitle}>Quest Reward</Typography>
                    <Tooltip
                      title="Earned by completing quests with your beasts. Each quest completed earns SURVIVOR tokens"
                      placement="top"
                      arrow
                      slotProps={{ tooltip: { sx: styles.tooltip } }}
                    >
                      <HelpOutlineIcon sx={styles.helpIcon} />
                    </Tooltip>
                  </Box>
                  <Typography sx={styles.survivorSubtitle}>
                    {survivorClaimState
                      ? `${survivorClaimState.claimed.toFixed(2)}/${survivorClaimState.total.toFixed(2)} claimed`
                      : `${unclaimedSurvivorTokens.toFixed(2)} available`}
                  </Typography>
                </Box>
                <Button
                  sx={styles.claimButton}
                  onClick={claimSurvivor}
                  disabled={survivorClaimState?.inProgress || unclaimedSurvivorTokens <= 0}
                >
                  {survivorClaimState?.inProgress ? (
                    <Box display="flex" alignItems="baseline" sx={{ color: 'white' }}>
                      <div className="dotLoader white" />
                    </Box>
                  ) : (
                    <Typography sx={styles.claimButtonText}>CLAIM</Typography>
                  )}
                </Button>
              </Box>
            </Box>
          </MenuItem>
        )}

        {(showSkulls || showCorpse || showSurvivor) && showSummit && (
          <Divider sx={styles.divider} />
        )}

        {showSummit && (
          <MenuItem sx={styles.menuItem} disableRipple>
            <Box sx={styles.menuItemContent}>
              <Box sx={styles.iconContainer}>
                <img src={survivorTokenIcon} alt="survivor" style={styles.tokenIcon} />
              </Box>
              <Box sx={styles.menuItemInfo}>
                <Box sx={styles.titleRow}>
                  <Typography sx={styles.summitTitle}>Summit Reward</Typography>
                  <Tooltip
                    title="Earned by holding the Summit. The longer you hold, the more rewards you earn"
                    placement="top"
                    arrow
                    slotProps={{ tooltip: { sx: styles.tooltip } }}
                  >
                    <HelpOutlineIcon sx={styles.helpIcon} />
                  </Tooltip>
                </Box>
                <Typography sx={styles.summitSubtitle}>
                  {summitClaimState
                    ? `${summitClaimState.claimed}/${summitClaimState.total} claimed`
                    : `${unclaimedSummitTokens} available`}
                </Typography>
              </Box>
              <Button
                sx={styles.claimButton}
                onClick={claimSummitRewards}
                disabled={summitClaimState?.inProgress || unclaimedSummitBeasts.length === 0}
              >
                {summitClaimState?.inProgress ? (
                  <Box display="flex" alignItems="baseline">
                    <div className="dotLoader white" />
                  </Box>
                ) : (
                  <Typography sx={styles.claimButtonText}>CLAIM</Typography>
                )}
              </Button>
            </Box>
          </MenuItem>
        )}
      </Menu>
    </>
  );
};

export default ClaimRewardsButton;

const styles = {
  badge: {
    '& .MuiBadge-badge': {
      background: `linear-gradient(135deg, #ff6b6b 0%, ${gameColors.red} 50%, #cc3333 100%)`,
      color: '#fff',
      fontWeight: 'bold',
      fontSize: '10px',
      minWidth: '18px',
      height: '18px',
      right: 2,
      top: 2,
      border: '1px solid rgba(0, 0, 0, 0.3)',
    },
  },
  iconButton: {
    width: '46px',
    height: '46px',
    background: `${gameColors.darkGreen}90`,
    backdropFilter: 'blur(12px) saturate(1.2)',
    border: `2px solid ${gameColors.accentGreen}60`,
    borderRadius: '8px',
    boxShadow: `
      0 4px 12px rgba(0, 0, 0, 0.4),
      0 0 0 1px ${gameColors.darkGreen}
    `,
    transition: 'all 0.2s ease',
    '&:hover': {
      background: `${gameColors.mediumGreen}90`,
      borderColor: gameColors.brightGreen,
    },
    '&:disabled': {
      opacity: 0.5,
      cursor: 'not-allowed',
    },
  },
  buttonIcon: {
    width: '42px',
    height: '42px',
    objectFit: 'contain' as const,
  },
  menu: {
    mt: 0.5,
    minWidth: 300,
    background: `${gameColors.darkGreen}99`,
    backdropFilter: 'blur(12px) saturate(1.2)',
    border: `2px solid ${gameColors.accentGreen}60`,
    borderRadius: '8px',
    padding: 0,
  },
  menuItem: {
    cursor: 'default',
    '&:hover': {
      backgroundColor: 'transparent',
    },
    py: 0.5,
    px: 1.5,
  },
  menuItemContent: {
    display: 'flex',
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1.5,
  },
  iconContainer: {
    width: 40,
    height: 40,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: `${gameColors.darkGreen}80`,
    borderRadius: '6px',
    flexShrink: 0,
  },
  tokenIcon: {
    width: '32px',
    height: '32px',
    objectFit: 'contain' as const,
  },
  menuItemInfo: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 0.5,
  },
  menuItemTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: gameColors.yellow,
    letterSpacing: '0.5px',
  },
  helpIcon: {
    fontSize: '14px',
    color: `${gameColors.accentGreen}`,
    cursor: 'help',
    transition: 'color 0.2s ease',
    '&:hover': {
      color: gameColors.yellow,
    },
  },
  tooltip: {
    backgroundColor: gameColors.darkGreen,
    color: '#ffedbb',
    fontSize: '12px',
    padding: '8px 12px',
    border: `1px solid ${gameColors.accentGreen}60`,
    borderRadius: '6px',
    maxWidth: 220,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
  },
  menuItemSubtitle: {
    fontSize: '12px',
    color: gameColors.brightGreen,
    fontWeight: '600',
    letterSpacing: '0.5px',
  },
  divider: {
    borderColor: `${gameColors.accentGreen}40`,
  },
  claimButton: {
    background: `linear-gradient(135deg, ${gameColors.brightGreen} 0%, ${gameColors.accentGreen} 100%)`,
    borderRadius: '4px',
    minWidth: '80px',
    height: '32px',
    border: `1px solid ${gameColors.brightGreen}`,
    transition: 'all 0.2s ease',
    boxShadow: `0 0 8px ${gameColors.brightGreen}40`,
    flexShrink: 0,
    '&:hover': {
      background: `linear-gradient(135deg, ${gameColors.brightGreen} 20%, ${gameColors.lightGreen} 100%)`,
      boxShadow: `0 0 12px ${gameColors.brightGreen}60`,
      transform: 'translateY(-1px)',
    },
    '&:disabled': {
      background: `${gameColors.mediumGreen}60`,
      border: `1px solid ${gameColors.accentGreen}40`,
      boxShadow: 'none',
    },
  },
  claimButtonText: {
    color: '#ffedbb',
    letterSpacing: '0.5px',
    fontSize: '11px',
    fontWeight: 'bold',
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
    textTransform: 'uppercase',
  },
  // Survivor-specific styles
  survivorMenuItem: {
    cursor: 'default',
    '&:hover': {
      backgroundColor: 'transparent',
    },
    py: 1,
    px: 1.5,
  },
  survivorContent: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    gap: 1.5,
  },
  survivorHeader: {
    display: 'flex',
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1.5,
  },
  survivorTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#e040fb',
    letterSpacing: '0.5px',
  },
  survivorSubtitle: {
    fontSize: '12px',
    color: '#ce93d8',
    fontWeight: '600',
    letterSpacing: '0.5px',
  },
  // Summit-specific styles
  summitTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#ffd700',
    letterSpacing: '0.5px',
  },
  summitSubtitle: {
    fontSize: '12px',
    color: '#ffeb3b',
    fontWeight: '600',
    letterSpacing: '0.5px',
  },
  questProgressSection: {
    background: `${gameColors.darkGreen}60`,
    borderRadius: '6px',
    p: 1,
  },
  questProgressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    mb: 0.5,
  },
  questProgressLabel: {
    fontSize: '10px',
    color: '#aaa',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  questProgressPercent: {
    fontSize: '11px',
    fontWeight: 'bold',
    color: gameColors.brightGreen,
  },
  questProgressBar: {
    height: '6px',
    borderRadius: '3px',
    backgroundColor: `${gameColors.darkGreen}`,
    '& .MuiLinearProgress-bar': {
      backgroundColor: '#e040fb',
      borderRadius: '3px',
      backgroundImage: 'linear-gradient(90deg, #7c4dff, #e040fb)',
    },
  },
  questProgressValues: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 0.5,
    mt: 0.5,
  },
  questEarned: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#e040fb',
  },
  questDivider: {
    fontSize: '11px',
    color: '#666',
  },
  questMax: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#888',
  },
};
