import killTokenIcon from '@/assets/images/kill-token.png';
import { useController } from '@/contexts/controller';
import { useGameDirector } from '@/contexts/GameDirector';
import { useGameStore } from '@/stores/gameStore';
import { Beast } from '@/types/game';
import { gameColors } from '@/utils/themes';
import { Box, Button, Dialog, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';

const LIMIT = 200;

function ClaimSkullReward(props) {
  const { open, close, isOnboarding = false } = props;
  const { executeGameAction, actionFailed } = useGameDirector();
  const { collection, setCollection } = useGameStore();
  const { tokenBalances, setTokenBalances } = useController();

  const [claimInProgress, setClaimInProgress] = useState(false);

  const unclaimedSkullBeasts = useMemo(
    () =>
      collection.filter(
        (beast: Beast) =>
          (beast.adventurers_killed || 0) > (beast.kills_claimed || 0),
      ),
    [collection],
  );

  useEffect(() => {
    setClaimInProgress(false);
  }, [actionFailed]);

  // Auto-close onboarding step when all skulls are claimed
  useEffect(() => {
    if (isOnboarding && collection.length > 0 && unclaimedSkullBeasts.length === 0) {
      close();
    }
  }, [isOnboarding, collection.length, unclaimedSkullBeasts.length]);

  const getTotalSkullTokens = () => {
    return unclaimedSkullBeasts.reduce(
      (sum: number, beast: Beast) =>
        sum + ((beast.adventurers_killed || 0) - (beast.kills_claimed || 0)),
      0,
    );
  };

  const claimSkulls = async () => {
    if (unclaimedSkullBeasts.length === 0) return;

    setClaimInProgress(true);

    try {
      const totalSkulls = getTotalSkullTokens();
      const beastIds = unclaimedSkullBeasts.map(beast => beast.token_id);
      const promises: Promise<unknown>[] = [];

      for (let i = 0; i < beastIds.length; i += LIMIT) {
        const batch = beastIds.slice(i, i + LIMIT);
        // Fire the call without awaiting
        promises.push(
          executeGameAction({
            type: 'claim_skull_reward',
            beastIds: batch,
          })
        );
        // Wait 500ms before firing the next batch
        if (i + LIMIT < beastIds.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // Wait for all calls to complete
      const results = await Promise.all(promises);
      const allSucceeded = results.every(res => res);

      if (allSucceeded) {
        // Update local token balances
        setTokenBalances({
          ...tokenBalances,
          SKULL: (tokenBalances['SKULL'] || 0) + totalSkulls,
        });

        // Optimistically mark skulls as claimed for these beasts
        setCollection(prevCollection =>
          prevCollection.map((beast: Beast) => {
            if (
              (beast.adventurers_killed || 0) > (beast.kills_claimed || 0)
            ) {
              return {
                ...beast,
                kills_claimed: beast.adventurers_killed ?? beast.kills_claimed,
              };
            }
            return beast;
          }),
        );

        close();
      }
    } catch (ex) {
      console.log(ex);
    } finally {
      setClaimInProgress(false);
    }
  };

  const totalSkulls = getTotalSkullTokens();

  return (
    <Dialog
      open={open}
      onClose={isOnboarding ? undefined : () => { close(false); }}
      maxWidth={'lg'}
      slotProps={{
        paper: {
          sx: {
            background: `${gameColors.darkGreen}95`,
            backdropFilter: 'blur(12px) saturate(1.2)',
            border: isOnboarding
              ? `3px solid ${gameColors.accentGreen}80`
              : `2px solid ${gameColors.accentGreen}60`,
            borderRadius: '12px',
            boxShadow: isOnboarding
              ? `
                0 12px 32px rgba(0, 0, 0, 0.8),
                0 0 24px ${gameColors.accentGreen}40,
                inset 0 0 60px ${gameColors.accentGreen}10
              `
              : `
                0 8px 24px rgba(0, 0, 0, 0.6),
                0 0 16px ${gameColors.accentGreen}30
              `,
          },
        },
      }}
    >
      <Box sx={styles.dialogContainer}>
        <Box sx={styles.container}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography sx={styles.title}>
              Claim Skulls
            </Typography>

            {isOnboarding && (
              <Typography sx={styles.subtitle}>
                Claim $SKULL earned by your beasts
              </Typography>
            )}

            <Typography sx={styles.subtitle}>
              You have {unclaimedSkullBeasts.length} beast
              {unclaimedSkullBeasts.length !== 1 ? 's' : ''} with unclaimed
              skulls.
            </Typography>
          </Box>

          <Box sx={styles.rewardsContainer}>
            <Box sx={styles.rewardBox}>
              <Box sx={styles.tokenImageContainer}>
                <img
                  src={killTokenIcon}
                  alt="skull"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </Box>
              <Typography sx={styles.rewardLabel}>
                $SKULL
              </Typography>
              <Typography sx={styles.rewardValue}>
                {totalSkulls}
              </Typography>
              <Typography sx={styles.rewardDescription}>
                Earned from your beasts defeating adventurers. Used to upgrade
                your beasts.
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0.5,
            }}
          >
            <Button
              disabled={claimInProgress || unclaimedSkullBeasts.length === 0}
              onClick={claimSkulls}
              sx={[
                styles.claimButton,
                !claimInProgress &&
                  unclaimedSkullBeasts.length > 0 &&
                  styles.claimButtonActive,
              ]}
            >
              <Typography sx={styles.claimButtonText}>
                {claimInProgress ? (
                  <Box display={'flex'} alignItems={'baseline'}>
                    <span>Claiming</span>
                    <div className='dotLoader white' />
                  </Box>
                ) : (
                  'CLAIM ALL'
                )}
              </Typography>
            </Button>
            {unclaimedSkullBeasts.length > LIMIT && (
              <Typography sx={styles.helperText}>
                Claiming in batches of {LIMIT}
              </Typography>
            )}
          </Box>
        </Box>
      </Box>
    </Dialog>
  );
}

export default ClaimSkullReward;

const styles = {
  dialogContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxSizing: 'border-box',
    width: '700px',
    maxWidth: '98vw',
    p: 4,
  },
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 3,
  },
  title: {
    fontSize: '28px',
    lineHeight: '30px',
    fontWeight: 'bold',
    color: gameColors.yellow,
    letterSpacing: '1.5px',
    textTransform: 'uppercase',
    marginBottom: '8px',
    textShadow: `
      0 2px 4px rgba(0, 0, 0, 0.8),
      0 0 12px ${gameColors.yellow}40
    `,
  },
  subtitle: {
    fontSize: '16px',
    color: '#ffedbb',
    letterSpacing: '0.5px',
    textShadow: `0 1px 2px rgba(0, 0, 0, 0.8)`,
    marginTop: '8px',
  },
  rewardsContainer: {
    display: 'flex',
    justifyContent: 'center',
    gap: 2,
    width: '100%',
    maxWidth: '600px',
  },
  rewardBox: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 1.5,
    p: 1.5,
    background: `${gameColors.mediumGreen}60`,
    border: `2px solid ${gameColors.accentGreen}60`,
    borderRadius: '12px',
  },
  tokenImageContainer: {
    width: '100px',
    height: '100px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    p: 1,
    background: `${gameColors.darkGreen}40`,
    border: `2px solid ${gameColors.accentGreen}40`,
    borderRadius: '8px',
  },
  rewardLabel: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#FFD700',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
  },
  rewardValue: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: gameColors.brightGreen,
    letterSpacing: '1px',
  },
  rewardDescription: {
    fontSize: '12px',
    color: '#ffedbb',
    letterSpacing: '0.5px',
    opacity: 0.8,
    textAlign: 'center',
  },
  claimButton: {
    background: `${gameColors.mediumGreen}60`,
    borderRadius: '8px',
    width: '200px',
    height: '48px',
    my: '6px',
    border: `2px solid ${gameColors.accentGreen}60`,
    transition: 'all 0.3s ease',
    opacity: 0.7,
    '&:disabled': {
      opacity: 0.4,
      cursor: 'not-allowed',
    },
  },
  claimButtonActive: {
    background: `linear-gradient(135deg, ${gameColors.brightGreen} 0%, ${gameColors.accentGreen} 100%)`,
    border: `2px solid ${gameColors.brightGreen}`,
    opacity: 1,
    boxShadow: `
      0 0 12px ${gameColors.brightGreen}40,
      0 2px 4px rgba(0, 0, 0, 0.3)
    `,
    '&:hover': {
      background: `linear-gradient(135deg, ${gameColors.brightGreen} 20%, ${gameColors.lightGreen} 100%)`,
      boxShadow: `
        0 0 16px ${gameColors.brightGreen}60,
        0 4px 8px rgba(0, 0, 0, 0.4)
      `,
      transform: 'translateY(-1px)',
    },
  },
  claimButtonText: {
    color: '#ffedbb',
    letterSpacing: '0.5px',
    fontSize: '14px',
    fontWeight: 'bold',
    textShadow: `0 1px 2px rgba(0, 0, 0, 0.8)`,
    textTransform: 'uppercase',
  },
  helperText: {
    fontSize: '13px',
    color: gameColors.yellow,
    letterSpacing: '0.5px',
    textShadow: `0 1px 2px rgba(0, 0, 0, 0.8)`,
    fontStyle: 'italic',
    marginTop: '4px',
  },
};


