import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import LogoutIcon from '@mui/icons-material/Logout';
import { Box, Button, IconButton, Tooltip, Typography } from '@mui/material'
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import ChooseWallet from './dialogs/ConnectWallet'
import { ellipseAddress } from '../helpers/utilities'
import { useAccount, useConnect, useDisconnect } from '@starknet-react/core'
import { useContext } from 'react'
import { GameContext } from '../contexts/gameContext'
import { useStarkProfile } from '@starknet-react/core'
import { useState } from 'react';
import { useEffect } from 'react';

const ProfileCard = () => {
  const game = useContext(GameContext)
  const { collection, userRanks, walletBalances } = game.getState

  const { address } = useAccount()
  const { disconnect } = useDisconnect()
  const { connector } = useConnect()
  const { data: profile } = useStarkProfile({ address });

  const [accountDialog, openAccountDialog] = useState(false)
  const [walletName, setWalletName] = useState('')

  useEffect(() => {
    async function controllerName() {
      try {
        const name = await connector?.username()
        if (name) {
          setWalletName(name)
        }
      } catch (error) {
      }
    }

    if (profile?.name) {
      setWalletName(profile?.name?.replace('.stark', ''))
    } else {
      controllerName()
    }
  }, [connector, profile])

  if (!address) {
    return <>
      <Button variant='contained' onClick={() => openAccountDialog(true)} sx={{ borderRadius: '20px' }}>
        <Typography color='white' variant='h5'>
          CONNECT WALLET
        </Typography>
      </Button>

      <ChooseWallet open={accountDialog} close={openAccountDialog} />
    </>
  }

  return (
    <Box sx={styles.container}>
      <Box sx={styles.profileContainer}>
        <Tooltip title={<Box sx={{ background: '#616161', padding: '4px 8px', borderRadius: '4px' }}>Copy address</Box>}>
          <Button variant='text' sx={{ display: 'flex' }} onClick={async () => await navigator.clipboard.writeText(address)}>
            <SportsEsportsIcon htmlColor='black' sx={{ fontSize: '18px', mr: '4px' }} />

            <Typography color='black' sx={{ fontSize: '15px' }} letterSpacing={'0.5px'}>
              {walletName || ellipseAddress(address, 5, 4)}
            </Typography>
          </Button>
        </Tooltip>

        <Box sx={{ display: 'flex' }}>
          <Tooltip title={<Box sx={{ background: '#616161', padding: '4px 8px', borderRadius: '4px' }}>Disconnect</Box>}>
            <IconButton size='small' onClick={() => { disconnect(); game.actions.resetState(); }}>
              <LogoutIcon fontSize='small' htmlColor='black' />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Box display={'flex'} width={'100%'}>
        <Box sx={styles.infoSection} borderRight={'1px solid rgba(0, 0, 0, 1)'} pr={1}>
          <Typography sx={{ fontSize: '13px', letterSpacing: '0.5px' }}>tlords</Typography>

          <Box display={'flex'} alignItems={'start'} gap={'2px'} mt={'-3px'}>
            <Typography variant='h2' mb={'2px'}>
              {walletBalances.savage.toLocaleString()}
            </Typography>
          </Box>

          <Button sx={{ backgroundColor: 'black', color: 'white', borderRadius: '4px', padding: 0 }} size='small'>
            Mint
          </Button>
        </Box>

        <Box sx={styles.infoSection} pl={1}>
          <Typography sx={{ fontSize: '13px', letterSpacing: '0.5px' }}>Beasts</Typography>

          <Box display={'flex'} alignItems={'start'} gap={'2px'} mt={'-3px'}>
            <Typography variant='h2' mb={'2px'}>{collection.length}</Typography>
            {userRanks.beastRank > 0 && <Typography fontSize={'13px'} mb={'2px'} color={'rgba(0,0,0,0.5)'}>#{userRanks.beastRank}</Typography>}
          </Box>

          <Button sx={{ backgroundColor: 'black', color: 'white', borderRadius: '4px', padding: 0 }} size='small' component='a'
            href='https://market.realms.world/collection/0x0158160018d590d93528995b340260e65aedd76d28a686e9daa5c4e8fad0c5dd' target='_blank'>
            Buy
          </Button>
        </Box>
      </Box>

      <Box sx={{ width: '100%', borderTop: '1px solid rgba(0, 0, 0, 1)', pt: 1, textAlign: 'center' }}>
        <Typography letterSpacing={'0.5px'}>
          Beast Starter Pack
        </Typography>
        <Typography color='rgba(0,0,0,0.5)' fontSize={'13px'} mt={'-4px'} letterSpacing={'0.5px'}>
          393 available
        </Typography>
        <Button variant='contained' sx={{ borderRadius: '4px', width: '100px', height: '26px', my: '4px' }} className='button-glow'>
          <Typography color='white' letterSpacing={'0.5px'} variant='h6'>Claim</Typography>
        </Button>
      </Box>
    </Box>
  )
}

export default ProfileCard

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '180px',
    borderRadius: '10px',
    backgroundColor: '#f6e6bc',
    border: '2px solid rgba(0, 0, 0, 0.2)',
    boxShadow: '0px 0px 10px 0px rgba(0, 0, 0, 0.1)',
    boxSizing: 'border-box',
    px: 1,
    py: '4px'
  },
  profileContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    borderBottom: '1px solid rgba(0, 0, 0, 1)',
  },
  infoSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '50%',
    justifyContent: 'space-between',
    py: 0.5,
    boxSizing: 'border-box',
  },
}