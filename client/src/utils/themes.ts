import { createTheme } from '@mui/material/styles';

// Define our custom color palette
export const gameColors = {
  // Primary colors from the design
  gameYellow: '#ffedbb',
  darkGreen: '#0A1F0F',
  mediumGreen: '#1A3A2A',
  lightGreen: '#2D5941',
  accentGreen: '#4A8762',
  brightGreen: '#58b000',
  
  // Secondary colors
  orange: '#FF6B35',
  yellow: '#FFD700',
  purple: '#9B59B6',
  blue: '#3498DB',
  red: '#E74C3C',
  
  // Neutral colors
  black: '#000000',
  darkGray: '#1A1A1A',
  mediumGray: '#333333',
  lightGray: '#666666',
  white: '#FFFFFF',
  offWhite: '#F5F5F5',
  
  // Beast type colors
  hunterColor: '#FF6B35',
  magicalColor: '#9B59B6',
  bruteColor: '#E74C3C',
}

export const mainTheme = createTheme({
  typography: {
    fontFamily: [
      'Cinzel',
      'roboto',
    ].join(','),
    allVariants: {
      color: gameColors.brightGreen
    },
    h1: {
      fontSize: '42px',
      color: gameColors.brightGreen,
      textTransform: 'uppercase',
      letterSpacing: '2px'
    },
    h2: {
      fontSize: '26px',
      color: gameColors.brightGreen,
      textTransform: 'uppercase',
      letterSpacing: '1.5px'
    },
    h3: {
      fontSize: '22px',
      color: gameColors.accentGreen
    },
    h4: {
      fontSize: '20px',
      color: gameColors.accentGreen
    },
    h5: {
      fontSize: '16px',
      color: gameColors.brightGreen
    },
    h6: {
      fontSize: '15px',
      color: gameColors.brightGreen
    },
    body1: {
      fontSize: '14px',
      lineHeight: '18px',
      color: gameColors.accentGreen
    },
    subtitle1: {
      fontSize: '14px',
      lineHeight: '18px',
      color: gameColors.lightGreen
    },
    subtitle2: {
      color: gameColors.lightGreen,
      fontStyle: 'italic',
      fontSize: '12px',
      letterSpacing: '0.5px'
    }
  },
  palette: {
    primary: {
      main: gameColors.brightGreen,
      contrastText: gameColors.darkGreen
    },
    secondary: {
      main: gameColors.orange,
      contrastText: gameColors.white
    },
    warning: {
      main: gameColors.yellow,
      contrastText: gameColors.darkGreen
    },
    background: {
      default: gameColors.darkGreen,
      paper: gameColors.mediumGreen
    },
    text: {
      primary: gameColors.brightGreen,
      secondary: gameColors.accentGreen
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          letterSpacing: '1px',
          borderRadius: '4px',
          color: gameColors.brightGreen,
          border: `2px solid ${gameColors.brightGreen}`,
          background: 'transparent',
          textTransform: 'uppercase',
          '&:hover': {
            background: gameColors.brightGreen,
            color: gameColors.darkGreen
          }
        }
      }
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundColor: gameColors.mediumGreen,
          border: `2px solid ${gameColors.brightGreen}`,
          borderRadius: '4px',
          padding: '0 12px'
        }
      }
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          fontSize: '14px',
          letterSpacing: '0.5px',
          background: 'transparent',
          border: 'none',
          color: gameColors.brightGreen
        }
      }
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: '40px'
        }
      }
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'uppercase',
          padding: '8px 16px',
          minHeight: '40px',
          color: gameColors.accentGreen,
          '&.Mui-selected': {
            color: gameColors.brightGreen
          }
        }
      }
    },
    MuiStepConnector: {
      styleOverrides: {
        root: {
          top: '50%',
          width: '25px',
          borderRadius: '0'
        }
      }
    },
    MuiOutlinedInput: {
      styleOverrides: {
        input: {
          '&:-webkit-autofill': {
            'webkitBoxShadow': `0 0 0 100px ${gameColors.mediumGreen} inset`,
            'webkitTextFillColor': gameColors.brightGreen
          }
        }
      }
    }
  }
})