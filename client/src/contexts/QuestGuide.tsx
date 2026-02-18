import type { ReactNode} from 'react';
import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Box, Typography, Popper, Fade } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { gameColors } from '@/utils/themes';

export interface GuideStep {
  targetId: string;
  title: string;
  description: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end';
  // If true, the step auto-advances when the target is clicked
  advanceOnClick?: boolean;
  // Optional action text for the tooltip button
  actionText?: string;
  delay?: number;
}

export interface QuestGuide {
  id: string;
  questId: string;
  steps: GuideStep[];
}

export const questGuides: QuestGuide[] = [
  {
    id: 'first_blood_guide',
    questId: 'attack_summit',
    steps: [
      {
        targetId: 'beast-card-first',
        title: 'Select a Beast',
        description: 'Click on one of your beasts to select it for battle. Your beasts are ordered by strongest against the Summit.',
        placement: 'top',
        advanceOnClick: true,
        delay: 200,
      },
      {
        targetId: 'attack-button',
        title: 'Attack the Summit',
        description: 'Now click the Attack button to attack the summit beast and complete the quest.',
        placement: 'top',
        advanceOnClick: true,
      },
    ],
  },
  {
    id: 'attack_streak_guide',
    questId: 'max_attack_streak',
    steps: [
      {
        targetId: 'beast-card-first',
        title: 'Build Your Streak',
        description: 'Attack with the same beast multiple times to build an attack streak. The streak resets if you dont attack within 48 hours of your last attack. You can see your current streak by hovering over your beast.',
        placement: 'top',
        actionText: 'Got it',
      },
    ],
  },
  {
    id: 'level_up_guide',
    questId: 'level_up_1',
    steps: [
      {
        targetId: 'beast-card-first',
        title: 'Level Up Your Beast',
        description: 'Your beast gains XP from attacking. When it accumulates enough XP, it levels up automatically. Keep attacking to grow stronger!',
        placement: 'top',
        actionText: 'Got it',
      },
    ],
  },
  {
    id: 'revive_potion_guide',
    questId: 'revival_potion',
    steps: [
      {
        targetId: 'marketplace-button',
        title: 'Buy Revive Potions',
        description: 'First, open the Marketplace to buy Revive Potions. You need these to attack with dead beasts.',
        placement: 'left',
        actionText: 'Next',
      },
      {
        targetId: 'beast-collection-container',
        title: 'Find a Dead Beast',
        description: 'Look for a beast with 0 health. Dead beasts appear grayed out. Select it for battle.',
        placement: 'top',
        actionText: 'Next',
      },
      {
        targetId: 'revive-potion-display',
        title: 'Attack with Dead Beast',
        description: 'When you select a dead beast, revive potions are automatically applied when attacking. Just hit Attack',
        placement: 'top',
        actionText: 'Got it!',
      },
    ],
  },
  {
    id: 'attack_potion_guide',
    questId: 'attack_potion',
    steps: [
      {
        targetId: 'marketplace-button',
        title: 'Buy Attack Potions',
        description: 'First, open the Marketplace to buy Attack Potions. Each potion adds +10% damage to your attack',
        placement: 'left',
        actionText: 'Next',
      },
      {
        targetId: 'beast-card-first',
        title: 'Select a Beast',
        description: 'Select a beast you want to boost with attack potions.',
        placement: 'top',
        advanceOnClick: true,
        delay: 220,
      },
      {
        targetId: 'beast-card-potion-pill',
        title: 'Add Attack Potions',
        description: 'Click the potion icon on your selected beast to add attack potions, then attack',
        placement: 'top',
        actionText: 'Got it!',
      },
    ],
  },
];

interface QuestGuideContextType {
  activeGuide: QuestGuide | null;
  currentStepIndex: number;
  currentStep: GuideStep | null;
  startGuide: (questId: string) => void;
  stopGuide: () => void;
  advanceStep: () => void;
  isGuideActive: (questId: string) => boolean;
  isStepTarget: (targetId: string) => boolean;
  notifyTargetClicked: (targetId: string) => void;
}

const QuestGuideContext = createContext<QuestGuideContextType | null>(null);

