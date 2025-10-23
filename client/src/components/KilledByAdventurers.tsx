import { useGameStore } from '@/stores/gameStore'
import { Box, Typography } from '@mui/material'
import { gameColors } from '../utils/themes'

function KilledByAdventurers() {
  const { killedByAdventurers, adventurerCollection } = useGameStore()

  // Check if any of the killedBy adventurers are owned by the user
  const ownedAdventurerIds = adventurerCollection.map(adventurer => adventurer.id)

  return (
    <Box sx={styles.container}>
      <Typography sx={styles.title}>KILLED BY</Typography>
      <Typography sx={styles.explainerText}>
        Feeding these adventurers gives 10x health bonus
      </Typography>
      <Box sx={styles.adventurerList}>
        {killedByAdventurers.map((id) => {
          const isOwned = ownedAdventurerIds.includes(id)
          return (
            <Box key={id} sx={[styles.adventurerCard, isOwned && styles.ownedAdventurerCard]}>
              {/* Tombstone Image */}
              <Box sx={[styles.imageContainer, isOwned && styles.ownedImageContainer]}>
                <img
                  src={'/images/tombstone.png'}
                  alt="tombstone"
                  style={styles.tombstoneImage}
                />
              </Box>

              {/* Adventurer ID */}
              <Typography sx={[styles.adventurerId, isOwned && styles.ownedAdventurerId]}>
                #{id}
              </Typography>

              {/* Ownership indicator */}
              {isOwned && (
                <Box sx={styles.ownershipIndicator}>
                  <Typography sx={styles.ownershipText}>OWNED</Typography>
                </Box>
              )}
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}

export default KilledByAdventurers

const styles = {
  container: {
    width: '280px',
    height: '80%',
    display: 'flex',
    flexDirection: 'column',
    backdropFilter: 'blur(12px) saturate(1.2)',
    border: `1px solid ${gameColors.accentGreen}40`,
    borderRadius: '6px',
    padding: '12px 10px',
    boxSizing: 'border-box',
    background: `linear-gradient(135deg, ${gameColors.darkGreen}80 0%, ${gameColors.mediumGreen}40 100%)`,
    boxShadow: `
      inset 0 1px 0 ${gameColors.accentGreen}40,
      0 2px 4px rgba(0, 0, 0, 0.3)
    `,
  },
  title: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: gameColors.gameYellow,
    textAlign: 'center',
    letterSpacing: '1px',
    textTransform: 'uppercase',
    marginBottom: '8px',
    textShadow: `
      0 2px 4px rgba(0, 0, 0, 0.8),
      0 0 8px ${gameColors.gameYellow}40
    `,
  },
  explainerText: {
    fontSize: '12px',
    color: gameColors.yellow,
    textAlign: 'center',
    letterSpacing: '0.3px',
    marginBottom: '8px',
    lineHeight: 1.2,
  },
  adventurerList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    overflowY: 'auto',
    flex: 1,
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
  adventurerCard: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    background: `linear-gradient(135deg, ${gameColors.mediumGreen}60 0%, ${gameColors.darkGreen}80 100%)`,
    borderRadius: '6px',
    padding: '4px',
    border: `1px solid ${gameColors.accentGreen}30`,
  },
  imageContainer: {
    width: '32px',
    height: '32px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: '4px',
    background: `linear-gradient(135deg, ${gameColors.darkGreen} 0%, ${gameColors.black} 100%)`,
    boxShadow: `inset 0 1px 0 ${gameColors.darkGreen}, inset 0 -1px 0 ${gameColors.black}`,
    flexShrink: 0,
  },
  tombstoneImage: {
    width: '24px',
    height: '24px',
    objectFit: 'contain' as const,
  },
  adventurerId: {
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#FFF',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    textShadow: `0 1px 2px ${gameColors.darkGreen}`,
    flex: 1,
    textAlign: 'center',
    pr: 4,
  },
  ownedAdventurerCard: {
    background: `linear-gradient(135deg, ${gameColors.lightGreen}80 0%, ${gameColors.mediumGreen}90 100%)`,
    border: `1px solid ${gameColors.brightGreen}60`,
  },
  ownedImageContainer: {
    background: `linear-gradient(135deg, ${gameColors.mediumGreen} 0%, ${gameColors.lightGreen} 100%)`,
    boxShadow: `inset 0 1px 0 ${gameColors.brightGreen}40, inset 0 -1px 0 ${gameColors.darkGreen}`,
  },
  ownedAdventurerId: {
    color: gameColors.brightGreen,
    textShadow: `
      0 1px 2px ${gameColors.darkGreen},
      0 0 4px ${gameColors.brightGreen}60
    `,
  },
  ownershipIndicator: {
    position: 'absolute',
    top: '4px',
    right: '4px',
    background: `linear-gradient(135deg, ${gameColors.brightGreen} 0%, ${gameColors.lightGreen} 100%)`,
    borderRadius: '3px',
    padding: '2px 4px',
    border: `1px solid ${gameColors.darkGreen}`,
    boxShadow: `0 1px 2px rgba(0, 0, 0, 0.3)`,
  },
  ownershipText: {
    fontSize: '8px',
    fontWeight: 'bold',
    color: gameColors.darkGreen,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    lineHeight: 1,
  },
  emptyContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  emptyText: {
    fontSize: '12px',
    color: '#ffedbb',
    fontWeight: 'bold',
    letterSpacing: '0.5px',
    textAlign: 'center',
    textShadow: `0 1px 2px ${gameColors.darkGreen}`,
  },
}
