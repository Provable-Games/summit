import { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { gameColors } from '@/utils/themes';
import { logger } from '@/utils/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

/**
 * Error Boundary component that catches JavaScript errors anywhere in the child
 * component tree, logs those errors, and displays a fallback UI.
 */
class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.errorWithContext('ErrorBoundary', error);
    logger.error('Component Stack:', errorInfo.componentStack);

    this.setState({ errorInfo });

    // Call optional error callback
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Box sx={styles.container}>
          <Box sx={styles.content}>
            <Typography sx={styles.title}>
              Something went wrong
            </Typography>
            <Typography sx={styles.message}>
              An unexpected error occurred. Please try again.
            </Typography>
            {import.meta.env.DEV && this.state.error && (
              <Box sx={styles.errorDetails}>
                <Typography sx={styles.errorMessage}>
                  {this.state.error.message}
                </Typography>
              </Box>
            )}
            <Button
              onClick={this.handleRetry}
              sx={styles.retryButton}
              variant="contained"
            >
              Try Again
            </Button>
          </Box>
        </Box>
      );
    }

    return this.props.children;
  }
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '200px',
    padding: 2,
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
    padding: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 2,
    border: `1px solid ${gameColors.darkGreen}`,
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
    color: gameColors.yellow,
  },
  message: {
    color: '#fff',
    textAlign: 'center',
  },
  errorDetails: {
    maxWidth: '400px',
    padding: 1,
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    borderRadius: 1,
    overflow: 'auto',
  },
  errorMessage: {
    fontSize: '0.875rem',
    color: '#ff6b6b',
    fontFamily: 'monospace',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  retryButton: {
    backgroundColor: gameColors.darkGreen,
    color: '#fff',
    '&:hover': {
      backgroundColor: gameColors.mediumGreen,
    },
  },
};

export default ErrorBoundary;

/**
 * GameErrorFallback - A more specific error fallback for game-related errors
 */
export const GameErrorFallback = () => (
  <Box sx={styles.container}>
    <Box sx={styles.content}>
      <Typography sx={styles.title}>
        Game Error
      </Typography>
      <Typography sx={styles.message}>
        The game encountered an error. Please refresh the page to continue playing.
      </Typography>
      <Button
        onClick={() => window.location.reload()}
        sx={styles.retryButton}
        variant="contained"
      >
        Refresh Page
      </Button>
    </Box>
  </Box>
);
