import InfoIcon from '@mui/icons-material/Info';
import { Box, Button, Tooltip, Typography } from "@mui/material";
import { useAccount } from "@starknet-react/core";
import React, { useContext, useState } from 'react';
import health from '../assets/images/health.png';
import sword from '../assets/images/sword.png';
import selectAll from '../assets/images/selectall.png';
import { GameContext } from '../contexts/gameContext';
import { beastElementalColor, fetchBeastImage, fetchBeastTypeImage, normaliseHealth } from "../helpers/beasts";
import { ExperienceBar, HealthBar } from '../helpers/styles';
import { Scrollbars } from 'react-custom-scrollbars';

import Lottie from "lottie-react";
import SwordAnimation from '../assets/animations/swords.json';
import { isBrowser } from "react-device-detect";
import { BruteIcon, HunterIcon, MagicalIcon } from "./Icons";
import BeastProfile from './BeastProfile';
import heart from '../assets/images/heart.png';

function BeastCollection() {
  const game = useContext(GameContext)
  const { loadingCollection, collection, selectedBeasts, attackInProgress, summit } = game.getState

  const { address } = useAccount()
  const [beastProfile, setBeastProfile] = useState(1)

  const selectBeast = (id) => {
    if (selectedBeasts.includes(id)) {
      game.setState.selectedBeasts(prev => prev.filter(prevId => prevId !== id))
    } else {
      game.setState.selectedBeasts(prev => [...prev, id])
    }
  }

  const selectAllBeasts = () => {
    if (collection.filter(x => x.currentHealth > 0).length === selectedBeasts.length) {
      game.setState.selectedBeasts([])
    } else {
      game.setState.selectedBeasts(collection.filter(x => x.currentHealth > 0).map(x => x.id))
    }
  }

  const RenderBottomText = (beast) => {
    if (summit.id === beast.id) {
      return <Typography variant="h5" letterSpacing={'2px'} className="glitch-effect" lineHeight={'14px'}>
        SAVÁGE
      </Typography>
    }

    if (beast.currentHealth === 0) {
      return <Typography lineHeight={'10px'} letterSpacing={'0.5px'} color={'rgba(0, 0, 0, 0.6)'}>
        {(() => {
          const timeLeft = (beast.deadAt + 23 * 3600 * 1000 - Date.now()) / 1000;
          const hours = Math.floor(timeLeft / 3600);

          if (hours > 0) {
            return `Revives in ${hours}h`;
          } else {
            return `Revives in ${Math.floor((timeLeft % 3600) / 60)}m`;
          }
        })()}
      </Typography>
    }

    if (beast.capture) {
      return <Box display={'flex'} alignItems={'center'} gap={'2px'}>
        <img src={health} alt='' height={'13px'} />

        <Typography lineHeight={'6px'} letterSpacing={'0.5px'} color={'darkgreen'}>
          {beast.healthLeft} hp left
        </Typography>
      </Box>
    }

    return <Box display={'flex'} gap={'3px'} alignItems={'center'}>
      <img src={sword} alt='' height={'10px'} />

      <Typography lineHeight={'6px'} letterSpacing={'0.5px'} color={'darkred'}>
        {beast.damage} dmg
      </Typography>
    </Box>
  }

  return (
    <Scrollbars style={{ width: '100%', height: '100%' }}>

      <Box sx={styles.container}>
        {!address && !loadingCollection && <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 3, height: '200px', width: '100%' }}>

          <Box textAlign={'center'}>
            <Typography variant="h2" letterSpacing={'0.5px'}>
              Connect Your Wallet
            </Typography>
            <Typography variant="h2" letterSpacing={'0.5px'}>
              Take the summit
            </Typography>
          </Box>

          <img src={fetchBeastImage('tarrasque')} alt='' height={'150px'} />

        </Box>}

        {address && !loadingCollection && collection.length < 1 && <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 3, height: '200px', width: '100%' }}>

          <Box textAlign={'center'}>
            <Typography variant="h2" letterSpacing={'0.5px'}>
              You don't own any beast nfts
            </Typography>
            <Typography variant="h2" letterSpacing={'0.5px'}>
              Collect them in <a style={{ color: '#30a019' }} href="https://lootsurvivor.io" target="_blank">loot survivor 1.5</a>
            </Typography>
            <Typography variant="h2" letterSpacing={'0.5px'}>
              Or buy in <a style={{ color: '#ff92b6' }} href="https://realms.world/collection/beasts" target="_blank">Realms world</a>
            </Typography>
          </Box>

          {isBrowser && <img src={fetchBeastImage('golem')} alt='' height={'150px'} />}

        </Box>}

        {loadingCollection && <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 3, height: '200px', width: '100%' }}>

          <Box textAlign={'center'}>
            <Box display={'flex'} alignItems={'baseline'}>
              <Typography variant="h2" letterSpacing={'0.5px'}>Fetching beasts</Typography>
              <div className='dotLoader' />
            </Box>
          </Box>

        </Box>}

        {collection.length > 5 && (
          <Box sx={[styles.utilityButton, selectedBeasts.length === collection.filter(x => x.currentHealth > 0).length && styles.selectedItem]} onClick={() => selectAllBeasts()}>
            <img src={selectAll} alt='' height={'100%'} />
          </Box>
        )}

        {collection.map(beast => {
          const isSelected = selectedBeasts.includes(beast.id)
          const isSavage = summit.id === beast.id
          const elementalColor = beastElementalColor(beast)
          const currentHealth = isSavage ? summit.currentHealth : beast.currentHealth
          let extraLife = 0

          return <Box
            key={beast.id}
            sx={[styles.itemContainer, isSelected && styles.selectedItem, (selectedBeasts.length > 0 && !isSelected) && { opacity: 0.5, borderColor: 'transparent' }]}
            onClick={() => selectBeast(beast.id)}>

            <Tooltip title={<Box sx={{ background: '#616161', padding: '4px 8px', borderRadius: '4px' }}>{beast.type}</Box>}>
              <Box sx={{ position: 'absolute', top: '3px', left: '4px' }} >
                {beast.type === 'Hunter' && <HunterIcon color={elementalColor} />}
                {beast.type === 'Magical' && <MagicalIcon color={elementalColor} />}
                {beast.type === 'Brute' && <BruteIcon color={elementalColor} />}
              </Box>
            </Tooltip>

            {isSelected && attackInProgress && <Box sx={{ position: 'absolute', bottom: '45px' }}>
              <Lottie animationData={SwordAnimation} loop={true} style={{ height: '90px' }} />
            </Box>}

            {isSelected && selectedBeasts.length > 1 && <Box sx={styles.order}>
              <Typography variant="h6" lineHeight={'19px'}>
                {selectedBeasts.findIndex(x => x === beast.id) + 1}
              </Typography>
            </Box>}

            {selectedBeasts.length <= 1 &&
              <Tooltip title={<BeastProfile beast={beast} />} placement='top'>
                <Box sx={[styles.order, { cursor: 'pointer', right: 2 }]}>
                  <InfoIcon fontSize='small' color='primary' />
                </Box>
              </Tooltip>
            }

            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, width: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '4x' }}>
                <Typography variant='h6' sx={{ lineHeight: '12px', letterSpacing: '0.5px' }}>
                  {beast.name}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-evenly', width: '100%', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', gap: '2px' }}>
                  <Typography sx={{ letterSpacing: '0.5px', color: 'rgba(0, 0, 0, 0.6)' }}>
                    Pwr
                  </Typography>
                  <Typography sx={{ letterSpacing: '0.5px', color: 'rgba(0, 0, 0, 0.6)' }}>
                    {beast.power}
                  </Typography>
                </Box>
              </Box>
            </Box>

            <img alt='' src={fetchBeastImage(beast.name)} height={'85px'} style={{ marginTop: '-3px' }} />

            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', width: '100%' }}>
              <Box position={'relative'} width={'100%'}>
                <HealthBar variant="determinate" value={normaliseHealth(currentHealth, beast.health)} />

                <Box sx={[styles.healthText, extraLife > 0 && { left: '7px', transform: 'none' }]}>
                  <Typography sx={{ fontSize: '13px', lineHeight: '16px', color: 'white', letterSpacing: '0.5px' }}>
                    {currentHealth}
                  </Typography>
                </Box>

                {extraLife > 0 && <Box sx={styles.extraLife}>
                  {extraLife > 1 && <Typography sx={{ fontSize: '13px', lineHeight: '16px', color: 'white', letterSpacing: '0.5px', textShadow: '0 0 5px #39FF14' }}>
                    {extraLife}
                  </Typography>}

                  <img src={heart} alt='' height={'12px'} />
                </Box>}
              </Box>

              <Box position={'relative'} width={'100%'}>
                <ExperienceBar variant="determinate"
                  value={normaliseHealth(beast.totalXp - Math.pow(beast.level, 2), Math.pow(beast.level + 1, 2) - Math.pow(beast.level, 2))}
                  sx={{ height: '10px', border: '2px solid black' }} />

                <Box sx={styles.healthText}>
                  <Typography sx={{ fontSize: '10px', lineHeight: '10px', color: 'white', letterSpacing: '0.5px' }}>
                    {beast.totalXp >= Math.pow(beast.level + 1, 2) ? 'Level up' : (isSelected && attackInProgress ? `+${10 + beast.attack_streak || 0} XP` : 'XP')}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {RenderBottomText(beast)}
          </Box>
        })}
      </Box >
    </Scrollbars>
  );
}

