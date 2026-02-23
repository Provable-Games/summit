import { gameColors } from "@/utils/themes";
import { Box, Typography } from "@mui/material";


export default function Migrating() {
  return (
    <Box sx={styles.container}>
      <Typography sx={styles.title}>MIGRATING TO NEW SUMMIT</Typography>
      <Typography sx={styles.description}>Please wait while we migrate Beasts to the new summit.</Typography>
    </Box>
  );
}

const styles = {
  container: {
    position: "absolute",
    top: 80,
    left: "50%",
    transform: "translateX(-50%)",
    background: `${gameColors.darkGreen}90`,
    backdropFilter: 'blur(12px) saturate(1.2)',
    border: `2px solid ${gameColors.accentGreen}60`,
    borderRadius: '12px',
    boxShadow: `
      0 8px 24px rgba(0, 0, 0, 0.6),
      0 0 0 1px ${gameColors.darkGreen}
    `,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    px: 3,
    py: 2,
    zIndex: 10,
    minWidth: 250,
  },
  title: {
    fontSize: "1rem",
    fontWeight: 600,
    letterSpacing: 1.5,
    color: "#d0c98d",
    mb: 1.5,
  },
  description: {
    fontSize: "0.8rem",
    color: "#fff",
    letterSpacing: 1,
    mt: 0.5,
  },
};
