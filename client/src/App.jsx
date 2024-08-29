import { StyledEngineProvider, ThemeProvider } from '@mui/material/styles';
import { AnimatePresence } from "framer-motion";
import { BrowserRouter } from "react-router-dom";

import Box from '@mui/material/Box';
import { SnackbarProvider } from 'notistack';
import { mainTheme } from './helpers/themes';

import MainPage from "./pages/MainPage";

import { Dojo } from './contexts/dojoContext';
import { GameProvider } from './contexts/gameContext';
import { StarknetProvider } from './contexts/starknet';

function App() {
  return (
    <BrowserRouter>
      <Box className='bgImage'>
        <StyledEngineProvider injectFirst>

          <ThemeProvider theme={mainTheme}>
            <SnackbarProvider anchorOrigin={{ vertical: 'top', horizontal: 'center' }} preventDuplicate>
              <StarknetProvider>
                <Dojo>
                  <GameProvider>

                    <Box className='main'>
                      <AnimatePresence mode="wait">

                        <MainPage />

                      </AnimatePresence>
                    </Box>

                  </GameProvider>
                </Dojo>
              </StarknetProvider>
            </SnackbarProvider>
          </ThemeProvider>

        </StyledEngineProvider>
      </Box>
    </BrowserRouter >
  );
}

export default App