import { useGameTokens } from '@/dojo/useGameTokens';
import { useGameStore } from '@/stores/gameStore';
import { Adventurer } from '@/types/game';
import { BEAST_NAMES, ITEM_NAME_PREFIXES, ITEM_NAME_SUFFIXES } from '@/utils/BeastData';
import { Box, CircularProgress, Typography } from "@mui/material";
import { useEffect, useState } from 'react';
import { gameColors } from '../utils/themes';

interface AdventurerProfileProps {
  adventurer: Adventurer;
}

export default function AdventurerProfile({ adventurer }: AdventurerProfileProps) {
  const { collection } = useGameStore();
  const { getKilledBeasts } = useGameTokens();
  const [killedBeasts, setKilledBeasts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchKilledBeasts = async () => {
      try {
        const data = await getKilledBeasts(adventurer.id);
        console.log(data);
        setKilledBeasts(data);
      } catch (error) {
        console.error('Failed to fetch killed beasts:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchKilledBeasts();
  }, [adventurer.id]);

  // Create a structure with killed beast info and ownership status
  const killedBeastsWithOwnership = killedBeasts.map(killedBeast => {
    const beastName = BEAST_NAMES[killedBeast.id];
    const prefixName = ITEM_NAME_PREFIXES[killedBeast.prefix] || '';
    const suffixName = ITEM_NAME_SUFFIXES[killedBeast.suffix] || '';

    const beast = collection.find(b =>
      b.id === killedBeast.id &&
      b.prefix === prefixName &&
      b.suffix === suffixName
    );

    return {
      name: beastName,
      prefix: prefixName,
      suffix: suffixName,
      level: killedBeast.level,
      isOwned: !!beast,
    };
  });

  return (
    <Box sx={styles.container}>
      {/* Pixel Art Border Frame */}
      <Box sx={styles.pixelBorder}>
        {/* Main Content Area */}
        <Box sx={styles.mainContent}>
          {/* Killed Beasts Section */}
          <Box sx={styles.beastsSection}>
            <Typography sx={styles.sectionTitle}>
              BEASTS KILLED ({killedBeastsWithOwnership.length})
            </Typography>

            {loading ? (
              <Box sx={styles.loadingContainer}>
                <CircularProgress size={20} sx={{ color: gameColors.brightGreen }} />
              </Box>
            ) : killedBeastsWithOwnership.length > 0 ? (
              <Box sx={styles.beastList}>
                {killedBeastsWithOwnership.map((beast, index) => (
                  <Box key={index} sx={[
                    styles.beastListItem,
                    beast.isOwned && styles.ownedBeastItem
                  ]}>
                    <Box sx={styles.beastInfo}>
                      <Typography sx={[
                        styles.beastNameText,
                        beast.isOwned && styles.ownedBeastText
                      ]}>
                        {beast.name}
                      </Typography>
                      <Box sx={styles.beastDetails}>
                        <Typography sx={styles.beastLevelText}>
                          {beast.prefix} {beast.suffix}
                        </Typography>
                        <Typography sx={styles.beastLevelText}>
                          •
                        </Typography>
                        <Typography sx={styles.beastLevelText}>
                          Lvl {beast.level}
                        </Typography>
                      </Box>
                    </Box>
                    {beast.isOwned && (
                      <Box sx={styles.ownedBadge}>
                        <Typography sx={styles.ownedBadgeText}>OWNED</Typography>
                      </Box>
                    )}
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography sx={styles.emptyText}>
                No beasts killed yet
              </Typography>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

const styles = {
  beastDetails: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
  },
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: '280px',
    px: 1,
    pt: '8px',
    pb: '4px',
    background: '#1e1e22',
    border: '2px solid #d0c98d',
    borderRadius: '12px',
  },
  pixelBorder: {
    position: 'relative',
    width: '100%',
    padding: '4px',
  },
  headerContent: {
    textAlign: 'center',
    marginBottom: '8px',
  },
  adventurerName: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#FFF',
    letterSpacing: '1px',
    textTransform: 'uppercase',
    lineHeight: '1.2',
    marginBottom: '4px',
  },
  levelText: {
    fontSize: '12px',
    color: gameColors.accentGreen,
    letterSpacing: '0.5px',
  },
  mainContent: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
  },
  beastsSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  sectionTitle: {
    fontSize: '11px',
    color: gameColors.gameYellow,
    textShadow: '1px 1px 0px #000000',
    letterSpacing: '1px',
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  loadingContainer: {
    display: 'flex',
    height: '208px',
    justifyContent: 'center',
    alignItems: 'center',
    py: 2,
  },
  beastList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    maxHeight: '240px',
    overflowY: 'auto',
    '&::-webkit-scrollbar': {
      width: '4px',
    },
    '&::-webkit-scrollbar-track': {
      background: `${gameColors.darkGreen}40`,
      borderRadius: '2px',
    },
    '&::-webkit-scrollbar-thumb': {
      background: gameColors.accentGreen,
      borderRadius: '2px',
    },
    '&::-webkit-scrollbar-thumb:hover': {
      background: gameColors.brightGreen,
    },
  },
  beastListItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 10px',
    background: `${gameColors.darkGreen}60`,
    borderRadius: '4px',
    border: `1px solid ${gameColors.darkGreen}40`,
  },
  ownedBeastItem: {
    background: `${gameColors.darkGreen}40`,
    border: `1px solid ${gameColors.accentGreen}60`,
  },
  beastInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  beastNameText: {
    fontSize: '11px',
    color: '#FFF',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  ownedBeastText: {
    color: gameColors.brightGreen,
  },
  beastLevelText: {
    fontSize: '11px',
    color: gameColors.accentGreen,
    letterSpacing: '0.3px',
  },
  ownedBadge: {
    background: `linear-gradient(135deg, ${gameColors.brightGreen} 0%, ${gameColors.accentGreen} 100%)`,
    borderRadius: '3px',
    padding: '2px 6px',
    border: `1px solid ${gameColors.darkGreen}`,
  },
  ownedBadgeText: {
    fontSize: '9px',
    fontWeight: 'bold',
    color: gameColors.darkGreen,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    lineHeight: 1,
  },
  emptyText: {
    fontSize: '10px',
    color: gameColors.accentGreen,
    textAlign: 'center',
    py: 2,
    fontStyle: 'italic',
  },
  healthBonusContainer: {
    padding: '2px',
    borderRadius: '4px',
    background: `${gameColors.darkGreen}90`,
    backdropFilter: 'blur(4px)',
    border: `1px solid ${gameColors.brightGreen}60`,
    textAlign: 'center',
  },
  healthBonusContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    justifyContent: 'center',
  },
  healthBonusText: {
    fontSize: '12px',
    fontWeight: 'bold',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    textShadow: `0 1px 1px ${gameColors.darkGreen}`,
    color: gameColors.brightGreen,
  },
};