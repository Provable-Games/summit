import { DIPLOMACY_REWARDS_PER_SECOND } from '@/contexts/GameDirector';
import type { Beast, Diplomacy } from '@/types/game';
import { gameColors } from '@/utils/themes';
import HandshakeIcon from '@mui/icons-material/Handshake';
import { Box, Popover, Typography } from '@mui/material';
import { addAddressPadding } from 'starknet';

interface DiplomacyPopoverProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  diplomacy: Diplomacy;
  summitBeast: Beast;
  leaderboard: { owner: string; amount: number }[];
  addressNames: Record<string, string | null>;
}

export function DiplomacyPopover({
  anchorEl,
  onClose,
  diplomacy,
  summitBeast,
  leaderboard,
  addressNames,
}: DiplomacyPopoverProps) {
  const rewardPerSecond = DIPLOMACY_REWARDS_PER_SECOND;
  const totalPower = diplomacy.totalPower - (summitBeast.diplomacy ? summitBeast.power : 0);

  return (
    <Popover
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      slotProps={{
        paper: {
          sx: styles.popover
        }
      }}
    >
      <Box sx={styles.header}>
        <Box sx={styles.headerRow}>
          <HandshakeIcon sx={{ fontSize: '14px', color: gameColors.yellow }} />
          <Typography sx={styles.title}>Diplomacy Beasts</Typography>
        </Box>
        <Typography sx={styles.subtitle}>
          +{diplomacy.bonus} STR bonus ({totalPower} power)
        </Typography>
      </Box>
      <Box sx={styles.list}>
        {diplomacy.beasts
          .filter(b => b.token_id !== summitBeast.token_id)
          .map((beast) => {
            const ownerRank = beast.owner
              ? leaderboard.findIndex(p =>
                addAddressPadding(p.owner) === addAddressPadding(beast.owner!)
              ) + 1
              : 0;
            return (
              <Box key={beast.token_id} sx={styles.beastRow}>
                <Box sx={styles.beastInfo}>
                  <Typography sx={styles.beastName}>
                    "{summitBeast.prefix} {summitBeast.suffix}" {beast.name}
                  </Typography>
                  <Typography sx={styles.beastMeta}>
                    Lvl {beast.current_level} | Pwr {beast.power}
                  </Typography>
                  <Typography sx={styles.beastOwner}>
                    {addressNames[beast.owner || ''] || 'Warlock'}
                    {ownerRank > 0 && ` (#${ownerRank})`}
                  </Typography>
                </Box>
                <Box sx={styles.beastReward}>
                  <Typography sx={styles.rewardValue}>
                    +{rewardPerSecond.toFixed(5)}
                  </Typography>
                  <Typography sx={styles.rewardLabel}>/sec</Typography>
                </Box>
              </Box>
            );
          })}
      </Box>
    </Popover>
  );
}

const styles = {
  popover: {
    background: `${gameColors.darkGreen}f5`,
    backdropFilter: 'blur(12px)',
    border: `1px solid ${gameColors.accentGreen}60`,
    borderRadius: '8px',
    minWidth: '260px',
    maxWidth: '320px',
  },
  header: {
    padding: '12px 14px',
    borderBottom: `1px solid ${gameColors.accentGreen}30`,
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  title: {
    fontSize: '13px',
    fontWeight: 'bold',
    color: gameColors.yellow,
    letterSpacing: '0.5px',
  },
  subtitle: {
    fontSize: '11px',
    color: gameColors.accentGreen,
    mt: 0.5,
  },
  list: {
    padding: '8px',
    maxHeight: '300px',
    overflowY: 'auto',
    '&::-webkit-scrollbar': {
      width: '6px',
    },
    '&::-webkit-scrollbar-track': {
      background: 'transparent',
    },
    '&::-webkit-scrollbar-thumb': {
      background: `${gameColors.accentGreen}40`,
      borderRadius: '3px',
    },
    '&::-webkit-scrollbar-thumb:hover': {
      background: `${gameColors.accentGreen}60`,
    },
  },
  beastRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 6px',
    borderRadius: '4px',
    borderBottom: `1px solid ${gameColors.accentGreen}15`,
    '&:last-child': {
      borderBottom: 'none',
    },
    '&:hover': {
      background: `${gameColors.accentGreen}10`,
    },
  },
  beastInfo: {
    flex: 1,
    overflow: 'hidden',
    mr: 1,
  },
  beastName: {
    fontSize: '11px',
    color: '#ffedbb',
    fontWeight: '600',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  beastMeta: {
    fontSize: '10px',
    color: gameColors.accentGreen,
    opacity: 0.8,
  },
  beastOwner: {
    fontSize: '10px',
    color: gameColors.accentGreen,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    mt: 0.25,
  },
  beastReward: {
    textAlign: 'right',
    flexShrink: 0,
  },
  rewardValue: {
    fontSize: '11px',
    color: gameColors.brightGreen,
    fontWeight: '600',
  },
  rewardLabel: {
    fontSize: '9px',
    color: gameColors.accentGreen,
    opacity: 0.7,
  },
};
