import { Box, Button, Typography } from '@mui/material';
import { useAccount } from "@starknet-react/core";
import React, { useEffect, useState } from 'react';
import { ellipseAddress } from '../helpers/utilities';
import ConnectWallet from './dialogs/ConnectWallet';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';

function WalletConnect(props) {
  const { address } = useAccount()
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
          ? <Button onClick={handleClick} size='large'>
            <SportsEsportsIcon htmlColor='black' sx={{ fontSize: '18px', mr: '4px' }} />

            <Typography color='black' sx={{ fontSize: '13px' }}>
              {ellipseAddress(address, 4, 4)}
            </Typography>
          </Button>

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
    p: 1
  }
}