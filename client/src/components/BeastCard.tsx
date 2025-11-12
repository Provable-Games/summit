import { Beast, Combat } from '@/types/game';
import CasinoIcon from '@mui/icons-material/Casino';
import StarIcon from '@mui/icons-material/Star';
import EnergyIcon from '@mui/icons-material/ElectricBolt';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import { Box, Typography } from "@mui/material";
import { memo } from 'react';
import { fetchBeastImage } from "../utils/beasts";
import { gameColors } from '../utils/themes';
import swordIcon from '../assets/images/sword.png';

interface BeastCardProps {
  beast: Beast;
  isSelected: boolean;
  isSavage: boolean;
  isDead: boolean;
  combat: Combat | null;
  selectionIndex: number;
  summitHealth: number;
  onClick: () => void;
  onMouseEnter: (e: React.MouseEvent<HTMLElement>) => void;
  onMouseLeave: () => void;
}

const BeastCard = memo(({
  beast,
  isSelected,
  isSavage,
  isDead,
  combat,
  selectionIndex,
  summitHealth,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: BeastCardProps) => {
  return (
    <Box
      sx={[
        styles.beastCard,
        isSelected && styles.selectedCard,
        isDead && styles.deadCard,
      ]}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Glow effect for selected cards */}
      {isSelected && (
        <Box sx={styles.glowEffect} />
      )}

      {/* Beast Image */}
      <Box sx={styles.imageContainer}>
        <img
          src={fetchBeastImage(beast)}
          alt={beast.name}
          style={{ ...styles.beastImage }}
        />

        {/* Upgrade Icons */}
        {(beast.stats.spirit || beast.stats.luck || beast.stats.specials) && (
          <Box sx={styles.upgradeIconsContainer}>
            {beast.stats.luck && (
              <Box sx={{ color: '#ff69b4' }}>
                <CasinoIcon sx={{ fontSize: '14px' }} />
              </Box>
            )}
            {beast.stats.spirit && (
              <Box sx={{ color: '#00ffff' }}>
                <EnergyIcon sx={{ fontSize: '14px' }} />
              </Box>
            )}
            {beast.stats.specials && (
              <Box sx={{ color: '#ffd700' }}>
                <StarIcon sx={{ fontSize: '14px' }} />
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* Beast Name */}
      <Typography sx={styles.beastName}>
        {beast.name}
      </Typography>

      {/* Stats Row */}
      <Box sx={styles.statsRow}>
        {/* Power */}
        <Box sx={styles.stat}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill={gameColors.yellow}>
            <path d="M7 2v11h3v9l7-12h-4l4-8z" />
          </svg>
          <Typography sx={styles.statText}>
            {beast.power}
          </Typography>
        </Box>

        {/* Health */}
        <Box sx={styles.stat}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill={gameColors.red}>
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
          <Typography sx={styles.statText}>
            {isSavage ? summitHealth : beast.current_health}
          </Typography>
        </Box>
      </Box>

      {/* Combat Preview */}
      {combat && (
        <Box sx={styles.combatPreview}>
          {/* Main stats row with banner design */}
          <Box sx={styles.combatStatsRow}>
            {/* Attack banner from left */}
            <Box sx={styles.combatStatLeft}>
              <img src={swordIcon} alt="" style={{ width: '12px', height: '12px' }} />
              <Typography sx={styles.combatStatText}>
                {combat.attack}
              </Typography>
            </Box>

            {/* Defense banner from right */}
            <Box sx={styles.combatStatRight}>
              <Typography sx={styles.combatStatText}>
                {combat.defense}
              </Typography>
              <ShieldOutlinedIcon sx={{ fontSize: '13px', color: gameColors.blue }} />
            </Box>
          </Box>

          {/* Critical damage row */}
          <Box sx={styles.combatCritRow}>
            <Box sx={styles.combatCritStatLeft}>
              <Typography sx={styles.combatCritValue}>
                {combat.attackCritDamage > 0 ? combat.attackCritDamage : '-'}
              </Typography>
            </Box>
            <Box sx={styles.combatCritStatRight}>
              <Typography sx={styles.combatCritValue}>
                {combat.defenseCritDamage > 0 ? combat.defenseCritDamage : '-'}
              </Typography>
            </Box>
          </Box>
        </Box>
      )}

      {/* Status indicators */}
      {isSavage && (
        <Box sx={styles.savageIndicator}>
          <Typography sx={styles.savageText}>
            SUMMIT
          </Typography>
        </Box>
      )}

      {/* Selection order number */}
      {isSelected && (
        <Box sx={styles.selectionIndicator}>
          <Typography sx={styles.selectionNumber}>
            {selectionIndex}
          </Typography>
        </Box>
      )}
    </Box>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for memo
  return (
    prevProps.beast.token_id === nextProps.beast.token_id &&
    prevProps.beast.current_health === nextProps.beast.current_health &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isSavage === nextProps.isSavage &&
    prevProps.isDead === nextProps.isDead &&
    prevProps.selectionIndex === nextProps.selectionIndex &&
    prevProps.summitHealth === nextProps.summitHealth &&
    prevProps.combat?.attack === nextProps.combat?.attack &&
    prevProps.combat?.defense === nextProps.combat?.defense &&
    prevProps.combat?.attackCritDamage === nextProps.combat?.attackCritDamage &&
    prevProps.combat?.defenseCritDamage === nextProps.combat?.defenseCritDamage
  );
});

BeastCard.displayName = 'BeastCard';

export default BeastCard;

const styles = {
  beastCard: {
    position: 'relative',
    background: `linear-gradient(135deg, ${gameColors.mediumGreen} 0%, ${gameColors.darkGreen} 100%)`,
    borderRadius: '6px',
    padding: '6px',
    mt: '6px',
    mb: '4px',
    boxSizing: 'border-box',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    overflow: 'hidden',
    width: '140px',
    minWidth: '140px',
    height: '180px',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    boxShadow: `
      inset 0 1px 0 ${gameColors.accentGreen}40,
      0 2px 4px rgba(0, 0, 0, 0.3),
      0 0 0 1px ${gameColors.darkGreen}
    `,
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: `
        inset 0 1px 0 ${gameColors.brightGreen}60,
        0 8px 16px rgba(127, 255, 0, 0.2),
        0 0 0 2px ${gameColors.accentGreen}
      `,
    },
  },
  selectedCard: {
    background: `linear-gradient(135deg, ${gameColors.lightGreen} 0%, ${gameColors.mediumGreen} 100%)`,
    boxShadow: `
      inset 0 1px 0 ${gameColors.brightGreen}80,
      0 4px 12px rgba(127, 255, 0, 0.4),
      0 0 0 2px ${gameColors.brightGreen}
    `,
    '&:hover': {
      boxShadow: `
        inset 0 1px 0 ${gameColors.brightGreen},
        0 8px 20px rgba(127, 255, 0, 0.5),
        0 0 0 2px ${gameColors.brightGreen}
      `,
    }
  },
  deadCard: {
    opacity: 0.5,
    filter: 'grayscale(100%)',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: `
        inset 0 1px 0 ${gameColors.darkGray}40,
        0 2px 4px rgba(0, 0, 0, 0.3),
        0 0 0 1px ${gameColors.darkGray}
      `,
    }
  },
  glowEffect: {
    position: 'absolute',
    top: '-50%',
    left: '-50%',
    width: '200%',
    height: '200%',
    background: `radial-gradient(circle, ${gameColors.brightGreen}20 0%, transparent 70%)`,
    animation: 'pulse 2s ease-in-out infinite',
    '@keyframes pulse': {
      '0%, 100%': {
        opacity: 0.5,
      },
      '50%': {
        opacity: 0.8,
      }
    }
  },
  waitingForUpgradeCard: {
    border: `2px solid ${gameColors.yellow}`,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: '110px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '4px',
    borderRadius: '8px',
    overflow: 'hidden',
    background: `linear-gradient(135deg, ${gameColors.darkGreen} 0%, ${gameColors.black} 100%)`,
    boxShadow: `inset 0 1px 0 ${gameColors.darkGreen}, inset 0 -1px 0 ${gameColors.black}`,
  },
  upgradeIconsContainer: {
    position: 'absolute',
    top: '2px',
    right: '0px',
    display: 'flex',
    flexDirection: 'column',
  },
  beastImage: {
    maxWidth: '90%',
    maxHeight: '90%',
    filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5))',
  },
  beastName: {
    fontSize: '13px',
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#FFF',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '4px',
    textShadow: `0 1px 2px ${gameColors.darkGreen}`,
  },
  statsRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: 1,
    marginBottom: '2px',
  },
  stat: {
    display: 'flex',
    alignItems: 'center',
    flex: 1,
    gap: '3px',
    padding: '3px 10px',
    borderRadius: '4px',
    background: `${gameColors.darkGreen}80`,
    backdropFilter: 'blur(4px)',
  },
  statText: {
    fontSize: '14px',
    color: '#FFF',
    fontWeight: 'bold',
    textShadow: `0 1px 1px ${gameColors.darkGreen}`,
  },
  savageIndicator: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    backgroundColor: gameColors.yellow,
    padding: '2px 6px',
    borderRadius: '4px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
  },
  savageText: {
    fontSize: '9px',
    color: gameColors.darkGreen,
    fontWeight: 'bold',
    letterSpacing: '0.5px',
  },
  selectionIndicator: {
    position: 'absolute',
    top: '10px',
    left: '10px',
  },
  selectionNumber: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#d0c98d',
    lineHeight: 1,
  },
  combatPreview: {
    padding: '2px',
    borderRadius: '4px',
    background: `${gameColors.darkGreen}90`,
    backdropFilter: 'blur(4px)',
    border: `1px solid ${gameColors.accentGreen}40`,
    marginTop: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  combatStatsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '4px',
    position: 'relative',
  },
  combatStatLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    padding: '0px 4px',
    paddingRight: '8px',
    background: `linear-gradient(90deg, ${gameColors.red}50 0%, ${gameColors.red}30 100%)`,
    borderLeft: `2px solid ${gameColors.red}`,
    borderTop: `1px solid ${gameColors.red}60`,
    borderBottom: `1px solid ${gameColors.red}60`,
    position: 'relative',
    clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 50%, calc(100% - 6px) 100%, 0 100%)',
    boxShadow: `0 2px 4px rgba(0, 0, 0, 0.3), inset 0 1px 0 ${gameColors.red}40`,
  },
  combatStatRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    padding: '0px 4px',
    paddingLeft: '8px',
    background: `linear-gradient(270deg, ${gameColors.blue}50 0%, ${gameColors.blue}30 100%)`,
    borderRight: `2px solid ${gameColors.blue}`,
    borderTop: `1px solid ${gameColors.blue}60`,
    borderBottom: `1px solid ${gameColors.blue}60`,
    position: 'relative',
    clipPath: 'polygon(6px 0, 100% 0, 100% 100%, 6px 100%, 0 50%)',
    boxShadow: `0 2px 4px rgba(0, 0, 0, 0.3), inset 0 1px 0 ${gameColors.blue}40`,
  },
  combatStatText: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#FFF',
    textShadow: `0 1px 2px ${gameColors.black}, 0 0 4px ${gameColors.black}80`,
  },
  combatCritRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '4px',
  },
  combatCritStatLeft: {
    display: 'flex',
    alignItems: 'center',
    padding: '0px 4px',
    paddingRight: '8px',
    background: `linear-gradient(90deg, ${gameColors.yellow}50 0%, ${gameColors.yellow}30 100%)`,
    borderLeft: `2px solid ${gameColors.yellow}`,
    borderTop: `1px solid ${gameColors.yellow}60`,
    borderBottom: `1px solid ${gameColors.yellow}60`,
    position: 'relative',
    clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 50%, calc(100% - 6px) 100%, 0 100%)',
    boxShadow: `0 2px 4px rgba(0, 0, 0, 0.3), inset 0 1px 0 ${gameColors.yellow}40`,
  },
  combatCritStatRight: {
    display: 'flex',
    alignItems: 'center',
    padding: '0px 4px',
    paddingLeft: '8px',
    background: `linear-gradient(270deg, ${gameColors.yellow}50 0%, ${gameColors.yellow}30 100%)`,
    borderRight: `2px solid ${gameColors.yellow}`,
    borderTop: `1px solid ${gameColors.yellow}60`,
    borderBottom: `1px solid ${gameColors.yellow}60`,
    position: 'relative',
    clipPath: 'polygon(6px 0, 100% 0, 100% 100%, 6px 100%, 0 50%)',
    boxShadow: `0 2px 4px rgba(0, 0, 0, 0.3), inset 0 1px 0 ${gameColors.yellow}40`,
  },
  combatCritValue: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#FFF',
    textShadow: `0 1px 2px ${gameColors.darkGreen}`,
  },
};

