import {
  Box,
  Dialog,
  Typography,
  Button,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import { gameColors } from "@/utils/themes";

interface AccessDeniedModalProps {
  open: boolean;
  onDisconnect: () => void;
}

const AccessDeniedModal = ({ open, onDisconnect }: AccessDeniedModalProps) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Dialog
      open={open}
      maxWidth={false}
      fullScreen={isMobile}
      disableEscapeKeyDown
      slotProps={{
        paper: {
          sx: {
            background: `${gameColors.darkGreen}95`,
            backdropFilter: "blur(12px) saturate(1.2)",
            border: isMobile ? "none" : `2px solid ${gameColors.accentGreen}60`,
            borderRadius: isMobile ? 0 : "12px",
            boxShadow: `
              0 8px 24px rgba(0, 0, 0, 0.6),
              0 0 16px ${gameColors.accentGreen}30
            `,
            width: isMobile ? "100%" : "420px",
            maxWidth: "96vw",
            m: isMobile ? 0 : 2,
          },
        },
        backdrop: {
          sx: {
            backgroundColor: "rgba(0, 0, 0, 0.85)",
          },
        },
      }}
    >
      <Box
        sx={{
          color: "#fff",
          p: { xs: 3, sm: 4 },
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: 2,
        }}
      >
        <LockIcon
          sx={{
            fontSize: "56px",
            color: gameColors.red,
            filter: `drop-shadow(0 0 8px ${gameColors.red}40)`,
          }}
        />

        <Typography
          sx={{
            fontSize: "22px",
            fontWeight: "bold",
            color: gameColors.red,
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            textShadow: `
              0 2px 4px rgba(0, 0, 0, 0.8),
              0 0 12px ${gameColors.red}40
            `,
          }}
        >
          ACCESS DENIED
        </Typography>

        <Typography
          sx={{
            fontSize: "0.9rem",
            color: "rgba(255,255,255,0.7)",
            lineHeight: 1.6,
          }}
        >
          Your wallet is not authorized to access this application.
        </Typography>

        <Button
          onClick={onDisconnect}
          fullWidth
          sx={{
            mt: 1,
            borderColor: `${gameColors.red}60`,
            color: gameColors.red,
            background: "transparent",
            fontWeight: "bold",
            letterSpacing: "1px",
            "&:hover": {
              borderColor: gameColors.red,
              background: `${gameColors.red}15`,
            },
          }}
        >
          Disconnect Wallet
        </Button>
      </Box>
    </Dialog>
  );
};

export default AccessDeniedModal;
