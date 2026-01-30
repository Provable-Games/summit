import { useGameDirector } from '@/contexts/GameDirector';
import { useGameStore } from '@/stores/gameStore';
import { Beast } from '@/types/game';
import { gameColors } from '@/utils/themes';
import { Box, Button, Dialog, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';

const LIMIT = 300;

function ClaimTestMoney(props) {
  const { open, close } = props;
  const { executeGameAction, actionFailed } = useGameDirector();
  const { collection, setCollection } = useGameStore();

  const [claimInProgress, setClaimInProgress] = useState(false);

  const unclaimedBeasts = useMemo(
    () =>
      collection.filter(
        (beast: Beast) => beast.has_claimed_potions === false,
      ),
    [collection],
  );

  useEffect(() => {
    setClaimInProgress(false);
  }, [actionFailed]);

  const claimTestMoney = async () => {
    if (unclaimedBeasts.length === 0) return;

    setClaimInProgress(true);

    try {
      const beastIds = unclaimedBeasts.map(beast => beast.token_id);

      let allSucceeded = true;
      for (let i = 0; i < beastIds.length; i += LIMIT) {
        const batch = beastIds.slice(i, i + LIMIT);
        const res = await executeGameAction({
          type: 'claim_starter_pack',
          beastIds: batch,
        });

        if (!res) {
          allSucceeded = false;
          break;
        }
      }

      if (allSucceeded) {
        // Optimistically mark beasts as claimed
        setCollection(prevCollection =>
          prevCollection.map((beast: Beast) => {
            if (beast.has_claimed_potions === false) {
              return {
                ...beast,
                has_claimed_potions: true,
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

  return (
    <Dialog
      open={open}
      onClose={() => { close(false); }}
      maxWidth={'lg'}
      slotProps={{
        paper: {
          sx: {
            background: `${gameColors.darkGreen}95`,
            backdropFilter: 'blur(12px) saturate(1.2)',
            border: `2px solid ${gameColors.accentGreen}60`,
            borderRadius: '12px',
            boxShadow: `
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
              Claim Test Money
            </Typography>

            <Typography sx={styles.subtitle}>
              Used for marketplace
            </Typography>

            <Typography sx={styles.subtitle}>
              You have {unclaimedBeasts.length} beast
              {unclaimedBeasts.length !== 1 ? 's' : ''} with unclaimed test money.
            </Typography>
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
              disabled={claimInProgress || unclaimedBeasts.length === 0}
              onClick={claimTestMoney}
              sx={[
                styles.claimButton,
                !claimInProgress &&
                  unclaimedBeasts.length > 0 &&
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
            {unclaimedBeasts.length > LIMIT && (
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

export default ClaimTestMoney;

const styles = {
  dialogContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxSizing: 'border-box',
    width: '500px',
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
