import { Box, Typography } from "@mui/material";
import { useContext } from "react";
import { GameContext } from "../contexts/gameContext";
import { useState, useEffect } from "react";

function SummitReward() {
  const game = useContext(GameContext)
  const { summit } = game.getState

  const [amount, setAmount] = useState(summit.takenAt ? Math.floor(Date.now() / 1000 - summit.takenAt) : 0)

  useEffect(() => {
    setAmount(summit.takenAt ? Math.floor(Date.now() / 1000 - summit.takenAt) : 0);

    const interval = setInterval(() => {
      setAmount(prev => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [summit.id])

  return <Box display={'flex'} alignItems={'center'} mt={0.5} gap={'2px'}>
    <Typography variant='h4' letterSpacing={'1px'}>
      {amount} $reward
    </Typography>
  </Box>;
}

export default SummitReward;