export function QuestGuideProvider({ children }: { children: ReactNode }) {
  const [activeGuide, setActiveGuide] = useState<QuestGuide | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const observerRef = useRef<MutationObserver | null>(null);

  // Use refs to avoid stale closure issues in callbacks
  const activeGuideRef = useRef(activeGuide);
  const currentStepIndexRef = useRef(currentStepIndex);

  // Keep refs in sync with state
  useEffect(() => {
    activeGuideRef.current = activeGuide;
    currentStepIndexRef.current = currentStepIndex;
  }, [activeGuide, currentStepIndex]);

  const currentStep = activeGuide?.steps[currentStepIndex] ?? null;

  const startGuide = useCallback((questId: string) => {
    const guide = questGuides.find(g => g.questId === questId);
    if (guide) {
      setActiveGuide(guide);
      setCurrentStepIndex(0);
    }
  }, []);

  const stopGuide = useCallback(() => {
    setActiveGuide(null);
    setCurrentStepIndex(0);
    setAnchorEl(null);
  }, []);

  const advanceStep = useCallback(() => {
    const guide = activeGuideRef.current;
    const stepIndex = currentStepIndexRef.current;

    if (!guide) return;

    if (stepIndex < guide.steps.length - 1) {
      setCurrentStepIndex(stepIndex + 1);
      setAnchorEl(null); // Reset anchor for next step
    } else {
      // Guide completed
      setActiveGuide(null);
      setCurrentStepIndex(0);
      setAnchorEl(null);
    }
  }, []);

  const isGuideActive = useCallback((questId: string) => {
    return activeGuide?.questId === questId;
  }, [activeGuide]);

  const isStepTarget = useCallback((targetId: string) => {
    return currentStep?.targetId === targetId;
  }, [currentStep]);

  const notifyTargetClicked = useCallback((targetId: string) => {
    const guide = activeGuideRef.current;
    const stepIndex = currentStepIndexRef.current;
    const step = guide?.steps[stepIndex];
    const delay = step?.delay || 100;

    if (step?.targetId === targetId && step?.advanceOnClick) {
      // Small delay to let the click action complete
      setTimeout(() => advanceStep(), delay);
    }
  }, [advanceStep]);

  // Find and attach to target element
  useEffect(() => {
    if (!currentStep) {
      setAnchorEl(null);
      return;
    }

    const findTarget = () => {
      const target = document.getElementById(currentStep.targetId);
      if (target) {
        setAnchorEl(target);
        return true;
      }
      return false;
    };

    // Try to find immediately
    if (findTarget()) return;

    // Set up observer to find element when it appears
    observerRef.current = new MutationObserver(() => {
      if (findTarget()) {
        observerRef.current?.disconnect();
      }
    });

    observerRef.current.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, [currentStep]);

  return (
    <QuestGuideContext.Provider
      value={{
        activeGuide,
        currentStepIndex,
        currentStep,
        startGuide,
        stopGuide,
        advanceStep,
        isGuideActive,
        isStepTarget,
        notifyTargetClicked,
      }}
    >
      {children}

      {/* Guide Tooltip */}
      {currentStep && anchorEl && (
        <Popper
          open={true}
          anchorEl={anchorEl}
          placement={currentStep.placement || 'top'}
          transition
          modifiers={[
            {
              name: 'offset',
              options: {
                offset: [0, 12],
              },
            },
            {
              name: 'preventOverflow',
              options: {
                padding: 16,
              },
            },
          ]}
          sx={{ zIndex: 10001 }}
        >
          {({ TransitionProps }) => (
            <Fade {...TransitionProps} timeout={200}>
              <Box sx={styles.tooltipContainer}>
                {/* Arrow */}
                <Box sx={[styles.arrow, arrowStyles[currentStep.placement || 'top']]} />

                {/* Content */}
                <Box sx={styles.tooltipContent}>
                  <Box sx={styles.tooltipHeader}>
                    <Typography sx={styles.tooltipTitle}>{currentStep.title}</Typography>
                    <Box sx={styles.closeButton} onClick={stopGuide}>
                      <CloseIcon sx={{ fontSize: 16 }} />
                    </Box>
                  </Box>

                  <Typography sx={styles.tooltipDescription}>
                    {currentStep.description}
                  </Typography>

                  {/* Step indicator */}
                  <Box sx={styles.tooltipFooter}>
                    <Box sx={styles.stepIndicator}>
                      {activeGuide?.steps.map((_, idx) => (
                        <Box
                          key={idx}
                          sx={[
                            styles.stepDot,
                            idx === currentStepIndex && styles.stepDotActive,
                            idx < currentStepIndex && styles.stepDotComplete,
                          ]}
                        />
                      ))}
                    </Box>

                    {(currentStep.actionText || !currentStep.advanceOnClick) && (
                      <Box sx={styles.actionButton} onClick={advanceStep}>
                        <Typography sx={styles.actionButtonText}>
                          {currentStep.actionText || 'Next'}
                        </Typography>
                        <ArrowForwardIcon sx={{ fontSize: 14 }} />
                      </Box>
                    )}
                  </Box>
                </Box>
              </Box>
            </Fade>
          )}
        </Popper>
      )}

      {/* Backdrop overlay - pointer-events: none allows clicks to pass through */}
      {activeGuide && (
        <Box sx={styles.backdrop} />
      )}
    </QuestGuideContext.Provider>
  );
}

export function useQuestGuide() {
  const context = useContext(QuestGuideContext);
  if (!context) {
    throw new Error('useQuestGuide must be used within a QuestGuideProvider');
  }
  return context;
}

const arrowStyles = {
  top: {
    bottom: '-6px',
    left: '50%',
    transform: 'translateX(-50%) rotate(45deg)',
  },
  'top-start': {
    bottom: '-6px',
    left: '20px',
    transform: 'rotate(45deg)',
  },
  'top-end': {
    bottom: '-6px',
    right: '20px',
    transform: 'rotate(45deg)',
  },
  bottom: {
    top: '-6px',
    left: '50%',
    transform: 'translateX(-50%) rotate(45deg)',
  },
  'bottom-start': {
    top: '-6px',
    left: '20px',
    transform: 'rotate(45deg)',
  },
  'bottom-end': {
    top: '-6px',
    right: '20px',
    transform: 'rotate(45deg)',
  },
  left: {
    right: '-6px',
    top: '50%',
    transform: 'translateY(-50%) rotate(-45deg)',
  },
  right: {
    left: '-6px',
    top: '50%',
    transform: 'translateY(-50%) rotate(135deg)',
  },
};

const styles = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    zIndex: 9999,
    pointerEvents: 'none', // Allow clicks to pass through to target elements
  },
  tooltipContainer: {
    position: 'relative',
    filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.5))',
  },
  arrow: {
    position: 'absolute',
    width: '12px',
    height: '12px',
    backgroundColor: gameColors.darkGreen,
    border: `1px solid ${gameColors.brightGreen}`,
    borderTop: 'none',
    borderLeft: 'none',
  },
  tooltipContent: {
    background: `linear-gradient(135deg, ${gameColors.darkGreen} 0%, ${gameColors.mediumGreen} 100%)`,
    border: `2px solid ${gameColors.brightGreen}`,
    borderRadius: '12px',
    padding: '12px 16px',
    minWidth: '220px',
    maxWidth: '300px',
  },
  tooltipHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 1,
    mb: 1,
  },
  tooltipTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#ffedbb',
    letterSpacing: '0.5px',
  },
  closeButton: {
    cursor: 'pointer',
    color: gameColors.accentGreen,
    opacity: 0.7,
    transition: 'opacity 0.2s',
    '&:hover': {
      opacity: 1,
    },
  },
  tooltipDescription: {
    fontSize: '13px',
    color: gameColors.accentGreen,
    lineHeight: 1.4,
    mb: 1.5,
  },
  tooltipFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 1,
  },
  stepIndicator: {
    display: 'flex',
    gap: '6px',
  },
  stepDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: `${gameColors.accentGreen}40`,
    transition: 'all 0.2s',
  },
  stepDotActive: {
    backgroundColor: gameColors.brightGreen,
    boxShadow: `0 0 8px ${gameColors.brightGreen}60`,
  },
  stepDotComplete: {
    backgroundColor: gameColors.accentGreen,
  },
  actionButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 12px',
    borderRadius: '6px',
    backgroundColor: `${gameColors.brightGreen}20`,
    border: `1px solid ${gameColors.brightGreen}60`,
    cursor: 'pointer',
    transition: 'all 0.2s',
    color: gameColors.brightGreen,
    '&:hover': {
      backgroundColor: `${gameColors.brightGreen}30`,
      borderColor: gameColors.brightGreen,
    },
  },
  actionButtonText: {
    fontSize: '12px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
};
