import { Box, Typography } from '@mui/material';
import { BattleEvent, PoisonEvent, DiplomacyEvent, SummitEvent, RewardEvent } from '@/dojo/useEventHistory';
import { gameColors } from '@/utils/themes';
import { BEAST_NAMES, ITEM_NAME_PREFIXES, ITEM_NAME_SUFFIXES } from '@/utils/BeastData';
import { memo } from 'react';

// Simple time formatting function to avoid additional dependencies
const formatTimeAgo = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  } else {
    return `${seconds}s`;
  }
};

const formatAddress = (addr: string) => {
  if (!addr || addr.length <= 10) return addr;
  return `${addr.slice(0, 4)}...${addr.slice(-3)}`;
};

const PlayerName = memo(({ address, playerNames }: { address: string; playerNames: { [address: string]: string | null } }) => {
  const playerName = playerNames[address] || playerNames[address.toLowerCase()];
  const displayName = playerName || formatAddress(address);
  
  return (
    <Box component="span" sx={sharedStyles.playerName}>
      {displayName}
    </Box>
  );
});

interface EventItemProps {
  event: BattleEvent | PoisonEvent | DiplomacyEvent | SummitEvent | RewardEvent;
  playerNames: { [address: string]: string | null };
}

export const BattleEventItem = memo(({ event, playerNames }: { event: BattleEvent; playerNames: { [address: string]: string | null } }) => {
  const totalDamage = event.attack_damage + event.critical_attack_damage;
  const timeAgo = formatTimeAgo(event.timestamp);

  return (
    <Box sx={compactStyles.container}>
      <Typography sx={compactStyles.mainText}>
        <Box component="span" sx={[compactStyles.eventIcon, { color: gameColors.red }]}>⚔️</Box>
        <PlayerName address={event.attacking_beast_owner} playerNames={playerNames} />
        {' dealt '}
        <Box component="span" sx={compactStyles.damage}>
          {totalDamage} damage
        </Box>
        {' to summit'}
        {event.critical_attack_damage > 0 && (
          <Box component="span" sx={compactStyles.highlight}>
            {' (crit!)'}
          </Box>
        )}
        <Box component="span" sx={compactStyles.timestamp}> • {timeAgo}</Box>
      </Typography>
    </Box>
  );
});

export const PoisonEventItem = memo(({ event, playerNames }: { event: PoisonEvent; playerNames: { [address: string]: string | null } }) => {
  const timeAgo = formatTimeAgo(event.timestamp);

  return (
    <Box sx={compactStyles.container}>
      <Typography sx={compactStyles.mainText}>
        <Box component="span" sx={[compactStyles.eventIcon, { color: '#9b59b6' }]}>🧪</Box>
        <PlayerName address={event.player} playerNames={playerNames} />
        {' applied '}
        <Box component="span" sx={compactStyles.highlight}>
          {event.count} poison
        </Box>
        <Box component="span" sx={compactStyles.timestamp}> • {timeAgo}</Box>
      </Typography>
    </Box>
  );
});

export const DiplomacyEventItem = memo(({ event }: { event: DiplomacyEvent }) => {
  const timeAgo = formatTimeAgo(event.timestamp);

  return (
    <Box sx={compactStyles.container}>
      <Typography sx={compactStyles.mainText}>
        <Box component="span" sx={[compactStyles.eventIcon, { color: gameColors.yellow }]}>🤝</Box>
        {'Diplomacy alliance formed with '}
        <Box component="span" sx={compactStyles.highlight}>
          {event.total_power} power
        </Box>
        {' ('}
        <Box component="span" sx={compactStyles.detail}>
          {event.beast_token_ids.length} beasts
        </Box>
        {')'}
        <Box component="span" sx={compactStyles.timestamp}> • {timeAgo}</Box>
      </Typography>
    </Box>
  );
});

