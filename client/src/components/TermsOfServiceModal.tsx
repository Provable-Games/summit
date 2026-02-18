import { useState } from "react";
import {
  Box,
  Dialog,
  Typography,
  Button,
  Checkbox,
  FormControlLabel,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import GavelIcon from "@mui/icons-material/Gavel";
import { gameColors } from "@/utils/themes";

interface TermsOfServiceModalProps {
  open: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

const TermsOfServiceModal = ({
  open,
  onAccept,
  onDecline,
}: TermsOfServiceModalProps) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [hasAgreed, setHasAgreed] = useState(false);

  const handleAccept = () => {
    if (hasAgreed) {
      if (typeof window !== "undefined") {
        localStorage.setItem("termsOfServiceAccepted", "true");
      }
      onAccept();
      setHasAgreed(false);
    }
  };

  const handleDecline = () => {
    setHasAgreed(false);
    onDecline();
  };

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
            width: isMobile ? "100%" : "520px",
            maxWidth: "96vw",
            maxHeight: isMobile ? "100%" : "85vh",
            m: isMobile ? 0 : 2,
            pb: isMobile ? "env(safe-area-inset-bottom)" : 0,
            display: "flex",
            flexDirection: "column",
          },
        },
        backdrop: {
          sx: {
            backgroundColor: "rgba(0, 0, 0, 0.85)",
          },
        },
      }}
    >
      <Box sx={styles.container}>
        {/* Header */}
        <Box sx={styles.header}>
          <GavelIcon sx={styles.headerIcon} />
          <Typography sx={styles.title}>TERMS OF SERVICE</Typography>
          <Typography sx={styles.subtitle}>
            Please read and accept to continue
          </Typography>
        </Box>

        {/* Effective Date */}
        <Box sx={styles.dateBadge}>
          <Typography sx={styles.dateText}>
            Effective Date: February 18, 2026
          </Typography>
        </Box>

        {/* Terms Content */}
        <Box sx={styles.termsContainer}>
          <Box sx={styles.termsContent}>
            <Typography component="div" sx={styles.termsText}>
              These Terms of Service ("Terms") govern your access to and use of
              the Summit game ("Game"), including any related websites,
              smart contracts, tokens, and services (collectively, the
              "Services"). The Game is created and operated by Provable Labs Ltd.,
              a company incorporated in the British Virgin Islands ("Provable
              Labs", "we", "our", or "us").
              <br />
              <br />
              By accessing or using the Services, you agree to be bound by these
              Terms. If you do not agree, you may not participate in Summit.
              <br />
              <br />
              <strong>1. Eligibility</strong>
              <ul>
                <li>
                  You must be at least 18 years old, or the age of majority in
                  your jurisdiction, to participate.
                </li>
                <li>
                  You are solely responsible for ensuring that your participation
                  in Summit complies with all laws and regulations in
                  your jurisdiction.
                </li>
                <li>
                  You may not participate if you are a resident of, or accessing
                  the Services from, any jurisdiction where participation would be
                  unlawful.
                </li>
              </ul>
              <strong>2. Game Mechanics</strong>
              <ul>
                <li>
                  Summit operates entirely on blockchain-based immutable
                  smart contracts.
                </li>
                <li>
                  Provable Labs cannot modify, update, reverse, or otherwise
                  interfere with the rules of the Game once deployed.
                </li>
                <li>
                  Participation in the Game involves interaction with the SURVIVOR
                  token and blockchain transactions.
                </li>
              </ul>
              <strong>3. Risk of Loss</strong>
              <br />
              All transactions and gameplay actions in Summit are final
              and irreversible.
              <br />
              <br />
              There are no refunds, reversals, chargebacks, or compensation
              mechanisms.
              <br />
              <br />
              You acknowledge and accept the full risk of loss, including but not
              limited to:
              <ul>
                <li>Loss of tokens (SKULL, CORPSE, SURVIVOR, ATTACK, REVIVE, EXTRA LIFE, POISON).</li>
                <li>
                  Financial loss due to smart contract behavior, game outcomes, or
                  your own mistakes.
                </li>
                <li>Potential volatility in the value of any tokens.</li>
              </ul>
              <strong>4. No Warranties</strong>
              <ul>
                <li>The Services are provided "as is" and "as available."</li>
                <li>
                  Provable Labs makes no warranties, express or implied, regarding
                  the Game, including but not limited to warranties of
                  merchantability, fitness for a particular purpose, or
                  non-infringement.
                </li>
                <li>
                  Provable Labs does not guarantee that the Game will be
                  error-free, uninterrupted, secure, or available at all times.
                </li>
              </ul>
              <strong>5. No Recourse</strong>
              <ul>
                <li>
                  By participating in Summit, you waive all rights to
                  claims or recourse against Provable Labs, the DAO, or any
                  associated entities or individuals.
                </li>
                <li>
                  Provable Labs bears no responsibility for losses, damages, or
                  disputes that arise from your participation.
                </li>
                <li>
                  You are solely responsible for safeguarding your wallet, private
                  keys, and security practices.
                </li>
              </ul>
              <strong>6. Prohibited Conduct</strong>
              <br />
              You agree not to engage in any activity that:
              <ul>
                <li>Violates these Terms or applicable law.</li>
                <li>
                  Seeks to exploit vulnerabilities, manipulate, or interfere with
                  the Game or its smart contracts.
                </li>
                <li>
                  Attempts to gain unauthorized access to systems, accounts, or
                  data.
                </li>
                <li>Harasses or harms other participants.</li>
              </ul>
              <strong>7. Intellectual Property (CC0)</strong>
              <ul>
                <li>
                  Summit and its related creative works are released
                  under the Creative Commons CC0 Public Domain Dedication.
                </li>
                <li>
                  This means you are free to copy, modify, distribute, and use the
                  content of Summit, even for commercial purposes,
                  without asking permission.
                </li>
                <li>
                  Provable Labs makes no claim of copyright, trademark, or other
                  intellectual property rights over the Summit creative
                  works.
                </li>
                <li>
                  This does not apply to third-party content, smart contract code,
                  or trademarks that may be referenced in connection with
                  Summit.
                </li>
              </ul>
              <strong>8. Limitation of Liability</strong>
              <br />
              To the maximum extent permitted by law:
              <ul>
                <li>
                  Provable Labs shall not be liable for any indirect, incidental,
                  consequential, or special damages, including but not limited to
                  lost profits, lost tokens, or data loss.
                </li>
                <li>
                  Total liability for any claims arising from participation shall
                  not exceed the amount you directly paid to access the Services
                  (if any).
                </li>
              </ul>
              <strong>9. Governing Law & Dispute Resolution</strong>
              <ul>
                <li>
                  These Terms shall be governed by and construed under the laws of
                  the British Virgin Islands.
                </li>
                <li>
                  Any disputes arising out of these Terms shall be resolved
                  exclusively in the courts of the British Virgin Islands.
                </li>
                <li>
                  You agree to submit to the personal jurisdiction of such courts.
                </li>
              </ul>
              <strong>10. Changes to the Terms</strong>
              <ul>
                <li>
                  Provable Labs may update these Terms at any time by posting the
                  revised version.
                </li>
                <li>
                  Continued participation in Summit after updates
                  constitutes acceptance of the new Terms.
                </li>
              </ul>
              <strong>11. Acknowledgment</strong>
              <br />
              By participating in Summit, you confirm that you have read,
              understood, and agreed to these Terms, and that you accept all risks
              and responsibilities associated with participation.
            </Typography>
          </Box>
        </Box>

        {/* Agreement Section */}
        <Box sx={styles.agreementSection}>
          <FormControlLabel
            control={
              <Checkbox
                checked={hasAgreed}
                onChange={(e) => setHasAgreed(e.target.checked)}
                sx={styles.checkbox}
              />
            }
            label={
              <Typography sx={styles.checkboxLabel}>
                I have read and agree to the Terms of Service
              </Typography>
            }
          />
        </Box>

        {/* Action Buttons */}
        <Box sx={styles.buttonContainer}>
          <Button
            onClick={handleDecline}
            fullWidth
            sx={styles.declineButton}
          >
            Decline
          </Button>
          <Button
            onClick={handleAccept}
            disabled={!hasAgreed}
            fullWidth
            sx={[styles.acceptButton, !hasAgreed && styles.acceptButtonDisabled]}
          >
            Accept & Continue
          </Button>
        </Box>

        {/* Help Text */}
        <Typography sx={styles.helpText}>
          By declining, your wallet will be disconnected.
        </Typography>
      </Box>
    </Dialog>
  );
};

