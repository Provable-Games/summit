import { Button } from '@mui/material';
import LinearProgress, { linearProgressClasses } from '@mui/material/LinearProgress';
import { styled } from '@mui/material/styles';

export const HealthBar = styled(LinearProgress)(({ theme }) => ({
  height: 16,
  borderRadius: 10,
  width: '100%',
  [`&.${linearProgressClasses.colorPrimary}`]: {
    backgroundColor: theme.palette.grey[800],
    border: '2px solid black',
    boxSizing: 'border-box',
  },
  [`& .${linearProgressClasses.bar}`]: {
    borderRadius: 5,
    backgroundColor: '#ff6f3a',
  },
}));

export const ExperienceBar = styled(LinearProgress)(({ theme }) => ({
  height: 16,
  borderRadius: 10,
  width: '100%',
  [`&.${linearProgressClasses.colorPrimary}`]: {
    backgroundColor: theme.palette.grey[800],
    border: '2px solid black',
    boxSizing: 'border-box',
  },
  [`& .${linearProgressClasses.bar}`]: {
    borderRadius: 10,
    backgroundColor: '#9C27B0',
  },
}));

export const BeastsCollectedBar = styled(LinearProgress)(({ theme }) => ({
  height: 16,
  borderRadius: 10,
  width: '100%',
  [`&.${linearProgressClasses.colorPrimary}`]: {
    backgroundColor: theme.palette.grey[800],
    border: '2px solid black',
    boxSizing: 'border-box',
  },
  [`& .${linearProgressClasses.bar}`]: {
    borderRadius: 10,
    backgroundColor: '#4CAF50',
  },
}));

export const AttackButton = styled(Button)(({ theme }) => ({
  color: 'white',
  backgroundColor: '#fc5c1d',
  borderRadius: '20px',
  height: '40px',
  width: '190px',
  maxWidth: '40vw',
  fontSize: '1.4rem',
  lineHeight: 0,
  border: '1px solid black',
  boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.8), 0px 1px 3px rgba(0, 0, 0, 0.08)',
  '&:hover': {
    backgroundColor: '#fc5c1d',
  },
}));

export const BuyConsumablesButton = styled(Button)(({ theme }) => ({
  color: 'white',
  backgroundColor: '#1f8c9b',
  borderRadius: '20px',
  height: '40px',
  width: '200px',
  maxWidth: '43vw',
  fontSize: '1.3rem',
  lineHeight: 0,
  border: '1px solid black',
  boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.8), 0px 1px 3px rgba(0, 0, 0, 0.08)',
  '&:hover': {
    backgroundColor: '#1f8c9b',
  },
}));

export const RoundOrangeButton = styled(Button)(({ theme }) => ({
  color: 'white',
  backgroundColor: '#fc5c1d',
  borderRadius: '100%',
  height: '40px',
  width: '40px',
  minWidth: '40px',
  maxWidth: '40vw',
  fontSize: '1.3rem',
  lineHeight: 0,
  border: '1px solid black',
  boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.8), 0px 1px 3px rgba(0, 0, 0, 0.08)',
  '&:hover': {
    backgroundColor: '#fc5c1d',
  },
}));

export const RoundBlueButton = styled(Button)(({ theme }) => ({
  color: 'white',
  backgroundColor: '#1f8c9b',
  borderRadius: '100%',
  height: '40px',
  width: '40px',
  minWidth: '40px',
  maxWidth: '40vw',
  fontSize: '1.3rem',
  lineHeight: 0,
  border: '1px solid black',
  boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.8), 0px 1px 3px rgba(0, 0, 0, 0.08)',
  '&:hover': {
    backgroundColor: '#1f8c9b',
  },
}));

export const BonusHealthBar = styled(LinearProgress)(({ theme }) => ({
  height: 12,
  borderRadius: 10,
  width: '100%',
  [`&.${linearProgressClasses.colorPrimary}`]: {
    backgroundColor: theme.palette.grey[800],
    border: '2px solid black',
    boxSizing: 'border-box',
  },
  [`& .${linearProgressClasses.bar}`]: {
    borderRadius: 5,
    backgroundColor: '#4caf50',
  },
}));

export const OriginalHealthBar = styled(LinearProgress)(({ theme }) => ({
  height: 12,
  borderRadius: 10,
  width: '100%',
  [`&.${linearProgressClasses.colorPrimary}`]: {
    backgroundColor: 'transparent',
    border: '2px solid black',
    boxSizing: 'border-box',
  },
  [`& .${linearProgressClasses.bar}`]: {
    borderRadius: 5,
    backgroundColor: '#ff6f3a',
  },
}));