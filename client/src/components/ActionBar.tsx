import { useController } from '@/contexts/controller';
import { useGameDirector } from '@/contexts/GameDirector';
import { useGameStore } from '@/stores/gameStore';
import AddIcon from '@mui/icons-material/Add';
import FavoriteIcon from '@mui/icons-material/Favorite';
import RemoveIcon from '@mui/icons-material/Remove';
import { Box, Checkbox, IconButton, Menu, Slider, Tooltip, Typography } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { isBrowser } from 'react-device-detect';
import attackPotionIcon from '../assets/images/attack-potion.png';
import cauldronIcon from '../assets/images/cauldron.png';
import heart from '../assets/images/heart.png';
import lifePotionIcon from '../assets/images/life-potion.png';
import revivePotionIcon from '../assets/images/revive-potion.png';
import { gameColors } from '../utils/themes';

interface ActionBarProps {
  [key: string]: any;
}

function ActionBar(props: ActionBarProps) {
  const { executeGameAction } = useGameDirector();
  const { tokenBalances } = useController();

  const { selectedBeasts, summit, showFeedingGround, setAttackInProgress,
    selectedAdventurers, attackInProgress, collection, setShowFeedingGround,
    feedingInProgress, adventurerCollection, appliedPotions, setAppliedPotions,
    setFeedingInProgress, setSelectedAdventurers, setAdventurerCollection, killedByAdventurers } = useGameStore();

  const [anchorEl, setAnchorEl] = useState(null);
  const [potion, setPotion] = useState(null)
  const [safeAttack, setSafeAttack] = useState(true);

  const handleClick = (event: React.MouseEvent<HTMLElement>, potion: any) => {
    setAnchorEl(event.currentTarget);
    setPotion(potion);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setPotion(null);
  };

  const handleAttack = () => {
    if (!enableAttack) return;

    setAttackInProgress(true);

    executeGameAction({
      type: 'attack',
      beastIds: selectedBeasts.map(beast => beast.token_id),
      appliedPotions: appliedPotions,
      safeAttack: safeAttack
    });
  }

  const handleFeed = async () => {
    if (!enableFeedingGround) return;

    setFeedingInProgress(true);

    let result = await executeGameAction({
      type: 'feed',
      beastId: selectedBeasts[0].token_id,
      adventurerIds: selectedAdventurers.map(adventurer => adventurer.id)
    });

    if (result) {
      setAdventurerCollection(adventurerCollection.filter(
        adventurer => !selectedAdventurers.some(selected => selected.id === adventurer.id)
      ));
      setSelectedAdventurers([]);
    }

    setFeedingInProgress(false);
  }

  const isSavage = Boolean(collection.find((beast: any) => beast.token_id === summit?.beast?.token_id))

  const deadBeasts = selectedBeasts.filter((beast: any) => beast.current_health === 0);
  const revivalPotionsRequired = deadBeasts.reduce((sum: number, beast: any) => sum + beast.revival_count + 1, 0);

  useEffect(() => {
    if (deadBeasts.length > 0 && appliedPotions.revive < revivalPotionsRequired) {
      setAppliedPotions({
        ...appliedPotions,
        revive: Math.min(revivalPotionsRequired, tokenBalances["REVIVE"] || 0)
      });
    } else if (deadBeasts.length === 0 && appliedPotions.revive > 0) {
      // Clear revive potions if no dead beasts selected
      setAppliedPotions({ ...appliedPotions, revive: 0 });
    }
  }, [deadBeasts.length, revivalPotionsRequired, tokenBalances["REVIVE"]]);

  const hasEnoughRevivePotions = tokenBalances["REVIVE"] >= revivalPotionsRequired;
  const enableAttack = !attackInProgress && selectedBeasts.length > 0 && hasEnoughRevivePotions;
  const enableFeedingGround = selectedBeasts.length === 1 && adventurerCollection.length > 0;

  const enableExtraLifePotion = tokenBalances["EXTRA LIFE"] > 0;
  const enableAttackPotion = tokenBalances["ATTACK"] > 0;
  const isappliedPotions = appliedPotions.revive + appliedPotions.attack + appliedPotions.extraLife > 0

  if (showFeedingGround) {
    return <Box sx={styles.container}>
      <Box sx={styles.buttonGroup}>
        <Box sx={[styles.attackButton, (!feedingInProgress && selectedAdventurers.length >= 1) && styles.attackButtonEnabled]}
          onClick={handleFeed}>
          {feedingInProgress
            ? <Box display={'flex'} alignItems={'baseline'}>
              <Typography variant="h5" sx={styles.buttonText}>Feeding</Typography>
              <div className='dotLoader green' />
            </Box>
            : <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
              <Typography variant="h5" sx={styles.buttonText}>
                Feed
              </Typography>

              {selectedAdventurers.length > 0 && <Box display={'flex'} gap={'4px'} alignItems={'center'}>
                <Typography sx={styles.statText} variant='h6'>
                  +{selectedAdventurers.reduce((sum, adventurer) => {
                    const healthGiven = killedByAdventurers.includes(adventurer.id) ? adventurer.level * 10 : adventurer.level
                    return sum + healthGiven
                  }, 0)}
                </Typography>
                <FavoriteIcon fontSize='small' htmlColor={gameColors.red} />
              </Box>}
            </Box>
          }
        </Box>
      </Box>
    </Box>
  }

  return <Box sx={styles.container}>
    {/* Attack Button + Potions */}
    <Box sx={styles.buttonGroup}>
      {/* Section 1: Attack Button */}
      {isSavage
        ? <Box sx={[styles.attackButton, styles.savageButton]}>
          <Typography color={gameColors.yellow}>
            {isBrowser ? "YOU'RE THE SAVÁGE" : "SAVÁGE"}
          </Typography>
        </Box>
        : <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={[styles.attackButton, enableAttack && styles.attackButtonEnabled]}
            onClick={handleAttack}>
            <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 1 }}>
              {attackInProgress
                ? <Box display={'flex'} alignItems={'baseline'}>
                  <Typography variant="h5" sx={styles.buttonText}>Attacking</Typography>
                  <div className='dotLoader green' />
                </Box>
                : <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                  <Typography sx={[styles.buttonText, !enableAttack && styles.disabledText]} variant="h5">
                    Attack
                  </Typography>
                </Box>
              }

              {isappliedPotions && isBrowser && <Box sx={{ display: 'flex', gap: 0.5 }}>
                {appliedPotions.revive > 0 && <Box display={'flex'} alignItems={'center'}>
                  <Typography sx={styles.potionCount}>{appliedPotions.revive}</Typography>
                  <img src={revivePotionIcon} alt='' height={'14px'} />
                </Box>}
                {appliedPotions.attack > 0 && <Box display={'flex'} alignItems={'center'}>
                  <Typography sx={styles.potionCount}>{appliedPotions.attack}</Typography>
                  <img src={attackPotionIcon} alt='' height={'14px'} />
                </Box>}
                {appliedPotions.extraLife > 0 && <Box display={'flex'} alignItems={'center'}>
                  <Typography sx={styles.potionCount}>{appliedPotions.extraLife}</Typography>
                  <img src={heart} alt='' height={'12px'} />
                </Box>}
              </Box>
              }
            </Box>
          </Box>
          <Tooltip leaveDelay={300} placement='top' title={<Box sx={styles.tooltip}>
            <Typography sx={styles.tooltipTitle}>Safe Attack</Typography>
            <Typography sx={[styles.tooltipText, { lineHeight: 1.2 }]}>
              Attack only if Summit beast has not changed
            </Typography>
            <Typography sx={styles.tooltipSubtext}>
              Toggle off to attack no matter what
            </Typography>
          </Box>}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography
                sx={{
                  fontSize: '12px',
                  color: gameColors.brightGreen,
                  fontWeight: 'bold',
                  lineHeight: 1,
                  textAlign: 'center'
                }}
              >Safe
              </Typography>
              <Checkbox
                checked={safeAttack}
                onChange={(e) => setSafeAttack(e.target.checked)}
                size="large"
                sx={{
                  color: gameColors.lightGreen,
                  padding: '0px',
                  '&.Mui-checked': {
                    color: gameColors.brightGreen,
                  },
                  '& .MuiSvgIcon-root': {
                    fontSize: '26px',
                  }
                }}
              />
            </Box>
          </Tooltip>
        </Box>}

      {/* Divider 1 */}
      <Box sx={styles.divider} />

      {/* Section 2: Potion Buttons */}
      <Box sx={styles.potionSubGroup}>
        <Tooltip leaveDelay={300} placement='top' title={<Box sx={styles.tooltip}>
          <Typography sx={styles.tooltipTitle}>Revive Potions</Typography>
          <Typography sx={styles.tooltipText}>
            {revivalPotionsRequired > 0
              ? `${revivalPotionsRequired} required for dead beasts`
              : 'Attack with your dead beasts'}
          </Typography>
          {revivalPotionsRequired > tokenBalances["REVIVE"] && (
            <Typography sx={styles.tooltipWarning}>
              ⚠️ Not enough potions!
            </Typography>
          )}
        </Box>}>
          <Box sx={[
            styles.potionButton,
            revivalPotionsRequired > 0 && styles.potionButtonActive,
            revivalPotionsRequired > tokenBalances["REVIVE"] && styles.potionButtonInsufficient
          ]}>
            <img src={revivePotionIcon} alt='' height={'24px'} />
            {revivalPotionsRequired > 0 && (
              <Box sx={styles.requiredIndicator}>
                <Typography sx={styles.requiredText}>
                  {revivalPotionsRequired}
                </Typography>
              </Box>
            )}
            <Box sx={styles.count}>
              <Typography sx={styles.countText}>
                {tokenBalances["REVIVE"]}
              </Typography>
            </Box>
          </Box>
        </Tooltip>

        <Tooltip leaveDelay={300} placement='top' title={<Box sx={styles.tooltip}>
          <Typography sx={styles.tooltipTitle}>Attack Potion</Typography>
          <Typography sx={styles.tooltipText}>
            {appliedPotions.attack > 0
              ? `${appliedPotions.attack * 10}% damage boost applied`
              : 'Add 10% damage boost per potion'}
          </Typography>
          <Typography sx={styles.tooltipSubtext}>
            Applied on next attack
          </Typography>
        </Box>}>
          <Box sx={[
            styles.potionButton,
            enableAttackPotion && styles.potionButtonActive,
            appliedPotions.attack > 0 && styles.potionButtonApplied
          ]}
            onClick={(event) => {
              if (!enableAttackPotion) return;
              handleClick(event, 'attack');
            }}>
            <img src={attackPotionIcon} alt='' height={'24px'} />
            {appliedPotions.attack > 0 && (
              <Box sx={styles.appliedIndicator}>
                <Typography sx={styles.appliedText}>
                  {appliedPotions.attack}
                </Typography>
              </Box>
            )}
            <Box sx={styles.count}>
              <Typography sx={styles.countText}>
                {tokenBalances["ATTACK"]}
              </Typography>
            </Box>
          </Box>
        </Tooltip>

        <Tooltip leaveDelay={300} placement='top' title={<Box sx={styles.tooltip}>
          <Typography sx={styles.tooltipTitle}>Extra Life</Typography>
          <Typography sx={styles.tooltipText}>
            {appliedPotions.extraLife > 0
              ? `${appliedPotions.extraLife} extra lives applied`
              : 'Grant additional lives'}
          </Typography>
          <Typography sx={styles.tooltipSubtext}>
            Applied after you take the Summit
          </Typography>
        </Box>}>
          <Box sx={[
            styles.potionButton,
            enableExtraLifePotion && styles.potionButtonActive,
            appliedPotions.extraLife > 0 && styles.potionButtonApplied
          ]}
            onClick={(event) => {
              if (!enableExtraLifePotion) return;
              handleClick(event, 'extraLife');
            }}>
            <img src={lifePotionIcon} alt='' height={'24px'} />
            {appliedPotions.extraLife > 0 && (
              <Box sx={styles.appliedIndicator}>
                <Typography sx={styles.appliedText}>
                  {appliedPotions.extraLife}
                </Typography>
              </Box>
            )}
            <Box sx={styles.count}>
              <Typography sx={styles.countText}>
                {tokenBalances["EXTRA LIFE"]}
              </Typography>
            </Box>
          </Box>
        </Tooltip>
      </Box>

      {/* Divider 2 */}
      <Box sx={styles.divider} />

      {/* Section 3: Cauldron */}
      <Tooltip leaveDelay={300} placement='top' title={<Box sx={styles.tooltip}>
        <Typography sx={styles.tooltipTitle}>Feeding Ground</Typography>
        <Typography sx={styles.tooltipText}>Feed dead adventurers</Typography>
      </Box>}>
        <Box sx={[styles.potionButton, enableFeedingGround && styles.potionButtonActive]}
          onClick={() => {
            if (!enableFeedingGround) return;
            setShowFeedingGround(true);
          }}>
          <img src={cauldronIcon} alt='' height={'24px'} />
          <Box sx={styles.count}>
            <Typography sx={styles.countText}>
              {adventurerCollection.length}
            </Typography>
          </Box>
        </Box>
      </Tooltip>
    </Box>

    {potion && <Menu
      sx={{
        zIndex: 10000,
        '& .MuiPaper-root': {
          backgroundColor: '#1a1f1a',
          backdropFilter: 'blur(10px)',
          border: `1px solid ${gameColors.accentGreen}20`,
          borderRadius: '8px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
          overflow: 'visible',
        }
      }}
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={handleClose}
      anchorOrigin={{
        vertical: 'top',
        horizontal: 'center',
      }}
      transformOrigin={{
        vertical: 'bottom',
        horizontal: 'center',
      }}
    >
      <Box width={'160px'} display={'flex'} alignItems={'center'} flexDirection={'column'} p={1}>
        <Typography
          variant='body1'
          sx={{
            color: gameColors.gameYellow,
            fontWeight: 500,
            mb: 2,
            fontSize: '14px',
          }}
        >
          {potion === 'attack' ? 'Attack Boost' : 'Extra Life'}
        </Typography>

        <Box
          display={'flex'}
          alignItems={'center'}
          gap={1}
          mb={1}
        >
          <IconButton
            size="small"
            sx={{
              color: gameColors.gameYellow,
              backgroundColor: 'transparent',
              border: `1px solid ${gameColors.gameYellow}30`,
              borderRadius: '4px',
              padding: '4px',
              transition: 'all 0.15s ease',
              '&:hover': {
                backgroundColor: `${gameColors.gameYellow}10`,
                borderColor: gameColors.gameYellow,
              }
            }}
            onClick={() => setAppliedPotions({
              ...appliedPotions,
              [potion]: Math.max(0, appliedPotions[potion] - 1)
            })}>
            <RemoveIcon fontSize="small" />
          </IconButton>

          <Typography
            variant='h5'
            sx={{
              color: gameColors.gameYellow,
              fontWeight: 500,
              minWidth: '40px',
              textAlign: 'center',
              mx: 1,
            }}
          >
            {potion === 'attack' ? appliedPotions.attack : appliedPotions.extraLife}
          </Typography>

          <IconButton
            size="small"
            sx={{
              color: gameColors.gameYellow,
              backgroundColor: 'transparent',
              border: `1px solid ${gameColors.gameYellow}30`,
              borderRadius: '4px',
              padding: '4px',
              transition: 'all 0.15s ease',
              '&:hover': {
                backgroundColor: `${gameColors.gameYellow}10`,
                borderColor: gameColors.gameYellow,
              }
            }}
            onClick={() => setAppliedPotions({
              ...appliedPotions,
              [potion]: Math.min(appliedPotions[potion] + 1, Math.min(potion === 'attack' ? tokenBalances["ATTACK"] : tokenBalances["EXTRA LIFE"], 255))
            })}>
            <AddIcon fontSize="small" />
          </IconButton>
        </Box>

        <Box sx={{ width: '100%', px: 0.5 }}>
          <Slider
            value={potion === 'attack' ? appliedPotions.attack : appliedPotions.extraLife}
            step={1}
            min={0}
            max={Math.min(potion === 'attack' ? tokenBalances["ATTACK"] : tokenBalances["EXTRA LIFE"], 255)}
            onChange={(e, value) => setAppliedPotions({
              ...appliedPotions,
              [potion]: value
            })}
            size='small'
            sx={{
              color: gameColors.gameYellow,
              width: '100%',
              height: 4,
              '& .MuiSlider-thumb': {
                backgroundColor: gameColors.gameYellow,
                width: 14,
                height: 14,
                border: 'none',
                boxShadow: 'none',
                transition: 'opacity 0.15s ease',
                '&:hover': {
                  boxShadow: 'none',
                },
              },
              '& .MuiSlider-track': {
                backgroundColor: gameColors.gameYellow,
                height: 4,
                border: 'none',
              },
              '& .MuiSlider-rail': {
                backgroundColor: `${gameColors.gameYellow}20`,
                height: 4,
              },
              '& .MuiSlider-valueLabel': {
                backgroundColor: '#2a2f2a',
                border: `1px solid ${gameColors.gameYellow}40`,
                borderRadius: '4px',
                fontSize: '12px',
                '& *': {
                  color: gameColors.gameYellow,
                }
              }
            }}
            valueLabelDisplay="auto"
          />
        </Box>

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            width: '100%',
            px: 0.5,
          }}
        >
          <Typography sx={{ fontSize: '11px', color: gameColors.gameYellow, opacity: 0.6 }}>
            0
          </Typography>
          <Typography sx={{ fontSize: '11px', color: gameColors.gameYellow, opacity: 0.6 }}>
            {Math.min(potion === 'attack' ? tokenBalances["ATTACK"] : tokenBalances["EXTRA LIFE"], 255)}
          </Typography>
        </Box>
      </Box>
    </Menu>}
  </Box>
}

