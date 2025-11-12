import { useController } from '@/contexts/controller';
import { useGameDirector } from '@/contexts/GameDirector';
import { useGameStore } from '@/stores/gameStore';
import { Beast } from '@/types/game';
import AddIcon from '@mui/icons-material/Add';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import RemoveIcon from '@mui/icons-material/Remove';
import { Box, Button, IconButton, Menu, MenuItem, Slider, Tooltip, Typography } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { isBrowser } from 'react-device-detect';
import attackPotionIcon from '../assets/images/attack-potion.png';
import heart from '../assets/images/heart.png';
import lifePotionIcon from '../assets/images/life-potion.png';
import poisonPotionIcon from '../assets/images/poison-potion.png';
import revivePotionIcon from '../assets/images/revive-potion.png';
import { gameColors } from '../utils/themes';
import BeastUpgradeModal from './dialogs/BeastUpgradeModal';

function ActionBar() {
  const { executeGameAction } = useGameDirector();
  const { tokenBalances } = useController();

  const { selectedBeasts, summit,
    attackInProgress, appliedPotions, setAppliedPotions,
    applyingPotions, setApplyingPotions,
    collection, setSelectedBeasts, attackMode, setAttackMode,
    waitingForBeastUpgradeSelection, setWaitingForBeastUpgradeSelection } = useGameStore();

  const [anchorEl, setAnchorEl] = useState(null);
  const [potion, setPotion] = useState(null)
  const [attackDropdownAnchor, setAttackDropdownAnchor] = useState<null | HTMLElement>(null);
  const [beastUpgradeModal, setBeastUpgradeModal] = useState(false);
  const [beastToUpgrade, setBeastToUpgrade] = useState<Beast | null>(null);

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

    executeGameAction({
      type: 'attack',
      beastIds: selectedBeasts.map(beast => beast.token_id),
      appliedPotions: appliedPotions,
      safeAttack: attackMode === 'safe',
      vrf: (selectedBeasts.find(beast => beast.stats.luck) || summit?.beast?.stats.luck) ? true : false
    });
  }


  const handleAttackUntilCapture = () => {
    if (!enableAttack) return;

    executeGameAction({
      type: 'attack_until_capture',
      beastIds: collection.filter((beast: Beast) => beast.current_health > 0)
        .sort((a: Beast, b: Beast) => b.combat?.score - a.combat?.score).map((beast: Beast) => beast.token_id),
    });
  }

  const handleAddExtraLife = () => {
    if (applyingPotions || appliedPotions.extraLife === 0) return;

    setApplyingPotions(true);

    executeGameAction({
      type: 'add_extra_life',
      beastId: selectedBeasts[0].token_id,
    });
  }

  const handleApplyPoison = () => {
    if (!summit?.beast || applyingPotions || appliedPotions.poison === 0) return;

    setApplyingPotions(true);

    executeGameAction({
      type: 'apply_poison',
      beastId: summit.beast.token_id,
      count: appliedPotions.poison,
    });
  }

  const handleUpgradeBeastClick = () => {
    if (selectedBeasts.length > 0 && selectedBeasts[0]) {
      // If a beast is selected, open modal with that beast
      setBeastToUpgrade(selectedBeasts[0]);
      setBeastUpgradeModal(true);
    } else {
      // Toggle upgrade selection mode
      setWaitingForBeastUpgradeSelection(!waitingForBeastUpgradeSelection);
    }
  }

  const isSavage = Boolean(collection.find(beast => beast.token_id === summit?.beast?.token_id))
  const isSavageSelected = Boolean(selectedBeasts.find((beast: any) => beast.token_id === summit?.beast?.token_id))
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

  useEffect(() => {
    if (attackMode === 'capture') {
      setSelectedBeasts([]);
      setAppliedPotions({ revive: 0, attack: 0, extraLife: 0, poison: 0 });
    }
  }, [attackMode]);

  // Watch for beast selection when waiting for upgrade selection
  useEffect(() => {
    if (waitingForBeastUpgradeSelection && selectedBeasts.length > 0 && selectedBeasts[0]) {
      // A beast was selected while waiting, open the modal
      setBeastToUpgrade(selectedBeasts[0]);
      setBeastUpgradeModal(true);
      setWaitingForBeastUpgradeSelection(false);
    }
  }, [selectedBeasts, waitingForBeastUpgradeSelection]);

  const hasEnoughRevivePotions = tokenBalances["REVIVE"] >= revivalPotionsRequired;
  const enableAttack = (attackMode === 'capture' && !attackInProgress) || ((!isSavage || attackMode !== 'safe') && summit?.beast && !attackInProgress && selectedBeasts.length > 0 && hasEnoughRevivePotions);

  const enableExtraLifePotion = tokenBalances["EXTRA LIFE"] > 0;
  const enableAttackPotion = tokenBalances["ATTACK"] > 0;
  const enablePoisonPotion = tokenBalances["POISON"] > 0;
  const enableApplyPoison = summit?.beast && !applyingPotions && appliedPotions.poison > 0;
  const isappliedPotions = appliedPotions.revive + appliedPotions.attack + appliedPotions.extraLife + appliedPotions.poison > 0

  if (collection.length === 0) {
    return <Box sx={styles.container}>
    </Box>
  }

  return <Box sx={styles.container}>
    {/* Attack Button + Potions */}
    <Box sx={styles.buttonGroup}>
      {/* Section 1: Attack Button */}
      <Box sx={{ minWidth: isBrowser ? '265px' : '120px' }}>
        {appliedPotions.poison > 0
          ? <Box sx={[styles.attackButton, enableApplyPoison && styles.attackButtonEnabled]}
            onClick={handleApplyPoison}>
            <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 1 }}>
              {applyingPotions
                ? <Box display={'flex'} alignItems={'baseline'}>
                  <Typography variant="h5" sx={styles.buttonText}>Applying</Typography>
                  <div className='dotLoader green' />
                </Box>
                : <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                  <Typography sx={[styles.buttonText, !enableApplyPoison && styles.disabledText]} variant="h5">
                    Apply Poison
                  </Typography>
                </Box>
              }

              {isBrowser && <Box sx={{ display: 'flex', gap: 0.5 }}>
                {appliedPotions.poison > 0 && <Box display={'flex'} alignItems={'center'} gap={'2px'}>
                  <Typography sx={styles.potionCount}>{appliedPotions.poison}</Typography>
                  <img src={poisonPotionIcon} alt='' height={'14px'} />
                </Box>}
              </Box>
              }
            </Box>
          </Box>
          : isSavageSelected
            ? <Box sx={[styles.attackButton, appliedPotions.extraLife > 0 && styles.attackButtonEnabled]}
              onClick={handleAddExtraLife}>
              <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 1 }}>
                {applyingPotions
                  ? <Box display={'flex'} alignItems={'baseline'}>
                    <Typography variant="h5" sx={styles.buttonText}>Applying</Typography>
                    <div className='dotLoader green' />
                  </Box>
                  : <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                    <Typography sx={[styles.buttonText, !(appliedPotions.extraLife > 0) && styles.disabledText]} variant="h5">
                      Add Extra Life
                    </Typography>
                  </Box>
                }

                {isappliedPotions && isBrowser && <Box sx={{ display: 'flex', gap: 0.5 }}>
                  {appliedPotions.extraLife > 0 && <Box display={'flex'} alignItems={'center'} gap={'2px'}>
                    <Typography sx={styles.potionCount}>{appliedPotions.extraLife}</Typography>
                    <img src={heart} alt='' height={'12px'} />
                  </Box>}
                </Box>
                }
              </Box>
            </Box>

            : <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box sx={styles.attackButtonGroup}>
                <Box
                  sx={[
                    styles.attackButton,
                    enableAttack && styles.attackButtonEnabled,
                    styles.attackButtonMain
                  ]}
                  onClick={() => {
                    if (attackMode === 'capture') {
                      handleAttackUntilCapture();
                    } else {
                      handleAttack();
                    }
                  }}>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 1 }}>
                    {attackInProgress
                      ? <Box display={'flex'} alignItems={'baseline'}>
                        <Typography variant="h5" sx={styles.buttonText}>Attacking</Typography>
                        <div className='dotLoader green' />
                      </Box>
                      : <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                        <Typography sx={[styles.buttonText, !enableAttack && styles.disabledText]} variant="h5">
                          {attackMode === 'safe' ? 'Safe Attack' : attackMode === 'unsafe' ? 'Unsafe Attack' : 'Attack until Capture'}
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
                      {appliedPotions.poison > 0 && <Box display={'flex'} alignItems={'center'}>
                        <Typography sx={styles.potionCount}>{appliedPotions.poison}</Typography>
                        <img src={poisonPotionIcon} alt='' height={'14px'} />
                      </Box>}
                    </Box>
                    }
                  </Box>
                </Box>
                <Box
                  sx={[
                    styles.attackDropdownButton,
                  ]}
                  onClick={(event) => setAttackDropdownAnchor(event.currentTarget)}
                >
                  <ArrowDropDownIcon sx={{ fontSize: '21px', color: gameColors.yellow }} />
                </Box>
              </Box>
            </Box>
        }
      </Box>

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

        <Tooltip leaveDelay={300} placement='top' title={<Box sx={styles.tooltip}>
          <Typography sx={styles.tooltipTitle}>Poison</Typography>
          <Typography sx={styles.tooltipText}>
            {appliedPotions.poison > 0
              ? `${appliedPotions.poison} poison potions applied`
              : 'Poison the summit'}
          </Typography>
          <Typography sx={styles.tooltipSubtext}>
            Deals 1 damage per second
          </Typography>
        </Box>}>
          <Box sx={[
            styles.potionButton,
            enablePoisonPotion && styles.potionButtonActive,
            appliedPotions.poison > 0 && styles.potionButtonApplied
          ]}
            onClick={(event) => {
              if (!enablePoisonPotion) return;
              handleClick(event, 'poison');
            }}>
            <img src={poisonPotionIcon} alt='' height={'24px'} />
            {appliedPotions.poison > 0 && (
              <Box sx={styles.appliedIndicator}>
                <Typography sx={styles.appliedText}>
                  {appliedPotions.poison}
                </Typography>
              </Box>
            )}
            <Box sx={styles.count}>
              <Typography sx={styles.countText}>
                {tokenBalances["POISON"]}
              </Typography>
            </Box>
          </Box>
        </Tooltip>
      </Box>

      {/* Divider 1 */}
      <Box sx={styles.divider} />

      {/* Section 3: Beast Upgrade Button */}
      <Box sx={styles.beastUpgradeSubGroup}>
        <Button sx={[
          styles.attackButton,
          styles.beastUpgradeButton,
          waitingForBeastUpgradeSelection && styles.beastUpgradeButtonActive
        ]} onClick={handleUpgradeBeastClick}>
          <Typography sx={styles.buttonText}>
            {waitingForBeastUpgradeSelection ? 'Select Beast' : 'Upgrade Beast'}
          </Typography>
        </Button>
      </Box>

      {/* Beast Upgrade Modal */}
      {beastUpgradeModal && beastToUpgrade && (
        <BeastUpgradeModal
          open={beastUpgradeModal}
          beast={beastToUpgrade}
          close={() => {
            setBeastUpgradeModal(false);
            setBeastToUpgrade(null);
          }}
        />
      )}

    </Box>

    {/* Attack Mode Dropdown Menu */}
    <Menu
      sx={{
        zIndex: 10000,
        '& .MuiPaper-root': {
          backgroundColor: '#1a1f1a',
          backdropFilter: 'blur(10px)',
          border: `1px solid ${gameColors.brightGreen}`,
          borderRadius: '8px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
          overflow: 'visible',
        }
      }}
      anchorEl={attackDropdownAnchor}
      open={Boolean(attackDropdownAnchor)}
      onClose={() => setAttackDropdownAnchor(null)}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
    >
      <MenuItem
        onClick={() => {
          setAttackMode('safe');
          setAttackDropdownAnchor(null);
        }}
        sx={{
          ...styles.menuItem,
          backgroundColor: attackMode === 'safe' ? `${gameColors.brightGreen}20` : 'transparent',
        }}
      >
        <Box>
          <Typography sx={styles.menuItemTitle}>Safe Attack</Typography>
          <Typography sx={styles.menuItemDescription}>
            Attack only if Summit beast hasn't changed
          </Typography>
        </Box>
      </MenuItem>
      <MenuItem
        onClick={() => {
          setAttackMode('unsafe');
          setAttackDropdownAnchor(null);
        }}
        sx={{
          ...styles.menuItem,
          backgroundColor: attackMode === 'unsafe' ? `${gameColors.brightGreen}20` : 'transparent',
        }}
      >
        <Box>
          <Typography sx={styles.menuItemTitle}>Unsafe Attack</Typography>
          <Typography sx={styles.menuItemDescription}>
            Attack no matter what
          </Typography>
        </Box>
      </MenuItem>
      <MenuItem
        onClick={() => {
          setAttackMode('capture');
          setAttackDropdownAnchor(null);
        }}
        sx={{
          ...styles.menuItem,
          backgroundColor: attackMode === 'capture' ? `${gameColors.brightGreen}20` : 'transparent',
        }}
      >
        <Box>
          <Typography sx={styles.menuItemTitle}>Attack until Capture</Typography>
          <Typography sx={styles.menuItemDescription}>
            Attack with all your beasts until you capture <br /> the Summit or all your beasts are dead
          </Typography>
        </Box>
      </MenuItem>
    </Menu>

    {potion && <Menu
      sx={{
        zIndex: 10000,
        '& .MuiPaper-root': {
          backgroundColor: '#1a1f1a',
          backdropFilter: 'blur(10px)',
          border: `1px solid ${gameColors.gameYellow}`,
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
          {potion === 'attack' ? 'Attack Boost' : potion === 'extraLife' ? 'Extra Life' : 'Poison Potion'}
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
            {potion === 'attack' ? appliedPotions.attack : potion === 'extraLife' ? appliedPotions.extraLife : appliedPotions.poison}
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
              [potion]: Math.min(appliedPotions[potion] + 1, Math.min(potion === 'attack' ? tokenBalances["ATTACK"] : potion === 'extraLife' ? tokenBalances["EXTRA LIFE"] : tokenBalances["POISON"], 255))
            })}>
            <AddIcon fontSize="small" />
          </IconButton>
        </Box>

        <Box sx={{ width: '100%', px: 0.5 }}>
          <Slider
            value={potion === 'attack' ? appliedPotions.attack : potion === 'extraLife' ? appliedPotions.extraLife : appliedPotions.poison}
            step={1}
            min={0}
            max={Math.min(potion === 'attack' ? tokenBalances["ATTACK"] : potion === 'extraLife' ? tokenBalances["EXTRA LIFE"] : tokenBalances["POISON"], 255)}
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
            {Math.min(potion === 'attack' ? tokenBalances["ATTACK"] : potion === 'extraLife' ? tokenBalances["EXTRA LIFE"] : tokenBalances["POISON"], 255)}
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
  beastUpgradeSubGroup: {
    display: 'flex',
    alignItems: 'center',
    minWidth: isBrowser ? '140px' : '100px',
  },
  beastUpgradeButton: {
    opacity: 1,
    background: `linear-gradient(135deg, ${gameColors.mediumGreen}30 0%, ${gameColors.darkGreen}50 100%)`,
    border: `2px solid ${gameColors.brightGreen}`,
    minWidth: isBrowser ? '160px' : '100px',
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
  beastUpgradeButtonActive: {
    background: `linear-gradient(135deg, ${gameColors.yellow}20 0%, ${gameColors.gameYellow}30 100%)`,
    border: `2px solid ${gameColors.yellow}`,
    boxShadow: `
      0 0 20px ${gameColors.yellow}50,
      0 4px 12px rgba(0, 0, 0, 0.4),
      inset 0 1px 0 ${gameColors.yellow}40
    `,
    '&:hover': {
      background: `linear-gradient(135deg, ${gameColors.yellow}30 0%, ${gameColors.gameYellow}40 100%)`,
      boxShadow: `
        0 0 25px ${gameColors.yellow}60,
        0 6px 16px rgba(0, 0, 0, 0.5),
        inset 0 1px 0 ${gameColors.yellow}50
      `,
    }
  },
  attackButtonGroup: {
    display: 'flex',
    alignItems: 'center',
    borderRadius: '8px',
    overflow: 'hidden',
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
  attackButtonMain: {
    borderTopRightRadius: '0px',
    borderBottomRightRadius: '0px',
    borderRight: 'none',
  },
  attackDropdownButton: {
    padding: '10px 8px',
    borderRadius: '8px',
    borderTopLeftRadius: '0px',
    borderBottomLeftRadius: '0px',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 1,
    background: `linear-gradient(135deg, ${gameColors.mediumGreen}30 0%, ${gameColors.darkGreen}50 100%)`,
    border: `2px solid ${gameColors.brightGreen}`,
    '&:hover': {
      background: `linear-gradient(135deg, ${gameColors.lightGreen}40 0%, ${gameColors.mediumGreen}60 100%)`,
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
  menuItem: {
    padding: '8px',
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: `${gameColors.brightGreen}30`,
    }
  },
  menuItemTitle: {
    color: gameColors.brightGreen,
    fontWeight: 'bold',
    fontSize: '14px',
    mb: '2px'
  },
  menuItemDescription: {
    color: gameColors.accentGreen,
    fontSize: '12px',
    lineHeight: 1.3,
  },
}