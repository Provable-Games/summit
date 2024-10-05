import { Box, Menu, Popover, Typography } from '@mui/material';
import { useContext, useState } from 'react';
import attackPotionIcon from '../assets/images/attack-potion.png';
import lifePotionIcon from '../assets/images/life-potion.png';
import potionsIcon from '../assets/images/potions.png';
import revivePotionIcon from '../assets/images/revive-potion.png';
import { GameContext } from '../contexts/gameContext';
import { RoundOrangeButton } from '../helpers/styles';

export default function Potions() {
  const game = useContext(GameContext);
  const { selectedBeasts, selectedItem } = game.getState;

  const [potionMenu, openPotionMenu] = useState(null);

  const handleClick = () => {
    if (potionMenu) {
      openPotionMenu(null)
      game.setState.selectedItem(null)
    } else {
      openPotionMenu(true);
    }
  };

  const selectItem = (item) => {
    if (selectedItem === item) {
      game.setState.selectedItem(null)
    } else {
      game.setState.selectedItem(item)
    }
  }

  return (
    <Box sx={{ position: 'relative' }}>
      <RoundOrangeButton onClick={handleClick} sx={{ position: 'relative', boxShadow: potionMenu ? '0 0 10px white' : '0px 2px 4px rgba(0, 0, 0, 0.8), 0px 1px 3px rgba(0, 0, 0, 0.08)' }}>
        <img src={potionsIcon} alt='' height={'28px'} />

        <Box sx={styles.count}>
          <Typography pl={'3px'} pr={'2px'} py={'1px'} sx={{ fontSize: '13px', lineHeight: '12px' }}>
            1
          </Typography>
        </Box>
      </RoundOrangeButton>


      {potionMenu && <Box sx={styles.potionMenu}>

        <Box sx={[styles.potionItem, selectedItem === 'revivePotion' && styles.selectedItem]} onClick={() => selectItem('revivePotion')}>
          <Typography>Revive</Typography>
          <img src={revivePotionIcon} alt='' height={'32px'} />
          <Typography sx={{ fontSize: '12px', lineHeight: '4px' }}>0</Typography>
        </Box>

        <Box sx={[styles.potionItem, selectedItem === 'attackPotion' && styles.selectedItem]} onClick={() => selectItem('attackPotion')}>
          <Typography>Attack</Typography>
          <img src={attackPotionIcon} alt='' height={'32px'} />
          <Typography sx={{ fontSize: '12px', lineHeight: '4px' }}>0</Typography>
        </Box>

        <Box sx={[styles.potionItem, selectedItem === 'extraLifePotion' && styles.selectedItem]} onClick={() => selectItem('extraLifePotion')}>
          <Typography>Extra Life</Typography>
          <img src={lifePotionIcon} alt='' height={'32px'} />
          <Typography sx={{ fontSize: '12px', lineHeight: '4px' }}>0</Typography>
        </Box>

      </Box>}
    </Box>
  )
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  count: {
    position: 'absolute',
    bottom: '-2px',
    borderRadius: '100%',
    right: '-2px',
    background: '#f6e6bc',
    color: 'white',
    border: '1px solid rgba(0, 0, 0, 1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '15px'
  },
  potionMenu: {
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    position: 'absolute',
    backgroundColor: '#f6e6bc',
    border: '3px solid rgba(0, 0, 0, 0.5)',
    borderRadius: '10px',
    bottom: '45px',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '4px'
  },
  potionItem: {
    padding: '4px 8px 8px',
    position: 'relative',
    textAlign: 'center',
    width: '50px',
    cursor: 'pointer',
    border: '2px solid transparent',
  },
  selectedItem: {
    border: '2px solid #fc5c1d',
    boxShadow: '0 0 10px rgba(252, 92, 29, 0.5)',
    borderRadius: '10px',
    transition: 'border 0.3s ease, box-shadow 0.3s ease',
  }
}