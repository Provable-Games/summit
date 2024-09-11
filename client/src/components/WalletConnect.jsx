import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import LogoutIcon from '@mui/icons-material/Logout';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import { Box, Button, ListItemIcon, ListItemText, Menu, MenuItem, Typography } from '@mui/material';
import { useAccount, useDisconnect } from "@starknet-react/core";
import React, { useContext, useState } from 'react';
import { GameContext } from '../contexts/gameContext';
import { ellipseAddress } from '../helpers/utilities';
import ConnectWallet from './dialogs/ConnectWallet';

function WalletConnect(props) {
  const game = useContext(GameContext)
  const { address } = useAccount()
  const { disconnect } = useDisconnect()
  const [accountDialog, openAccountDialog] = useState(false)

  const [anchorEl, setAnchorEl] = useState(null);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <>

      <Box sx={styles.container}>
        {address
          ? <>
            <Button onClick={handleClick} size='large'>
              <SportsEsportsIcon htmlColor='black' sx={{ fontSize: '18px', mr: '4px' }} />

              <Typography color='black' sx={{ fontSize: '14px' }}>
                {ellipseAddress(address, 4, 4)}
              </Typography>
            </Button>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleClose}
            >
              <MenuItem onClick={async () => await navigator.clipboard.writeText(address)}>
                <ListItemIcon>
                  <ContentPasteIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText sx={{ letterSpacing: '1px' }}>
                  Copy Address
                </ListItemText>
              </MenuItem>

              <MenuItem onClick={() => { disconnect(); game.actions.resetState(); handleClose(); }}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText sx={{ letterSpacing: '1px' }}>
                  Disconnect
                </ListItemText>
              </MenuItem>
            </Menu>
          </>

          : <Button variant='contained' onClick={() => openAccountDialog(true)} sx={{ borderRadius: '20px' }}>
            <Typography color='white' variant='h5'>
              CONNECT WALLET
            </Typography>
          </Button>
        }
      </Box>

      <ConnectWallet open={accountDialog} close={openAccountDialog} />

    </>
  );
}

export default WalletConnect;

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 2,
  }
}