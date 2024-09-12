import { Box, Typography } from "@mui/material";
import { useContext } from "react";
import { GameContext } from "../contexts/gameContext";

function SummitReward() {
  const game = useContext(GameContext)
  const { beastReward } = game.getState

  return <Box display={'flex'} alignItems={'center'} mt={0.5} gap={'2px'} sx={{ opacity: 0 }}>
    <Typography variant='h4' letterSpacing={'1px'}>
      ${beastReward}
    </Typography>
  </Box>;
}

export default SummitReward;