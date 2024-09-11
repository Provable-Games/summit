import React, { useState, useEffect, useCallback } from 'react';
import { Box, IconButton, Input, InputAdornment, Typography } from "@mui/material";
import SendIcon from '@mui/icons-material/Send';
import { useRef } from 'react';
import { useContext } from 'react';
import { GameContext } from '../contexts/gameContext';


function Chat() {
  const game = useContext(GameContext)
  const { eventLog } = game.getState

  const [chat, setChat] = useState('')
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const chatContainerRef = useRef(null);

  const addMessage = () => {
    // game.actions.publishChatMessage(chat);
    // setMessages(prev => [...prev, ({ type: 'chat', text: chat, beast: 'Warlock', level: 151 })]);
    setChat('');
  };

  // Scroll to bottom when new messages are added (if user is not manually scrolling)
  useEffect(() => {
    if (!isUserScrolling) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [eventLog, isUserScrolling]);

  // Detect user scrolling
  const handleScroll = () => {
    const isAtBottom = chatContainerRef.current.scrollHeight - chatContainerRef.current.scrollTop === chatContainerRef.current.clientHeight;
    setIsUserScrolling(!isAtBottom);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      addMessage()
    }
  }

  return <Box sx={styles.container}>

    <Box sx={styles.messageContainer} ref={chatContainerRef} onScroll={handleScroll}>
      {React.Children.toArray(
        eventLog.map(message => <Box display={'flex'}>
          {message.type === 'chat' && <Typography letterSpacing={'0.5px'} lineHeight={'14px'}>
            {`[ ${message.beast}, ${message.level} ]: `}{message.text}
          </Typography>}

          {message.type === 'capture' && <Typography letterSpacing={'0.5px'} lineHeight={'14px'} color={'darkgreen'}>
            {`${message.beast} has taken the summit.`}
          </Typography>}

          {message.type === 'damage' && <Typography letterSpacing={'0.5px'} lineHeight={'14px'} color={'darkred'}>
            {`${message.beast} dealt ${message.damage} dmg.`}
          </Typography>}
        </Box>)
      )}
    </Box>

    <Box sx={styles.chat}>
      <Input disableUnderline={true} placeholder='send message' sx={{ width: '100%', px: 1, color: 'black' }}
        value={chat}
        onChange={e => setChat(e.target.value)}
        onKeyDown={handleKeyPress}
        endAdornment={
          <InputAdornment position="end">
            <IconButton
              onClick={addMessage}
              edge="end"
            >
              <SendIcon fontSize='small' htmlColor='black' />
            </IconButton>
          </InputAdornment>
        }
      />
    </Box>
  </Box>;
}

export default Chat;

const styles = {
  container: {
    width: '300px',
    height: '200px',
    borderRadius: '10px',
    boxShadow: 'rgba(99, 99, 99, 0.2) 0px 2px 8px 0px',
    background: '#f6e6bc',
    border: '2px solid rgba(0, 0, 0, 0.8)',
    position: 'relative',
    mt: 1
  },
  messageContainer: {
    p: 1,
    boxSizing: 'border-box',
    gap: '2px',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflowY: 'scroll',
    pb: '40px'
  },
  chat: {
    position: 'absolute',
    bottom: 0,
    height: '30px',
    width: '100%',
    borderTop: '2px solid rgba(0, 0, 0, 0.7)',
    borderRadius: '5px',
    background: '#f6e6bc',
  }
}