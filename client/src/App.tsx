import { StyledEngineProvider, ThemeProvider } from '@mui/material/styles';
import { AnimatePresence } from "framer-motion";
import { BrowserRouter } from "react-router-dom";

import Box from '@mui/material/Box';
import { SnackbarProvider } from 'notistack';
import { mainTheme } from './utils/themes';

import MainPage from "./pages/MainPage";

import { GameDirector } from './contexts/GameDirector';
import { ControllerProvider } from './contexts/controller';
import { StatisticsProvider } from './contexts/Statistics';
import ErrorBoundary, { GameErrorFallback } from './components/ErrorBoundary';

function App() {
  return (
    <BrowserRouter>
      <Box className='bgImage'>
        <StyledEngineProvider injectFirst>

          <ThemeProvider theme={mainTheme}>
            <SnackbarProvider anchorOrigin={{ vertical: 'top', horizontal: 'center' }} preventDuplicate>
              <ErrorBoundary fallback={<GameErrorFallback />}>
                <StatisticsProvider>
                  <ControllerProvider>
                    <GameDirector>

                      <Box className='main'>
                        <AnimatePresence mode="wait">

                          <MainPage />

                        </AnimatePresence>
                      </Box>

                    </GameDirector>
                  </ControllerProvider>
                </StatisticsProvider>
              </ErrorBoundary>
            </SnackbarProvider>
          </ThemeProvider>

        </StyledEngineProvider>
      </Box>
    </BrowserRouter >
  );
}

export default App