import { Box, Typography } from "@mui/material";

function SummitTimer() {
    return <Box display={'flex'} alignItems={'center'} mt={0.5} gap={'2px'} sx={{ opacity: 0.8 }}>
        <Typography variant='h4'>
            29
        </Typography>
        <Typography fontWeight={'bold'}>
            :
        </Typography>
        <Typography variant='h4'>
            50
        </Typography>
        <Typography fontWeight={'bold'}>
            :
        </Typography>
        <Typography variant='h4'>
            00
        </Typography>
    </Box>;
}

export default SummitTimer;