const styles = {
  container: {
    position: "relative" as const,
    color: "#fff",
    p: { xs: 2, sm: 2.5 },
    display: "flex",
    flexDirection: "column" as const,
    height: "100%",
    overflow: "hidden",
  },
  header: {
    textAlign: "center" as const,
    mb: 2,
  },
  headerIcon: {
    fontSize: "44px",
    color: gameColors.yellow,
    filter: `drop-shadow(0 0 8px ${gameColors.yellow}40)`,
  },
  title: {
    fontSize: "22px",
    fontWeight: "bold",
    color: gameColors.brightGreen,
    letterSpacing: "1.5px",
    textTransform: "uppercase" as const,
    textShadow: `
      0 2px 4px rgba(0, 0, 0, 0.8),
      0 0 12px ${gameColors.brightGreen}40
    `,
    mt: 0.5,
  },
  subtitle: {
    fontSize: "13px",
    color: "#bbb",
    mt: 0.5,
  },
  dateBadge: {
    display: "flex",
    justifyContent: "center",
    mb: 2,
  },
  dateText: {
    fontSize: "11px",
    fontWeight: "bold",
    color: gameColors.accentGreen,
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
    background: `${gameColors.darkGreen}80`,
    border: `1px solid ${gameColors.accentGreen}40`,
    borderRadius: "4px",
    px: 1.5,
    py: 0.5,
  },
  termsContainer: {
    flex: 1,
    minHeight: 0,
    borderRadius: "10px",
    border: `1px solid ${gameColors.accentGreen}40`,
    background: `${gameColors.darkGreen}60`,
    overflow: "hidden",
    mb: 2,
  },
  termsContent: {
    height: "100%",
    maxHeight: { xs: "40vh", sm: "320px" },
    overflowY: "auto" as const,
    p: 2,
    "&::-webkit-scrollbar": {
      width: "6px",
    },
    "&::-webkit-scrollbar-track": {
      background: `${gameColors.darkGreen}40`,
      borderRadius: "3px",
    },
    "&::-webkit-scrollbar-thumb": {
      background: `${gameColors.accentGreen}60`,
      borderRadius: "3px",
      "&:hover": {
        background: `${gameColors.accentGreen}80`,
      },
    },
  },
  termsText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: "0.85rem",
    lineHeight: 1.7,
    "& strong": {
      color: gameColors.brightGreen,
      fontWeight: 600,
      fontSize: "0.9rem",
    },
    "& ul": {
      margin: "8px 0",
      paddingLeft: "20px",
    },
    "& li": {
      marginBottom: "6px",
      color: "rgba(255,255,255,0.6)",
    },
  },
  agreementSection: {
    background: `${gameColors.darkGreen}80`,
    border: `1px solid ${gameColors.accentGreen}30`,
    borderRadius: "8px",
    px: 1.5,
    py: 1,
    mb: 2,
  },
  checkbox: {
    color: gameColors.accentGreen,
    "&.Mui-checked": {
      color: gameColors.brightGreen,
    },
  },
  checkboxLabel: {
    fontSize: "0.875rem",
    color: "rgba(255,255,255,0.8)",
  },
  buttonContainer: {
    display: "flex",
    gap: 1.5,
  },
  declineButton: {
    borderColor: `${gameColors.red}60`,
    color: gameColors.red,
    background: "transparent",
    fontWeight: "bold",
    letterSpacing: "1px",
    "&:hover": {
      borderColor: gameColors.red,
      background: `${gameColors.red}15`,
    },
  },
  acceptButton: {
    background: `linear-gradient(135deg, ${gameColors.brightGreen} 0%, ${gameColors.accentGreen} 100%)`,
    border: "none",
    color: gameColors.darkGreen,
    fontWeight: "bold",
    letterSpacing: "1px",
    textShadow: "none",
    "&:hover": {
      background: `linear-gradient(135deg, ${gameColors.brightGreen} 20%, ${gameColors.accentGreen} 100%)`,
      boxShadow: `0 0 12px ${gameColors.brightGreen}60`,
    },
  },
  acceptButtonDisabled: {
    background: `${gameColors.darkGreen}80`,
    border: `1px solid ${gameColors.accentGreen}30`,
    color: "rgba(255,255,255,0.3)",
    "&:hover": {
      background: `${gameColors.darkGreen}80`,
      boxShadow: "none",
    },
    "&.Mui-disabled": {
      background: `${gameColors.darkGreen}80`,
      border: `1px solid ${gameColors.accentGreen}30`,
      color: "rgba(255,255,255,0.3)",
    },
  },
  helpText: {
    display: "block",
    textAlign: "center" as const,
    color: "rgba(255,255,255,0.4)",
    mt: 2,
    fontSize: "0.75rem",
  },
};

export default TermsOfServiceModal;