export default ActionBar;

const styles = {
  container: {
    height: '60px',
    width: '100%',
    maxWidth: '100dvw',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    boxSizing: 'border-box',
    zIndex: 100,
    overflowX: 'auto',
    overflowY: 'hidden',
  },
  buttonGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 1.5,
    background: `
      linear-gradient(135deg, 
        ${gameColors.darkGreen}90 0%, 
        ${gameColors.mediumGreen}80 50%, 
        ${gameColors.darkGreen}90 100%
      )
    `,
    backdropFilter: 'blur(12px) saturate(1.2)',
    border: `1px solid ${gameColors.accentGreen}40`,
    padding: '8px',
    marginBottom: '-1px',
    boxShadow: `
      inset 0 1px 0 ${gameColors.accentGreen}30,
      0 4px 16px rgba(0, 0, 0, 0.4),
      0 0 0 1px ${gameColors.darkGreen}60
    `,
  },
  potionSubGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 1,
  },
  attackButton: {
    padding: '10px',
    borderRadius: '8px',
    background: `${gameColors.darkGreen}20`,
    border: `2px solid ${gameColors.lightGreen}40`,
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    minWidth: isBrowser ? '200px' : '120px',
    textAlign: 'center',
    opacity: 0.7,
    '&:hover': {
      opacity: 0.9,
      boxShadow: `0 2px 6px rgba(0, 0, 0, 0.2)`,
    }
  },
  attackButtonEnabled: {
    opacity: 1,
    background: `linear-gradient(135deg, ${gameColors.mediumGreen}30 0%, ${gameColors.darkGreen}50 100%)`,
    border: `2px solid ${gameColors.brightGreen}`,
    boxShadow: `
      0 0 16px ${gameColors.brightGreen}40,
      0 4px 8px rgba(0, 0, 0, 0.3),
      inset 0 1px 0 ${gameColors.accentGreen}30
    `,
    '&:hover': {
      opacity: 1,
      background: `linear-gradient(135deg, ${gameColors.lightGreen}40 0%, ${gameColors.mediumGreen}60 100%)`,
      boxShadow: `
        0 0 20px ${gameColors.brightGreen}60,
        0 6px 12px rgba(0, 0, 0, 0.4),
        inset 0 1px 0 ${gameColors.brightGreen}40
      `,
    }
  },
  savageButton: {
    background: `linear-gradient(135deg, ${gameColors.yellow}20 0%, ${gameColors.orange}20 100%)`,
    border: `1px solid ${gameColors.yellow}`,
    boxShadow: `0 0 12px ${gameColors.yellow}40`,
  },
  potionButton: {
    position: 'relative',
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    background: `${gameColors.darkGreen}40`,
    border: `2px solid ${gameColors.accentGreen}60`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    opacity: 0.6,
    '&:hover': {
      border: `2px solid ${gameColors.brightGreen}80`,
      boxShadow: `0 4px 8px rgba(0, 0, 0, 0.3)`,
      opacity: 0.8,
    }
  },
  potionButtonActive: {
    opacity: 1,
    background: `linear-gradient(135deg, ${gameColors.mediumGreen}60 0%, ${gameColors.darkGreen}80 100%)`,
    border: `2px solid ${gameColors.brightGreen}`,
    boxShadow: `
      0 0 12px ${gameColors.brightGreen}50,
      0 4px 8px rgba(0, 0, 0, 0.4),
      inset 0 1px 0 ${gameColors.accentGreen}40
    `,
    '&:hover': {
      boxShadow: `
        0 0 16px ${gameColors.brightGreen}70,
        0 6px 12px rgba(0, 0, 0, 0.5),
        inset 0 1px 0 ${gameColors.brightGreen}60
      `,
      background: `linear-gradient(135deg, ${gameColors.lightGreen}60 0%, ${gameColors.mediumGreen}80 100%)`,
    }
  },
  count: {
    position: 'absolute',
    bottom: '-6px',
    right: '-6px',
    borderRadius: '12px',
    background: `linear-gradient(135deg, ${gameColors.brightGreen} 0%, ${gameColors.accentGreen} 100%)`,
    border: `2px solid ${gameColors.darkGreen}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '20px',
    height: '20px',
    boxShadow: `
      0 2px 4px rgba(0, 0, 0, 0.6),
      0 0 8px ${gameColors.brightGreen}40,
      inset 0 1px 0 rgba(255, 255, 255, 0.2)
    `,
  },
  countText: {
    fontSize: '10px',
    fontWeight: 'bold',
    color: gameColors.darkGreen,
    lineHeight: 1,
    textShadow: `0 1px 1px rgba(255, 255, 255, 0.3)`,
  },
  buttonText: {
    color: '#58b000',
    fontWeight: 'bold',
    textShadow: `0 1px 2px ${gameColors.darkGreen}`,
  },
  disabledText: {
    color: `${gameColors.lightGreen}`,
  },
  statText: {
    color: gameColors.brightGreen,
    fontSize: '14px',
    fontWeight: 'bold',
  },
  potionCount: {
    color: '#ffedbb',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  tooltip: {
    background: `linear-gradient(135deg, ${gameColors.mediumGreen} 0%, ${gameColors.darkGreen} 100%)`,
    border: `2px solid ${gameColors.accentGreen}`,
    borderRadius: '6px',
    padding: '8px 12px',
    textAlign: 'center',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
  },
  tooltipTitle: {
    color: '#ffedbb',
    fontWeight: 'bold',
    fontSize: '14px',
    mb: 0.3,
  },
  tooltipText: {
    color: gameColors.accentGreen,
    fontSize: '12px',
    fontWeight: 'bold',
  },
  tooltipSubtext: {
    color: '#999',
    fontSize: '11px',
    fontStyle: 'italic',
    lineHeight: 1.1,
    mt: 0.5,
  },
  divider: {
    width: '1px',
    height: '40px',
    background: `linear-gradient(to bottom, transparent 0%, ${gameColors.accentGreen}60 25%, ${gameColors.accentGreen}60 75%, transparent 100%)`,
    opacity: 0.6,
  },
  potionButtonInsufficient: {
    border: `2px solid ${gameColors.red}`,
    background: `linear-gradient(135deg, ${gameColors.red}20 0%, ${gameColors.darkGreen}80 100%)`,
    '&:hover': {
      border: `2px solid ${gameColors.red}`,
      boxShadow: `0 0 12px ${gameColors.red}40`,
    }
  },
  potionButtonApplied: {
    border: `2px solid ${gameColors.yellow}`,
    boxShadow: `
      0 0 16px ${gameColors.yellow}50,
      0 4px 8px rgba(0, 0, 0, 0.4),
      inset 0 1px 0 ${gameColors.yellow}40
    `,
  },
  requiredIndicator: {
    position: 'absolute',
    top: '-8px',
    right: '-8px',
    borderRadius: '50%',
    background: gameColors.red,
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: `2px solid ${gameColors.darkGreen}`,
    boxShadow: `0 2px 4px rgba(0, 0, 0, 0.6)`,
  },
  requiredText: {
    fontSize: '11px',
    fontWeight: 'bold',
    color: '#ffedbb',
    lineHeight: 1,
  },
  appliedIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    borderRadius: '50%',
    background: `${gameColors.yellow}90`,
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `0 0 8px ${gameColors.yellow}60`,
  },
  appliedText: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: gameColors.darkGreen,
    lineHeight: 1,
  },
  insufficientWarning: {
    fontSize: '9px',
    color: gameColors.red,
    fontWeight: 'bold',
    letterSpacing: '0.5px',
    textShadow: `0 1px 1px ${gameColors.darkGreen}`,
  },
  tooltipWarning: {
    color: gameColors.red,
    fontSize: '11px',
    fontWeight: 'bold',
    mt: 0.5,
  },
}