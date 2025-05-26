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

function TicketGrid({ ticket, marked, onCell, latestNumber, ticketIndex, totalTickets }) {
  return (
    <div className="ticket-item">
      <div 
        className="bg-white border-4 border-gray-800 rounded-lg p-3 shadow-lg mx-auto relative"
        style={{
          width: totalTickets === 1 ? 'min(500px, 90vw)' : 'min(300px, 90vw)',
          maxWidth: '90vw'
        }}
      >
        {/* Latest number overlay */}
        {latestNumber && (
          <div 
            className="absolute top-1 left-3 flex items-center justify-center bounce-in animate-fade-out"
            style={{
              fontSize: 'clamp(1rem, 3vw, 1.5rem)',
              fontWeight: 'bold',
              color: '#dc2626',
              zIndex: 10,
              fontFamily: 'Fredoka One'
            }}
          >
            {latestNumber}
          </div>
        )}
        
        <h3 className="text-center font-bold text-gray-800 mb-2" 
            style={{ 
              fontFamily: 'Fredoka One',
              fontSize: totalTickets === 1 ? 'clamp(0.875rem, 3vw, 1.5rem)' : 'clamp(0.75rem, 2.5vw, 1rem)'
            }}>
          🎫 TICKET {ticketIndex + 1} 🎫
        </h3>
        <div className="border-2 border-gray-600">
          {ticket.map((row, rowIdx) => (
            <div key={rowIdx} className="flex border-b border-gray-400 last:border-b-0">
              {row.map((num, colIdx) => (
                <div
                  key={colIdx}
                  onClick={() => num && onCell(num)}
                  className={`
                    flex-1 aspect-square flex items-center justify-center border-r border-gray-400 last:border-r-0
                    font-bold cursor-pointer transition-colors
                    ${!num 
                      ? 'bg-gray-100' 
                      : marked.includes(num) 
                        ? 'cell-scratched' 
                        : 'bg-white text-gray-800 hover:bg-blue-50'
                    }
                  `}
                  style={{
                    fontSize: totalTickets === 1 ? 'clamp(0.875rem, 2.5vw, 1.5rem)' : 'clamp(0.625rem, 2vw, 1rem)'
                  }}
                >
                  {num || ''}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PlayerGameView({ tickets, marked, onCell, latestNumber, latestNumberKey, drawn, gamePrizes, winners, handleClaim, voiceEnabled, onVoiceToggle, connectionStatus, hostDisconnected }) {
  if (!tickets || tickets.length === 0) return null;

  const isDisabled = connectionStatus !== 'connected' || hostDisconnected;

  return (
    <div className="player-game-container">

      {/* Tickets Grid */}
      <div className="tickets-section">
        <div className="tickets-container-new">
          {tickets.map((ticket, index) => (
            <div key={index} className="ticket-wrapper">
              <div className="ticket-header">
                <span className="ticket-number">Ticket {index + 1}</span>
                {latestNumber && (
                  <span 
                    key={latestNumberKey} 
                    className="ticket-latest-number new-number"
                  >
                    {latestNumber}
                  </span>
                )}
                {drawn.length > 0 && (
                  <span className="ticket-recent-numbers">
                    {drawn.slice(-5).join(' ')}
                  </span>
                )}
              </div>
              <div className="ticket-grid-new">
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

      {/* Voice Control for Players */}
      {voiceService.isSupported() && (
        <div className="bg-white rounded-lg p-2 mb-2 border border-gray-300">
          <button 
            className={`w-full py-2 px-3 rounded-lg font-bold text-sm transition-colors ${
              voiceEnabled 
                ? 'bg-green-500 text-white hover:bg-green-600' 
                : 'bg-gray-400 text-gray-700 hover:bg-gray-500'
            }`}
            onClick={onVoiceToggle}
          >
            {voiceEnabled ? '🔊 Voice ON' : '🔇 Voice OFF'}
          </button>
        </div>
      )}

      {/* Prize Claim Buttons */}
      <div className="prize-section">
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
          
          <button 
            className={`prize-btn house-btn ${winners.house ? 'claimed' : ''} ${isDisabled ? 'disabled' : ''}`}
            onClick={() => !isDisabled && handleClaim('house')}
            disabled={!!winners.house || isDisabled}
          >
            <div className="prize-text">Full House</div>
            <div className="prize-amount">₹{gamePrizes.house}</div>
          </button>
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
  const [marked, setMarked] = useState({}); // Object with ticketIndex as key and array of marked numbers as value
  const [gameStarted, setGameStarted] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [gameEndInfo, setGameEndInfo] = useState(null);
  const [gameCancelled, setGameCancelled] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  
  // Prize and winner tracking
  const [gamePrizes, setGamePrizes] = useState({
    topLine: 100,
    middleLine: 100,
    bottomLine: 100,
    corners: 150,
    house: 500
  });
  const [winners, setWinners] = useState({
    topLine: null,
    middleLine: null,
    bottomLine: null,
    corners: null,
    house: null
  });
  const [myWinnings, setMyWinnings] = useState([]);
  const [pricePerTicket, setPricePerTicket] = useState(50);
  
  // Auto-draw functionality for host
  const [autoDrawEnabled, setAutoDrawEnabled] = useState(false);
  const [autoDrawInterval, setAutoDrawInterval] = useState(5); // seconds
  const [autoDrawTimer, setAutoDrawTimer] = useState(null);
  const [nextDrawCountdown, setNextDrawCountdown] = useState(0);
  
  // Voice announcement controls
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [voiceStatus, setVoiceStatus] = useState(voiceService.getStatus());
  const [voiceAnnouncementInProgress, setVoiceAnnouncementInProgress] = useState(false);
  const [voiceCountdown, setVoiceCountdown] = useState(0);
  
  // Connection status
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const [hostDisconnected, setHostDisconnected] = useState(false);
  const [hostDisconnectTimer, setHostDisconnectTimer] = useState(0);

  // Request game info on mount
  useEffect(() => {
    if (socket && gameId) {
      socket.emit('get_game_info', { gameId }, () => {});
    }
  }, [socket, gameId]);

  // // Announce game start
  // useEffect(() => {
  //   if (gameStarted && voiceEnabled && voiceService.isSupported()) {
  //     // Only announce once when game starts
  //     const hasAnnounced = sessionStorage.getItem(`game-start-announced-${gameId}`);
  //     if (!hasAnnounced) {
  //       voiceService.announceEvent('Welcome to Tambola! The game has started. Good luck everyone!');
  //       sessionStorage.setItem(`game-start-announced-${gameId}`, 'true');
  //     }
  //   }
  // }, [gameStarted, voiceEnabled, gameId]);

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

    // Handle host disconnection
    socket.on('host_disconnected', ({ reason, gameWillEndIn }) => {
      setHostDisconnected(true);
      if (gameWillEndIn > 0) {
        setHostDisconnectTimer(Math.round(gameWillEndIn / 1000));
        
        // Start countdown timer
        const timer = setInterval(() => {
          setHostDisconnectTimer(prev => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    });

    socket.on('host_reconnected', ({ hostName }) => {
      setHostDisconnected(false);
      setHostDisconnectTimer(0);
    });

    const onNumber = ({ number }) => {
      setDrawn((prev) => [...prev, number]);
      setLatest(number);
      setLatestNumberKey(prev => prev + 1); // Trigger animation by changing key
      setGameStarted(true);
      
      // Announce the number with voice and shorter gap
      if (voiceEnabled && voiceService.isSupported()) {
        setVoiceAnnouncementInProgress(true);
        voiceService.announceNumber(number);
        
        // Start 5-second countdown after announcement (shorter since no multi-part speech)
        setVoiceCountdown(5);
        const countdownTimer = setInterval(() => {
          setVoiceCountdown(prev => {
            if (prev <= 1) {
              clearInterval(countdownTimer);
              setVoiceAnnouncementInProgress(false);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    };
    
    const onClaimSuccess = ({ playerId, playerName, prizeMessage, claimType, lineIndex, prizeAmount }) => {
      alert(`🎉 Amazing! ${playerName} won ${prizeMessage}! 🎉`);
      
      // Announce the win with voice
      if (voiceEnabled && voiceService.isSupported()) {
        voiceService.announceEvent(`Congratulations ${playerName}! ${prizeMessage} claimed!`);
      }
      
      // Update winners state
      if (claimType === 'line') {
        const lineTypes = ['topLine', 'middleLine', 'bottomLine'];
        const lineType = lineTypes[lineIndex || 0];
        setWinners(prev => ({ ...prev, [lineType]: playerName }));
      } else {
        setWinners(prev => ({ ...prev, [claimType]: playerName }));
      }
      
      // If this player won, add to their winnings
      if (playerId === socket.id) {
        setMyWinnings(prev => [...prev, { prize: prizeMessage, amount: prizeAmount }]);
      }
      
      // Delay auto-draw timer if host and auto-draw is enabled
      if (isHost && autoDrawEnabled) {
        delayAutoDraw();
      }
    };

    const onClaimFailed = ({ reason }) => {
      alert(`😅 Oops! ${reason} - Keep trying! 💪`);
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

    const onGameInfo = ({ prizes, winners: gameWinners, pricePerTicket: gamePrice }) => {
      if (prizes) setGamePrizes(prizes);
      if (gameWinners) setWinners(gameWinners);
      if (gamePrice) setPricePerTicket(gamePrice);
    };

    socket.on('number_drawn', onNumber);
    socket.on('claim_success', onClaimSuccess);
    socket.on('claim_failed', onClaimFailed);
    socket.on('game_completed', onGameCompleted);
    socket.on('game_cancelled', onGameCancelled);
    socket.on('game_info', onGameInfo);
    
    return () => {
      socket.off('heartbeat');
      socket.off('connect');
      socket.off('disconnect');
      socket.off('reconnect');
      socket.off('host_disconnected');
      socket.off('host_reconnected');
      socket.off('number_drawn', onNumber);
      socket.off('claim_success', onClaimSuccess);
      socket.off('claim_failed', onClaimFailed);
      socket.off('game_completed', onGameCompleted);
      socket.off('game_cancelled', onGameCancelled);
      socket.off('game_info', onGameInfo);
    };
  }, [socket]);

  // Redirect to lobby when game is cancelled
  useEffect(() => {
    if (gameCancelled && onBackToLobby) {
      const timer = setTimeout(() => {
        onBackToLobby();
      }, 3000); // 3 second delay
      
      return () => clearTimeout(timer);
    }
  }, [gameCancelled, onBackToLobby]);

  const drawRandom = () => socket.emit('draw_number', { gameId }, () => {});
  const drawSpecific = (n) => socket.emit('draw_number', { gameId, number: n }, () => {});

  // Auto-draw functionality
  const startAutoDraw = () => {
    if (autoDrawTimer) {
      clearInterval(autoDrawTimer);
    }
    
    // Calculate effective interval: base interval + 5 seconds for voice announcement
    const effectiveInterval = voiceEnabled ? Math.max(autoDrawInterval, 10) : autoDrawInterval; // Minimum 10 seconds when voice is enabled
    setNextDrawCountdown(effectiveInterval);
    
    const timer = setInterval(() => {
      if (!gameCompleted && !gameCancelled && !voiceAnnouncementInProgress) {
        drawRandom();
        setNextDrawCountdown(effectiveInterval); // Reset countdown after each draw
      } else {
        stopAutoDraw();
      }
    }, effectiveInterval * 1000);
    
    // Countdown timer
    const countdownTimer = setInterval(() => {
      setNextDrawCountdown(prev => {
        if (prev <= 1) {
          return effectiveInterval; // Reset to interval when reaching 0
        }
        return prev - 1;
      });
    }, 1000);
    
    setAutoDrawTimer({ main: timer, countdown: countdownTimer });
    setAutoDrawEnabled(true);
  };

  const stopAutoDraw = () => {
    if (autoDrawTimer) {
      clearInterval(autoDrawTimer.main);
      clearInterval(autoDrawTimer.countdown);
      setAutoDrawTimer(null);
    }
    setAutoDrawEnabled(false);
    setNextDrawCountdown(0);
  };

  const delayAutoDraw = () => {
    if (autoDrawTimer && autoDrawEnabled) {
      // Extend the countdown by 3x the normal interval
      const delayTime = autoDrawInterval * 3;
      setNextDrawCountdown(delayTime);
    }
  };

  // Cleanup auto-draw on unmount or game end
  useEffect(() => {
    if (gameCompleted || gameCancelled) {
      stopAutoDraw();
    }
  }, [gameCompleted, gameCancelled]);

  useEffect(() => {
    return () => {
      if (autoDrawTimer) {
        clearInterval(autoDrawTimer.main);
        clearInterval(autoDrawTimer.countdown);
      }
    };
  }, [autoDrawTimer]);
  
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
    const payload = { gameId, claimType: type };
    if (type === 'line' && lineIndex !== null) {
      payload.lines = [lineIndex];
    }
    // Remove ticketIndex - let server scan all tickets
    socket.emit('claim', payload, () => {});
  };

  const cancelGame = () => {
    if (confirm('Are you sure you want to cancel the game? This will end the game for all players.')) {
      socket.emit('cancel_game', { gameId }, () => {});
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Connection Status Indicator */}
      {connectionStatus !== 'connected' && (
        <div className="bg-red-100 border-2 border-red-400 rounded-lg p-3 mx-4 mt-2">
          <div className="text-red-800 font-bold text-center">
            ⚠️ Connection Lost - Attempting to reconnect...
          </div>
        </div>
      )}

      {/* Host Disconnection Warning */}
      {hostDisconnected && !isHost && (
        <div className="bg-orange-100 border-2 border-orange-400 rounded-lg p-3 mx-4 mt-2">
          <div className="text-orange-800 font-bold text-center">
            ⚠️ Host Disconnected
          </div>
          {hostDisconnectTimer > 0 && (
            <div className="text-orange-600 text-sm text-center mt-1">
              Game will end in: <span className="font-bold text-lg">{Math.floor(hostDisconnectTimer / 60)}:{(hostDisconnectTimer % 60).toString().padStart(2, '0')}</span>
            </div>
          )}
          <div className="text-orange-500 text-xs text-center mt-1">
            Waiting for host to reconnect...
          </div>
        </div>
      )}

      {/* Game completed notification */}
      {gameCompleted && gameEndInfo && (
        <div className="bg-green-100 border-4 border-green-500 rounded-lg p-6 text-center m-4">
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
              {gameEndInfo.winners.house && (
                <p>🎉 Full House: <span className="font-bold">{gameEndInfo.winners.house}</span></p>
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
        <div className="bg-red-100 border-4 border-red-500 rounded-lg p-6 text-center m-4">
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
      {!isHost && gameCompleted && (
        <div className="bg-green-100 border-2 border-green-400 rounded-lg p-3 mx-4 mt-4">
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
        <div className="flex-1 overflow-y-auto p-4 space-y-4 landscape:p-2 landscape:space-y-2">
          {isHost ? (
            <>
              {/* Host Controls */}
              <div className="space-y-3">
                {/* Manual Draw Button */}
                <button 
                  className="btn-primary w-full" 
                  onClick={drawRandom}
                  disabled={gameCompleted || autoDrawEnabled || voiceAnnouncementInProgress || connectionStatus !== 'connected'}
                  style={{ opacity: (gameCompleted || autoDrawEnabled || voiceAnnouncementInProgress || connectionStatus !== 'connected') ? 0.5 : 1 }}
                >
                  {gameCompleted ? 'Game Completed' : 
                   connectionStatus !== 'connected' ? 'Connection Lost' :
                   autoDrawEnabled ? 'Auto-Draw Active' : 
                   voiceAnnouncementInProgress ? `Voice Announcement (${voiceCountdown}s)` : 
                   '🎲 Draw Random Number'}
                </button>

                {/* Voice Announcement Status */}
                {voiceAnnouncementInProgress && voiceEnabled && (
                  <div className="bg-orange-100 border-2 border-orange-400 rounded-lg p-3 text-center">
                    <div className="text-orange-800 font-bold">🎤 Voice Announcement in Progress</div>
                    <div className="text-orange-600 text-sm">Next draw available in: <span className="font-bold text-lg">{voiceCountdown}s</span></div>
                    <div className="text-orange-500 text-xs mt-1">Please wait for the announcement to complete</div>
                  </div>
                )}

                {/* Auto-Draw Controls */}
                {!gameCompleted && !gameCancelled && (
                  <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
                    <h3 className="font-bold text-blue-800 mb-3">⏰ Auto-Draw</h3>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <label className="text-blue-700 font-medium">
                          Interval: {voiceEnabled && <span className="text-xs text-orange-600">(includes 5s voice gap)</span>}
                        </label>
                        <select
                          className="border border-blue-400 rounded px-3 py-1 font-bold"
                          value={autoDrawInterval}
                          onChange={(e) => setAutoDrawInterval(parseInt(e.target.value))}
                          disabled={autoDrawEnabled}
                        >
                          {voiceEnabled ? (
                            <>
                              <option value={10}>10 seconds (Voice + 5s)</option>
                              <option value={15}>15 seconds (Voice + 10s)</option>
                              <option value={20}>20 seconds (Voice + 15s)</option>
                              <option value={30}>30 seconds (Voice + 25s)</option>
                              <option value={60}>1 minute (Voice + 55s)</option>
                            </>
                          ) : (
                            <>
                              <option value={3}>3 seconds</option>
                              <option value={5}>5 seconds</option>
                              <option value={10}>10 seconds</option>
                              <option value={15}>15 seconds</option>
                              <option value={30}>30 seconds</option>
                              <option value={60}>1 minute</option>
                            </>
                          )}
                        </select>
                      </div>
                      
                      <div className="flex space-x-2">
                        <button
                          className={`flex-1 py-2 px-4 rounded-lg font-bold transition ${
                            autoDrawEnabled 
                              ? 'bg-red-500 text-white hover:bg-red-600' 
                              : 'bg-green-500 text-white hover:bg-green-600'
                          }`}
                          onClick={autoDrawEnabled ? stopAutoDraw : startAutoDraw}
                        >
                          {autoDrawEnabled ? '⏸️ Stop Auto-Draw' : '▶️ Start Auto-Draw'}
                        </button>
                      </div>
                      
                      {/* Countdown Display */}
                      {autoDrawEnabled && (
                        <div className="text-center">
                          <div className="bg-blue-100 border border-blue-400 rounded-lg py-2 px-4">
                            <span className="text-blue-800 font-bold">
                              Next draw in: <span className="text-xl">{nextDrawCountdown}s</span>
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Voice Controls */}
                {voiceService.isSupported() && (
                  <div className="bg-white rounded-lg p-4 border-2 border-purple-300">
                    <h4 className="font-bold text-purple-800 mb-3 text-center">🔊 Voice Announcements</h4>
                    <div className="space-y-3">
                      <button 
                        className={`w-full py-2 px-4 rounded-lg font-bold transition-colors ${
                          voiceEnabled 
                            ? 'bg-green-500 text-white hover:bg-green-600' 
                            : 'bg-gray-400 text-gray-700 hover:bg-gray-500'
                        }`}
                        onClick={() => {
                          const newState = voiceService.toggle();
                          setVoiceEnabled(newState);
                          setVoiceStatus(voiceService.getStatus());
                        }}
                      >
                        {voiceEnabled ? '🔊 Voice ON' : '🔇 Voice OFF'}
                      </button>
                      
                      {voiceEnabled && (
                        <div className="space-y-2">
                          <div className="text-sm text-gray-600">
                            <div>Voice: {voiceStatus.currentVoice}</div>
                            <div>Language: {voiceStatus.currentVoiceLang}</div>
                            <div>Speed: {Math.round(voiceStatus.rate * 100)}%</div>
                          </div>
                          
                          {/* Voice Selection Dropdown */}
                          {voiceStatus.availableVoices && voiceStatus.availableVoices.length > 1 && (
                            <div>
                              <label className="text-xs text-gray-600 block mb-1">Select Voice:</label>
                              <select 
                                className="w-full py-1 px-2 border border-gray-300 rounded text-sm"
                                value={voiceStatus.currentVoice}
                                onChange={(e) => {
                                  voiceService.setVoice(e.target.value);
                                  setVoiceStatus(voiceService.getStatus());
                                }}
                              >
                                {voiceStatus.availableVoices.map((voice) => (
                                  <option key={voice.name} value={voice.name}>
                                    {voice.name} {voice.lang.includes('en-IN') ? '🇮🇳' : voice.lang.includes('en-GB') ? '🇬🇧' : voice.lang.includes('en-US') ? '🇺🇸' : ''}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                          
                          <div className="flex gap-2">
                            <button 
                              className="flex-1 py-1 px-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                              onClick={() => {
                                voiceService.setRate(Math.max(0.5, voiceStatus.rate - 0.1));
                                setVoiceStatus(voiceService.getStatus());
                              }}
                            >
                              Slower
                            </button>
                            <button 
                              className="flex-1 py-1 px-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                              onClick={() => {
                                voiceService.setRate(Math.min(1.5, voiceStatus.rate + 0.1));
                                setVoiceStatus(voiceService.getStatus());
                              }}
                            >
                              Faster
                            </button>
                          </div>
                          
                          <div className="flex gap-2">
                            <button 
                              className="flex-1 py-1 px-2 bg-purple-500 text-white rounded text-sm hover:bg-purple-600"
                              onClick={() => voiceService.announceNumber(Math.floor(Math.random() * 90) + 1)}
                            >
                              🎤 Test Voice
                            </button>
                            <button 
                              className="py-1 px-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                              onClick={() => voiceService.testVoice()}
                              title="Simple voice test"
                            >
                              🔧 Debug
                            </button>
                            <button 
                              className="py-1 px-2 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                              onClick={() => setVoiceStatus(voiceService.refreshVoices())}
                              title="Refresh available voices"
                            >
                              🔄
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Cancel Game Button */}
                {!gameCompleted && !gameCancelled && (
                  <button 
                    className="btn-danger w-full" 
                    onClick={cancelGame}
                  >
                    ❌ Cancel Game
                  </button>
                )}
              </div>

              {/* Number Grid - View Only for Host */}
              <div className="mt-4">
                <h3 className="text-center font-bold text-purple-800 mb-3" style={{ fontFamily: 'Fredoka One' }}>
                  📊 Number Grid
                </h3>
                <NumberGrid drawnNumbers={drawn} onClick={null} isClickable={false} />
              </div>
            </>
          ) : (
            !isHost && tickets && tickets.length > 0 && !gameCompleted && (
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
                connectionStatus={connectionStatus}
                hostDisconnected={hostDisconnected}
              />
            )
          )}
        </div>
      )}


    </div>
  );
}

export default GameBoard; 