import { useController } from '@/contexts/controller';
import { useGameDirector } from '@/contexts/GameDirector';
import { useGameStore } from '@/stores/gameStore';
import { gameColors } from '@/utils/themes';
import { Box, Button, Dialog, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import corpseTokenIcon from '@/assets/images/corpse-token.png';

const LIMIT = 300;

function claimCorpses(props) {
  const { open, close, isOnboarding = false } = props
  const { executeGameAction, actionFailed } = useGameDirector()
  const { adventurerCollection, setAdventurerCollection } = useGameStore()
  const { tokenBalances, setTokenBalances } = useController()

  const [claimInProgress, setClaimInProgress] = useState(false)

  useEffect(() => {
    setClaimInProgress(false);
  }, [actionFailed]);

  // Auto-complete onboarding when claimed
  useEffect(() => {
    if (adventurerCollection.length === 0) {
      close();
    }
  }, [adventurerCollection.length]);

  const getTotalCorpseTokens = () => {
    return adventurerCollection.reduce((sum, adventurer) => sum + adventurer.level, 0)
  }

  const claimCorpse = async () => {
    setClaimInProgress(true)

    try {
      const tokenAmount = getTotalCorpseTokens();
      const adventurerIds = adventurerCollection.map(adv => adv.id)

      let allSucceeded = true;
      for (let i = 0; i < adventurerIds.length; i += LIMIT) {
        const batch = adventurerIds.slice(i, i + LIMIT);
        const res = await executeGameAction({
          type: "claim_corpse_reward",
          adventurerIds: batch
        });
        if (!res) {
          allSucceeded = false;
          break;
        }
      }

      if (allSucceeded) {
        setTokenBalances({
          ...tokenBalances,
          "CORPSE": (tokenBalances["CORPSE"] || 0) + tokenAmount,
        })
        setAdventurerCollection([])
      }
    } catch (ex) {
      console.log(ex)
    } finally {
      setClaimInProgress(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={isOnboarding ? undefined : () => { close(false) }}
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
              `
          }
        }
      }}
    >

      <Box sx={styles.dialogContainer}>
        <Box sx={styles.container}>

          <Box sx={{ textAlign: 'center' }}>
            <Typography sx={styles.title}>
              Extract Corpse Tokens
            </Typography>

            {isOnboarding && <Typography sx={styles.subtitle}>
              Extract corpse tokens from your fallen adventurers
            </Typography>}

            <Typography sx={styles.subtitle}>
              You have {adventurerCollection.length} dead adventurer{adventurerCollection.length !== 1 ? 's' : ''}.
            </Typography>
          </Box>

          <Box sx={styles.rewardsContainer}>
            <Box sx={styles.rewardBox}>
              <Box sx={styles.tombstoneImageContainer}>
                <img src={corpseTokenIcon} alt="corpse" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </Box>
              <Typography sx={styles.rewardLabel}>
                $CORPSE
              </Typography>
              <Typography sx={styles.rewardValue}>
                {getTotalCorpseTokens()}
              </Typography>
              <Typography sx={styles.rewardDescription}>
                1 per adventurer level. Used to give your beasts bonus health.
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
            <Button
              disabled={claimInProgress || adventurerCollection.length === 0}
              onClick={claimCorpse}
              sx={[
                styles.claimButton,
                (!claimInProgress && adventurerCollection.length > 0) && styles.claimButtonActive
              ]}
            >
              <Typography sx={styles.claimButtonText}>
                {claimInProgress
                  ? <Box display={'flex'} alignItems={'baseline'}>
                    <span>Extracting</span>
                    <div className='dotLoader white' />
                  </Box>
                  : `EXTRACT ALL`
                }
              </Typography>
            </Button>
            {adventurerCollection.length > LIMIT && (
              <Typography sx={styles.helperText}>
                Extracting in batches of {LIMIT}
              </Typography>
            )}
          </Box>
        </Box>

      </Box>

    </Dialog >
  )
}

export default claimCorpses

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
    gap: 3
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
  tombstoneImageContainer: {
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
  },
  adventurerPreview: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 1.5,
  },
  previewTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#FFD700',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  adventurerGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
    gap: 1.5,
    width: '100%',
  },
  adventurerCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 0.5,
    p: 1.5,
    background: `${gameColors.mediumGreen}60`,
    border: `2px solid ${gameColors.accentGreen}60`,
    borderRadius: '8px',
  },
  adventurerImageContainer: {
    width: '60px',
    height: '60px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: `${gameColors.darkGreen}40`,
    border: `1px solid ${gameColors.accentGreen}40`,
    borderRadius: '8px',
    overflow: 'hidden',
  },
  adventurerLevel: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#ffedbb',
    letterSpacing: '0.5px',
  },
  adventurerCorpse: {
    fontSize: '11px',
    color: gameColors.brightGreen,
    letterSpacing: '0.5px',
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
}