export default BeastCollection;

const styles = {
  container: {
    width: '100%',
    display: 'flex',
    gap: 1,
    overflowX: 'auto',
    boxSizing: 'border-box',
    p: '5px'
  },
  itemContainer: {
    position: 'relative',
    height: '180px',
    boxSizing: 'border-box',
    width: '100px',
    minWidth: '120px',
    padding: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 0.5,
    cursor: 'pointer',
    borderRadius: '5px',
    border: '2px solid rgba(0, 0, 0, 0.5)',
    background: '#f6e6bc',
    transition: 'border-color 0.3s ease, box-shadow 0.3s ease, opacity 0.3s ease',
  },
  selectedItem: {
    boxShadow: 'rgba(0, 0, 0, 0.35) 0px 5px 15px;',
    border: '2px solid rgba(0, 0, 0, 0.8)',
  },
  healthText: {
    position: 'absolute',
    top: 0,
    left: '50%',
    transform: 'translate(-50%)',
    textAlign: 'center'
  },
  extraLife: {
    position: 'absolute',
    top: 0,
    right: '6px',
    height: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '2px'
  },
  order: {
    position: 'absolute',
    top: 0,
    right: 5
  },
  utilityButton: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '30px',
    width: '30px',
    border: '2px solid rgba(0, 0, 0, 0.4)',
    background: '#f6e6bc',
    borderRadius: '5px',
    cursor: 'pointer',
    padding: '3px',
    boxSizing: 'border-box',
    transition: 'border-color 0.3s ease, box-shadow 0.3s ease, opacity 0.3s ease',
    marginRight: '-3px'
  }
}