export const SummitEventItem = memo(({ event, playerNames }: { event: SummitEvent; playerNames: { [address: string]: string | null } }) => {
  const beastName = BEAST_NAMES[event.beast_id as keyof typeof BEAST_NAMES] || 'Beast';
  const prefix = ITEM_NAME_PREFIXES[event.beast_prefix as keyof typeof ITEM_NAME_PREFIXES] || '';
  const suffix = ITEM_NAME_SUFFIXES[event.beast_suffix as keyof typeof ITEM_NAME_SUFFIXES] || '';
  const fullName = `"${prefix} ${suffix}" ${beastName}`.trim();
  const timeAgo = formatTimeAgo(event.timestamp);

  return (
    <Box sx={compactStyles.container}>
      <Typography sx={compactStyles.mainText}>
        <Box component="span" sx={[compactStyles.eventIcon, { color: gameColors.brightGreen }]}>👑</Box>
        <PlayerName address={event.owner} playerNames={playerNames} />
        {' claimed summit with '}
        {event.beast_token_id ? (
          <Box 
            component="a" 
            href={`https://beast-dex.vercel.app/beasts/${event.beast_token_id}`}
            target="_blank"
            rel="noopener noreferrer"
            sx={compactStyles.beastLink}
          >
            {fullName}
          </Box>
        ) : (
          <Box component="span" sx={compactStyles.highlight}>
            {fullName}
          </Box>
        )}
        <Box component="span" sx={compactStyles.timestamp}> • {timeAgo}</Box>
      </Typography>
    </Box>
  );
});

export const RewardEventItem = memo(({ event, playerNames }: { event: RewardEvent; playerNames: { [address: string]: string | null } }) => {
  const timeAgo = formatTimeAgo(event.timestamp);
  const survivorAmount = (event.amount / 10000).toFixed(2);

  return (
    <Box sx={compactStyles.container}>
      <Typography sx={compactStyles.mainText}>
        <Box 
          component="img" 
          src="/images/survivor_token.png" 
          alt="SURVIVOR" 
          sx={compactStyles.tokenIcon}
        />
        <PlayerName address={event.owner} playerNames={playerNames} />
        {' rewarded '}
        <Box component="span" sx={compactStyles.highlight}>
          {survivorAmount} SURVIVOR
        </Box>
        <Box component="span" sx={compactStyles.timestamp}> • {timeAgo}</Box>
      </Typography>
    </Box>
  );
});

export default function EventItem({ event, playerNames }: EventItemProps) {
  switch (event.type) {
    case 'battle':
      return <BattleEventItem event={event} playerNames={playerNames} />;
    case 'poison':
      return <PoisonEventItem event={event} playerNames={playerNames} />;
    case 'diplomacy':
      return <DiplomacyEventItem event={event} />;
    case 'summit':
      return <SummitEventItem event={event} playerNames={playerNames} />;
    case 'reward':
      return <RewardEventItem event={event} playerNames={playerNames} />;
    default:
      return null;
  }
}

// Shared styles for compact design
const sharedStyles = {
  playerName: {
    color: gameColors.yellow,
    fontWeight: 'bold',
    fontSize: 'inherit',
  },
};

// Compact event styles - completely bulletproof, no transitions or hover effects
const compactStyles = {
  container: {
    background: `${gameColors.darkGreen}40`,
    border: `1px solid ${gameColors.accentGreen}20`,
    borderRadius: '4px',
    p: 0.75,
    mb: 0.5,
    minHeight: '20px',
  },
  mainText: {
    fontSize: '13px',
    color: '#fff',
    lineHeight: 1.4,
    display: 'flex',
    alignItems: 'center',
    gap: 0.5,
    flexWrap: 'wrap' as const,
  },
  eventIcon: {
    fontSize: '14px',
    lineHeight: 1,
    mr: 0.5,
  },
  tokenIcon: {
    width: '14px',
    height: '14px',
    mr: 0.5,
  },
  timestamp: {
    fontSize: '11px',
    color: '#888',
    fontWeight: 'normal',
    ml: 'auto',
  },
  highlight: {
    color: gameColors.brightGreen,
    fontWeight: 'bold',
  },
  damage: {
    color: gameColors.red,
    fontWeight: 'bold',
  },
  detail: {
    color: '#aaa',
    fontSize: '10px',
  },
  beastLink: {
    color: gameColors.brightGreen,
    fontWeight: 'bold',
    textDecoration: 'none',
    '&:hover': {
      textDecoration: 'underline',
    },
  },
};