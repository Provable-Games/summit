import { createTheme } from '@mui/material/styles';

export const mainTheme = createTheme({
  typography: {
    fontFamily: [
      'New Amsterdam',
      'roboto',
    ].join(','),
    allVariants: {
      color: '#000'
    },
    h1: {
      fontSize: '42px'
    },
    h2: {
      fontSize: '26px',
    },
    h3: {
      fontSize: '22px'
    },
    h4: {
      fontSize: '20px'
    },
    h5: {
      fontSize: '16px'
    },
    h6: {
      fontSize: '15px'
    },
    body1: {
      fontSize: '14px',
      lineHeight: '18px'
    },
    subtitle1: {
      fontSize: '14px',
      lineHeight: '18px',
      color: 'rgba(255, 255, 255, 0.7)'
    },
    subtitle2: {
      color: 'rgba(0, 0, 0, 0.5)',
      fontStyle: 'italic',
      fontSize: '12px',
      letterSpacing: '0.5px'
    }
  },
  palette: {
    primary: {
      main: '#fc5c1d',
      contrastText: '#000'
    },
    secondary: {
      main: '#ffb000',
      contrastText: "#000"
    },
    warning: {
      main: '#ffb000',
      contrastText: "#fff"
    },
    background: {
      default: '#1F1E1F',
      paper: '#f6e6bc'
    },
    text: {
      primary: '#FFF'
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          letterSpacing: '1px',
          borderRadius: '20px',
          color: 'white'
        }
      }
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          fontSize: '16px',
          background: 'transparent'
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
          textTransform: 'none',
          padding: '8px 16px',
          minHeight: '40px'
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
            'webkitBoxShadow': '0 0 0 100px #282729 inset',
            'webkitTextFillColor': '#fff'
          }
        }
      }
    }
  }
})