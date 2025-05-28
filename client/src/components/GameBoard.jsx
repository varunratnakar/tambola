import React, { useEffect, useState } from 'react';
import voiceService from '../services/voiceService';

function NumberGrid({ drawnNumbers, onClick, isClickable = true }) {
  const nums = Array.from({ length: 90 }, (_, i) => i + 1);
  return (
    <div className="grid grid-cols-9 sm:grid-cols-10 gap-1">
      {nums.map((n) => (
        <div
          key={n}
          onClick={() => isClickable && onClick && onClick(n)}
          className={`cell ${drawnNumbers.includes(n) ? 'cell-called' : 'cell-number'} ${
            isClickable ? 'cursor-pointer' : 'cursor-default'
          }`}
        >
          {n}
        </div>
      ))}
    </div>
  );
}


function PlayerGameView({ tickets, marked, onCell, latestNumber, latestNumberKey, drawn, gamePrizes, winners, handleClaim, voiceEnabled, onVoiceToggle, voiceStatus, onVoiceModeChange, connectionStatus, gameOptions, remainingNumbers, theme, onThemeChange, gameStarted, isHost, socket, gameId, autoDrawEnabled, addNotification, penaltyRemaining, onExit }) {
  if (!tickets || tickets.length === 0) return null;

  const isDisabled = connectionStatus !== 'connected' || penaltyRemaining > 0;

  return (
      <div className={`player-game-container ${
        theme === 'harrypotter' ? 'theme-harrypotter' :
        theme === 'fun' ? 'theme-fun' :
        theme === 'kids' ? 'theme-kids' :
        theme === 'professional' ? 'theme-professional' : 'theme-simple'
      }`}>
        {/* Host Indicator - Removed for more screen space */}

      {/* Waiting Banner */}
      {!gameStarted && (
        <div className="waiting-message text-center mb-2">
          ⏳ Waiting for the game to start...
        </div>
      )}

      {/* Tickets Grid */}
      <div className="tickets-section">
        <div className={`tickets-container-new ${
          theme === 'harrypotter' ? 'tickets-harrypotter' :
          theme === 'fun' ? 'tickets-fun' :
          theme === 'kids' ? 'tickets-kids' :
          theme === 'professional' ? 'tickets-professional' : ''
        }`}>
                      {tickets.map((ticket, index) => (
              <div key={index} className={`ticket-wrapper ${
                theme === 'harrypotter' ? 'ticket-harrypotter' :
                theme === 'fun' ? 'ticket-fun' :
                theme === 'kids' ? 'ticket-kids' :
                theme === 'professional' ? 'ticket-professional' : ''
              }`}>
                <div className={`ticket-header ${
                  theme === 'harrypotter' ? 'header-harrypotter' :
                  theme === 'fun' ? 'header-fun' :
                  theme === 'kids' ? 'header-kids' :
                  theme === 'professional' ? 'header-professional' : ''
                }`}>
                <span className="ticket-number">Ticket {index + 1}</span>
        {latestNumber && (
                  <span 
                    key={latestNumberKey} 
                    className="ticket-latest-number new-number"
          >
            {latestNumber}
                  </span>
                )}
                <div className="ticket-info-right">
                  {drawn.length > 0 && (
                    <span className="ticket-recent-numbers">
                      {drawn.slice(-5).join(' ')}
                    </span>
                  )}
                </div>
          </div>
                              <div className={`ticket-grid-new ${
                                theme === 'harrypotter' ? 'grid-harrypotter' :
                                theme === 'fun' ? 'grid-fun' :
                                theme === 'kids' ? 'grid-kids' :
                                theme === 'professional' ? 'grid-professional' : ''
                              }`}>
          {ticket.map((row, rowIdx) => (
                  <div key={rowIdx} className="ticket-row">
              {row.map((num, colIdx) => (
                <div
                  key={colIdx}
                        onClick={() => num && onCell(num, index)}
                        className={`ticket-cell ${!num ? 'empty-cell' : marked[index]?.includes(num) ? 'marked-cell' : 'number-cell'}`}
                >
                  {num || ''}
                </div>
              ))}
            </div>
          ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Prize Claim Buttons */}
      <div className={`prize-section ${
        theme === 'harrypotter' ? 'prize-harrypotter' :
        theme === 'fun' ? 'prize-fun' :
        theme === 'kids' ? 'prize-kids' :
        theme === 'professional' ? 'prize-professional' : ''
      }`}>
        <div className="prize-buttons-grid">
          <button 
            className={`prize-btn line-btn ${winners.topLine ? 'claimed' : ''} ${isDisabled ? 'disabled' : ''}`}
            onClick={() => !isDisabled && handleClaim('line', 0)}
            disabled={!!winners.topLine || isDisabled}
          >
            <div className="prize-text">Top Line</div>
            <div className="prize-amount">₹{gamePrizes.topLine}</div>
          </button>
          
          <button 
            className={`prize-btn line-btn ${winners.middleLine ? 'claimed' : ''} ${isDisabled ? 'disabled' : ''}`}
            onClick={() => !isDisabled && handleClaim('line', 1)}
            disabled={!!winners.middleLine || isDisabled}
          >
            <div className="prize-text">Middle Line</div>
            <div className="prize-amount">₹{gamePrizes.middleLine}</div>
          </button>
          
          <button 
            className={`prize-btn line-btn ${winners.bottomLine ? 'claimed' : ''} ${isDisabled ? 'disabled' : ''}`}
            onClick={() => !isDisabled && handleClaim('line', 2)}
            disabled={!!winners.bottomLine || isDisabled}
          >
            <div className="prize-text">Bottom Line</div>
            <div className="prize-amount">₹{gamePrizes.bottomLine}</div>
          </button>
          
          <button 
            className={`prize-btn special-btn ${winners.corners ? 'claimed' : ''} ${isDisabled ? 'disabled' : ''}`}
            onClick={() => !isDisabled && handleClaim('corners')}
            disabled={!!winners.corners || isDisabled}
          >
            <div className="prize-text">Corners</div>
            <div className="prize-amount">₹{gamePrizes.corners}</div>
          </button>
          
          {gameOptions.enableEarly5 && (
            <button 
              className={`prize-btn early5-btn ${winners.early5 ? 'claimed' : ''} ${isDisabled ? 'disabled' : ''}`}
              onClick={() => !isDisabled && handleClaim('early5')}
              disabled={!!winners.early5 || isDisabled}
            >
              <div className="prize-text">Early 5</div>
              <div className="prize-amount">₹{gamePrizes.early5}</div>
            </button>
          )}
          
          <button 
            className={`prize-btn house-btn ${
              gameOptions.enableMultipleHouses 
                ? (winners.house.length >= gameOptions.maxHouseWinners ? 'claimed' : '') 
                : (winners.house.length > 0 ? 'claimed' : '')
            } ${isDisabled ? 'disabled' : ''}`}
            onClick={() => !isDisabled && handleClaim('house')}
            disabled={
              gameOptions.enableMultipleHouses 
                ? (winners.house.length >= gameOptions.maxHouseWinners || isDisabled || winners.house.some(w => w.playerName === 'You'))
                : (winners.house.length > 0 || isDisabled)
            }
          >
            <div className="prize-text">
              {gameOptions.enableMultipleHouses && winners.house.length > 0 
                ? `Full House #${winners.house.length + 1}` 
                : 'Full House'}
            </div>
            <div className="prize-amount">
              {gameOptions.enableMultipleHouses && winners.house.length > 0 
                ? `₹${Math.floor(gamePrizes.house * Math.pow(gameOptions.houseReductionPercent / 100, winners.house.length))}`
                : `₹${gamePrizes.house}`}
            </div>
          </button>
        </div>
      </div>

      {/* Bottom Controls - Voice, Theme, and Remaining Numbers */}
      <div className="bg-white rounded-lg p-2 mt-2 border border-gray-300">
        <div className="flex items-center justify-between gap-2">
          {/* Remaining Numbers Info */}
          {penaltyRemaining > 0 && (
            <div className="flex items-center gap-2 text-sm font-bold text-red-700">
              ⏳ Penalty: {penaltyRemaining}s
            </div>
          )}
          {penaltyRemaining === 0 && remainingNumbers !== undefined && (
            <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
              <span className="text-red-600">📊</span>
              <span>{remainingNumbers} numbers left</span>
            </div>
          )}
          
          {/* Right side controls */}
          <div className="flex items-center gap-2">
            {/* Theme Selector */}
            <select
              value={theme}
              onChange={(e) => onThemeChange(e.target.value)}
              className="py-1 px-2 rounded-lg text-sm font-bold border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <option value="simple">🎨 Simple</option>
              <option value="harrypotter">🧙‍♂️ Harry Potter</option>
              <option value="fun">🎉 Fun</option>
              <option value="kids">🎈 Kids</option>
              <option value="professional">💼 Professional</option>
            </select>
            
            {/* Voice Enable/Disable */}
            {voiceService.isSupported() && (
              <button 
                className={`py-2 px-3 rounded-full text-sm transition-colors ${
                  voiceEnabled 
                    ? 'bg-green-500 text-white hover:bg-green-600' 
                    : 'bg-gray-400 text-gray-700 hover:bg-gray-500'
                }`}
                onClick={onVoiceToggle}
              >
                {voiceEnabled ? '🔊' : '🔇'}
              </button>
            )}

            {/* Exit Game */}
            <button
              className="btn-danger text-xs py-1 px-2"
              onClick={onExit}
            >🏃 Exit</button>

            {/* Pause or Request Pause */}
            {isHost ? (
              <button
                className={`text-xs py-1 px-2 ${autoDrawEnabled ? 'btn-danger' : 'btn-primary'}`}
                onClick={() => {
                  if (autoDrawEnabled) {
                    socket.emit('pause_game', { gameId, seconds: 60 });
                  } else {
                    socket.emit('resume_game', { gameId });
                  }
                }}
              >{autoDrawEnabled ? '⏸️ Pause Game' : '▶️ Resume Game'}</button>
            ) : (
              <button
                className="btn-secondary text-xs py-1 px-2"
                onClick={() => socket.emit('request_pause', { gameId })}
              >🙋‍♂️ Request Pause</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function GameBoard({ socket, gameId, isHost, tickets: initialTickets, onBackToLobby }) {
  // Multiple tickets support enabled
  const [drawn, setDrawn] = useState([]);
  const [latest, setLatest] = useState(null);
  const [tickets, setTickets] = useState(initialTickets || []);
  const [latestNumberKey, setLatestNumberKey] = useState(0); // For triggering animations
  const [remainingNumbers, setRemainingNumbers] = useState(90); // Track numbers left to draw
  const [marked, setMarked] = useState({}); // Object with ticketIndex as key and array of marked numbers as value
  const [gameStarted, setGameStarted] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [gameEndInfo, setGameEndInfo] = useState(null);
  const [gameCancelled, setGameCancelled] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // Prize and winner tracking
  const [gamePrizes, setGamePrizes] = useState({
    topLine: 0,
    middleLine: 0,
    bottomLine: 0,
    corners: 0,
    house: 0,
    early5: 0
  });
  const [winners, setWinners] = useState({
    topLine: null,
    middleLine: null,
    bottomLine: null,
    corners: null,
    house: [],
    early5: null
  });
  const [gameOptions, setGameOptions] = useState({
    enableEarly5: false,
    enableMultipleHouses: false,
    maxHouseWinners: 3,
    houseReductionPercent: 50
  });
  const [myWinnings, setMyWinnings] = useState([]);
  const [pricePerTicket, setPricePerTicket] = useState(50);
  
  // Auto-draw status (server-managed)
  const [autoDrawEnabled, setAutoDrawEnabled] = useState(false);
  const [autoDrawInterval, setAutoDrawInterval] = useState(15); // seconds
  
  // Voice announcement controls
  const initialVoiceStatus = voiceService.getStatus();
  const [voiceEnabled, setVoiceEnabled] = useState(initialVoiceStatus.isEnabled);
  const [voiceStatus, setVoiceStatus] = useState(initialVoiceStatus);
  
  // Theme selection
  const [theme, setTheme] = useState('professional');
  
  // Connection status
  const [connectionStatus, setConnectionStatus] = useState('connected');

  // Non-blocking toast notifications
  const [notifications, setNotifications] = useState([]);

  // Penalty / cooldown
  const [penaltyRemaining, setPenaltyRemaining] = useState(0);

  const [gamePaused, setGamePaused] = useState(false);

  // Allow player to exit game and return to lobby
  const exitGame = () => {
    // Remove saved session so auto-rejoin does not trigger
    sessionStorage.removeItem('tambolaSession');
    try {
      if (socket && socket.connected) {
        socket.disconnect();
      }
    } catch (_) {}
    if (onBackToLobby) {
      onBackToLobby();
    }
  };

  const addNotification = (message, type = 'info', duration = 5000) => {
    const id = Date.now() + Math.random();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, duration);
  };

  // Request game info on mount
  useEffect(() => {
    if (socket && gameId) {
      socket.emit('get_game_info', { gameId }, () => {});
    }
  }, [socket, gameId]);

  // Announce game start
  useEffect(() => {
    if (gameStarted && voiceEnabled && voiceService.isSupported()) {
      // Only announce once when game starts
      const hasAnnounced = sessionStorage.getItem(`game-start-announced-${gameId}`);
      if (!hasAnnounced) {
        voiceService.announceEvent('The game has started. Good luck everyone!');
        sessionStorage.setItem(`game-start-announced-${gameId}`, 'true');
      }
    }
  }, [gameStarted, voiceEnabled, gameId]);

  useEffect(() => {
    // Handle heartbeat to keep connection alive
    socket.on('heartbeat', () => {
      socket.emit('heartbeat_response');
    });

    // Handle connection status
    socket.on('connect', () => {
      setConnectionStatus('connected');
    });

    socket.on('disconnect', (reason) => {
      setConnectionStatus('disconnected');
      console.log('GameBoard: Socket disconnected:', reason);
    });

    socket.on('reconnect', () => {
      setConnectionStatus('connected');
    });

    // // Handle host leaving (game continues)
    // socket.on('host_left', ({ message }) => {
    //   alert(`ℹ️ ${message}`);
    // });

    const onNumber = ({ number, drawnNumbers, remainingCount, autoDrawn }) => {
      if (drawnNumbers) {
        setDrawn(drawnNumbers);
      } else {
      setDrawn((prev) => [...prev, number]);
      }
      setLatest(number);
      setLatestNumberKey(prev => prev + 1); // Trigger animation by changing key
      setGameStarted(true);
      
      // Update remaining numbers count
      if (typeof remainingCount === 'number') {
        setRemainingNumbers(remainingCount);
      }
      
      // Announce the number with voice
      if (voiceEnabled && voiceService.isSupported()) {
        voiceService.announceNumber(number);
      }
    };
    
    const onClaimSuccess = ({ playerId, playerName, prizeMessage, claimType, lineIndex, prizeAmount, housePosition }) => {
      // Announce the win with voice
      if (voiceEnabled && voiceService.isSupported()) {
        voiceService.announceEvent(`Congratulations ${playerName}! ${prizeMessage} claimed!`);
      }

      addNotification(`🎉 ${playerName} won ${prizeMessage}!`, 'success');
      
      // Update winners state
      if (claimType === 'line') {
        const lineTypes = ['topLine', 'middleLine', 'bottomLine'];
        const lineType = lineTypes[lineIndex || 0];
        setWinners(prev => ({ ...prev, [lineType]: playerName }));
      } else if (claimType === 'house') {
        setWinners(prev => ({
          ...prev,
          house: [...prev.house, { playerName, position: housePosition, prizeAmount }]
        }));
      } else {
        setWinners(prev => ({ ...prev, [claimType]: playerName }));
      }
      
      // If this player won, add to their winnings
      if (playerId === socket.id) {
        setMyWinnings(prev => [...prev, { prize: prizeMessage, amount: prizeAmount }]);
      }
    };

    const onClaimFailed = ({ reason }) => {
      addNotification(`😅 ${reason} – Keep trying!`, 'error');
    };

    const onGameCompleted = ({ reason, winners, totalNumbers }) => {
      setGameCompleted(true);
      setGameEndInfo({ reason, winners, totalNumbers });
      
      // Announce game completion
      if (voiceEnabled && voiceService.isSupported()) {
        voiceService.announceEvent(`Game completed! ${reason}`);
      }
    };

    const onGameCancelled = ({ reason }) => {
      setGameCancelled(true);
      setCancelReason(reason);
    };

    const onGameInfo = ({ prizes, winners: gameWinners, pricePerTicket: gamePrice, options }) => {
      if (prizes) setGamePrizes(prizes);
      if (gameWinners) setWinners(gameWinners);
      if (gamePrice) setPricePerTicket(gamePrice);
      if (options) setGameOptions(options);
    };

    const onPrizesUpdated = ({ prizes }) => {
      if (prizes) setGamePrizes(prizes);
    };

    const onPlayerLeft = ({ playerName }) => {
      addNotification(`👋 ${playerName || 'A player'} left the game`, 'info');
    };

    const onBogeyCalled = ({ playerName, reason }) => {
      addNotification(`🚫 Bogey! ${playerName || 'Someone'} made a false claim (${reason})`, 'error');
      if (voiceEnabled && voiceService.isSupported()) {
        voiceService.announceEvent(`Bogey! ${playerName || 'A player'} made a false claim.`);
      }
    };

    const onPenaltyStarted = ({ seconds }) => {
      setPenaltyRemaining(seconds);
    };

    socket.on('number_drawn', onNumber);
    socket.on('claim_success', onClaimSuccess);
    socket.on('claim_failed', onClaimFailed);
    socket.on('game_completed', onGameCompleted);
    socket.on('game_cancelled', onGameCancelled);
    socket.on('game_info', onGameInfo);
    socket.on('prizes_updated', onPrizesUpdated);
    socket.on('bogey_called', onBogeyCalled);
    socket.on('player_left', onPlayerLeft);
    socket.on('penalty_started', onPenaltyStarted);
    
    // Keep reference to avoid duplicate listeners
    const onGamePaused = () => {
      setGamePaused(true);
      addNotification('⏸️ Game Paused', 'info');
      if (voiceEnabled && voiceService.isSupported()) {
        voiceService.announceEvent('The game is paused.');
      }
    };
    const onGameResumed = () => {
      setGamePaused(false);
      addNotification('▶️ Game Resumed', 'success');
      if (voiceEnabled && voiceService.isSupported()) {
        voiceService.announceEvent('The game has resumed.');
      }
    };
    const onPauseRequested = ({ playerName }) => {
      if (isHost) {
        addNotification(`⏸️ ${playerName} requested a pause`, 'info');
        // Voice announce for host
        if (voiceEnabled && voiceService.isSupported()) {
          voiceService.announceEvent(`${playerName} has requested a pause.`);
        }
      }
    };

    socket.on('game_paused', onGamePaused);
    socket.on('game_resumed', onGameResumed);
    socket.on('pause_requested', onPauseRequested);
    
    return () => {
      socket.off('heartbeat');
      socket.off('connect');
      socket.off('disconnect');
      socket.off('reconnect');
      socket.off('host_left');
      socket.off('number_drawn', onNumber);
      socket.off('claim_success', onClaimSuccess);
      socket.off('claim_failed', onClaimFailed);
      socket.off('game_completed', onGameCompleted);
      socket.off('game_cancelled', onGameCancelled);
      socket.off('game_info', onGameInfo);
      socket.off('prizes_updated', onPrizesUpdated);
      socket.off('bogey_called', onBogeyCalled);
      socket.off('player_left', onPlayerLeft);
      socket.off('game_paused', onGamePaused);
      socket.off('game_resumed', onGameResumed);
      socket.off('pause_requested', onPauseRequested);
      socket.off('penalty_started', onPenaltyStarted);
    };
  }, [socket, isHost, voiceEnabled]);

  // Redirect to lobby when game is cancelled
  useEffect(() => {
    if (gameCancelled && onBackToLobby) {
      const timer = setTimeout(() => {
        onBackToLobby();
      }, 3000); // 3 second delay
      
      return () => clearTimeout(timer);
    }
  }, [gameCancelled, onBackToLobby]);

  // All drawing functions removed - game is now server-managed

  // Event listeners for server-side auto-draw
  useEffect(() => {
    const onAutoDrawStarted = ({ interval }) => {
      setAutoDrawEnabled(true);
      setAutoDrawInterval(interval);

      // Voice announce game start (only once)
      if (voiceEnabled && voiceService.isSupported()) {
        const hasAnnounced = sessionStorage.getItem(`game-start-announced-${gameId}`);
        if (!hasAnnounced) {
          voiceService.announceEvent('The game has started. Good luck everyone!');
          sessionStorage.setItem(`game-start-announced-${gameId}`, 'true');
        }
      }
    };

    const onAutoDrawStopped = () => {
      setAutoDrawEnabled(false);
    };

    socket.on('auto_draw_started', onAutoDrawStarted);
    socket.on('auto_draw_stopped', onAutoDrawStopped);

    return () => {
      socket.off('auto_draw_started', onAutoDrawStarted);
      socket.off('auto_draw_stopped', onAutoDrawStopped);
    };
  }, [socket, voiceEnabled, gameId]);
  
  const toggleMark = (n, ticketIndex) => {
    setMarked((prev) => {
      const currentMarked = prev[ticketIndex] || [];
      const newMarked = currentMarked.includes(n) 
        ? currentMarked.filter((x) => x !== n) 
        : [...currentMarked, n];
      return { ...prev, [ticketIndex]: newMarked };
    });
  };
  
  const handleClaim = (type, lineIndex = null) => {
    const payload = { gameId, claimType: type, markedNumbers: marked };
    if (type === 'line' && lineIndex !== null) {
      payload.lines = [lineIndex];
    }
    // Remove ticketIndex - let server scan all tickets
    socket.emit('claim', payload, () => {});
  };

  // Cancel game function removed - no host controls

  // Resume reconnect handler when tab regains focus
  useEffect(() => {
    const resume = () => {
      if (socket.connected) return;
      const saved = sessionStorage.getItem('tambolaSession');
      if (!saved) return;
      const { gameId: savedGameId, playerName: savedName, numTickets: savedTickets } = JSON.parse(saved);
      if (!savedGameId) return;

      socket.connect();
      const attemptJoin = () => {
        socket.emit('join_game', { gameId: savedGameId, playerName: savedName, numTickets: savedTickets||1 }, (res) => {
          if (res.status !== 'ok' && res.message?.includes('already started')) {
            setTimeout(attemptJoin, 1000);
          }
        });
      };
      socket.once('connect', attemptJoin);
    };
    window.addEventListener('visibilitychange', resume);
    window.addEventListener('focus', resume);
    return () => {
      window.removeEventListener('visibilitychange', resume);
      window.removeEventListener('focus', resume);
    };
  }, [socket]);

  // Force default voice mode to AI on initial mount
  useEffect(() => {
    if (voiceService.getStatus().mode !== 'ai') {
      voiceService.setMode('ai');
      setVoiceStatus(voiceService.getStatus());
    }
  }, []);

  // Countdown for penalty
  useEffect(() => {
    if (penaltyRemaining <= 0) return;
    const timer = setInterval(() => {
      setPenaltyRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [penaltyRemaining]);

  return (
    <div className="flex flex-col h-full">
      {/* Connection Status Indicator */}
      {connectionStatus !== 'connected' && (
        <div className="bg-red-100 border-2 border-red-400 rounded-lg p-2 mx-1 mt-1">
          <div className="text-red-800 font-bold text-center">
            ⚠️ Connection Lost - Attempting to reconnect...
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      {notifications.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`px-4 py-2 rounded-lg shadow-lg text-white animate-slide-down ${
                n.type === 'success'
                  ? 'bg-green-600'
                  : n.type === 'error'
                  ? 'bg-red-600'
                  : 'bg-blue-600'
              }`}
            >
              {n.message}
            </div>
          ))}
        </div>
      )}

      {/* Game completed notification */}
      {gameCompleted && gameEndInfo && (
        <div className="bg-green-100 border-4 border-green-500 rounded-lg p-4 text-center m-1">
          <h2 className="text-2xl font-bold text-green-800 mb-3" style={{ fontFamily: 'Fredoka One' }}>
            🎉 Game Completed! 🎉
          </h2>
          <p className="text-green-700 font-bold text-lg mb-4">{gameEndInfo.reason}</p>
          <p className="text-green-600 mb-4">Total numbers drawn: {gameEndInfo.totalNumbers}/90</p>
          
          {/* Show winners */}
          <div className="bg-white rounded-lg p-4 border-2 border-green-300">
            <h3 className="font-bold text-green-800 mb-2">🏆 Prize Winners:</h3>
            <div className="space-y-1 text-sm">
              {gameEndInfo.winners.topLine && (
                <p>🔥 Top Line: <span className="font-bold">{gameEndInfo.winners.topLine}</span></p>
              )}
              {gameEndInfo.winners.middleLine && (
                <p>⭐ Middle Line: <span className="font-bold">{gameEndInfo.winners.middleLine}</span></p>
              )}
              {gameEndInfo.winners.bottomLine && (
                <p>💫 Bottom Line: <span className="font-bold">{gameEndInfo.winners.bottomLine}</span></p>
              )}
              {gameEndInfo.winners.corners && (
                <p>🔸 Corners: <span className="font-bold">{gameEndInfo.winners.corners}</span></p>
              )}
              {/* Full House (can be multiple winners) */}
              {Array.isArray(gameEndInfo.winners.house) && gameEndInfo.winners.house.length > 0 && (
                gameEndInfo.winners.house.map((w, idx) => (
                  <p key={idx}>🎉 Full House #{w.position}: <span className="font-bold">{w.playerName}</span> <span className="text-green-700 font-semibold">₹{w.prizeAmount}</span></p>
                ))
              )}
              {!Object.values(gameEndInfo.winners).some(winner => winner) && (
                <p className="text-gray-600 italic">No prizes were claimed</p>
              )}
            </div>
          </div>
          
          <p className="text-green-600 text-sm mt-4 italic">
            Thank you for playing! The game will close automatically.
          </p>
        </div>
      )}

      {/* Game cancelled notification */}
      {gameCancelled && (
        <div className="bg-red-100 border-4 border-red-500 rounded-lg p-4 text-center m-1">
          <h2 className="text-2xl font-bold text-red-800 mb-3" style={{ fontFamily: 'Fredoka One' }}>
            ❌ Game Cancelled ❌
          </h2>
          <p className="text-red-700 font-bold text-lg mb-4">{cancelReason}</p>
          <p className="text-red-600 text-sm italic">
            You will be redirected to the lobby shortly.
          </p>
        </div>
      )}



      {/* My Winnings Display - Only show when game is completed */}
      {gameCompleted && (
        <div className="bg-green-100 border-2 border-green-400 rounded-lg p-2 mx-1 mt-1">
          <h3 className="font-bold text-green-800 mb-2">💰 Your Game Summary:</h3>
          <div className="space-y-1">
            {myWinnings.length > 0 ? (
              <>
                {myWinnings.map((winning, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm">
                    <span className="text-green-700">{winning.prize}</span>
                    <span className="font-bold text-green-800">₹{winning.amount}</span>
                    </div>
                ))}
                <div className="border-t border-green-300 pt-1 mt-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-green-700">Total Winnings:</span>
                    <span className="font-bold text-green-800">₹{myWinnings.reduce((sum, w) => sum + w.amount, 0)}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-sm text-gray-600 italic">No prizes won</div>
            )}
            
            {/* Cost calculation */}
            <div className="border-t border-green-300 pt-1 mt-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-green-700">Tickets Cost ({tickets.length} × ₹{pricePerTicket}):</span>
                <span className="font-bold text-red-600">-₹{tickets.length * pricePerTicket}</span>
                    </div>
                  </div>

            {/* Net profit/loss */}
            <div className="border-t-2 border-green-400 pt-2 mt-2">
              {(() => {
                const totalWinnings = myWinnings.reduce((sum, w) => sum + w.amount, 0);
                const totalCost = tickets.length * pricePerTicket;
                const netAmount = totalWinnings - totalCost;
                const isProfit = netAmount > 0;
                const isBreakeven = netAmount === 0;
                
                return (
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-green-800">Net Result:</span>
                    <span className={`font-bold ${isBreakeven ? 'text-gray-600' : isProfit ? 'text-green-600' : 'text-red-600'}`}>
                      {isBreakeven ? '₹0 (Break Even)' : `${isProfit ? '+' : ''}₹${netAmount}`}
                    </span>
                  </div>
                );
              })()}
                  </div>
                </div>
        </div>
      )}

      {!gameCancelled && (
        <div className="flex-1 overflow-y-auto p-1 space-y-2 landscape:p-1 landscape:space-y-1">
          {/* Game Status - Removed for more screen space */}

          {/* Player View - Show for everyone including host */}
          {tickets && tickets.length > 0 && !gameCompleted && (
            <PlayerGameView
              tickets={tickets}
              marked={marked}
              onCell={toggleMark}
              latestNumber={latest}
              latestNumberKey={latestNumberKey}
              drawn={drawn}
              gamePrizes={gamePrizes}
              winners={winners}
              handleClaim={handleClaim}
              voiceEnabled={voiceEnabled}
              onVoiceToggle={() => {
                const newState = voiceService.toggle();
                setVoiceEnabled(newState);
                setVoiceStatus(voiceService.getStatus());
              }}
              voiceStatus={voiceStatus}
              onVoiceModeChange={(mode) => {
                voiceService.setMode(mode);
                setVoiceStatus(voiceService.getStatus());
              }}
              connectionStatus={connectionStatus}
              gameOptions={gameOptions}
              remainingNumbers={remainingNumbers}
              theme={theme}
              onThemeChange={setTheme}
              gameStarted={gameStarted}
              isHost={isHost}
              socket={socket}
              gameId={gameId}
              autoDrawEnabled={autoDrawEnabled}
              addNotification={addNotification}
              penaltyRemaining={penaltyRemaining}
              onExit={exitGame}
            />
          )}
        </div>
      )}

      {/* Global Pause Banner */}
      {gameStarted && !autoDrawEnabled && !gameCompleted && !gameCancelled && (
        <div className="fixed top-0 left-0 right-0 bg-red-600 text-white text-center py-2 z-40 animate-pulse shadow-lg">
          ⏸️ Game Paused – Take a short break!
        </div>
      )}

    </div>
  );
}

export default GameBoard; 