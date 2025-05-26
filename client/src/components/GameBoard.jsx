import React, { useEffect, useState } from 'react';

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

function AllTicketsView({ tickets, marked, onCell, latestNumber }) {
  if (!tickets || tickets.length === 0) return null;

  return (
    <div className="all-tickets-container">
      {tickets.length === 1 ? (
        // Single ticket - full width
        <div className="single-ticket-view">
          <TicketGrid
            ticket={tickets[0]}
            marked={marked[0] || []}
            onCell={(num) => onCell(num, 0)}
            latestNumber={latestNumber}
            ticketIndex={0}
            totalTickets={1}
          />
        </div>
      ) : (
        // Multiple tickets - grid layout
        <div className="multiple-tickets-view">
          <div className="tickets-grid">
            {tickets.map((ticket, index) => (
              <TicketGrid
                key={index}
                ticket={ticket}
                marked={marked[index] || []}
                onCell={(num) => onCell(num, index)}
                latestNumber={latestNumber}
                ticketIndex={index}
                totalTickets={tickets.length}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function GameBoard({ socket, gameId, isHost, tickets: initialTickets, onBackToLobby }) {
  // Multiple tickets support enabled
  const [drawn, setDrawn] = useState([]);
  const [latest, setLatest] = useState(null);
  const [tickets, setTickets] = useState(initialTickets || []);
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

  // Request game info on mount
  useEffect(() => {
    if (socket && gameId) {
      socket.emit('get_game_info', { gameId }, () => {});
    }
  }, [socket, gameId]);

  // DEBUG – remove later
  useEffect(() => {
    console.log('GB props:', { gameId, isHost, initialTickets });
    console.log('tickets state:', tickets);
    console.log('socket in GameBoard:', socket);
    if (socket) {
      console.log('socket id:', socket.id);
      window.socket = socket;            // expose for manual testing
    }
  }, [initialTickets, tickets]);

  useEffect(() => {
    const onNumber = ({ number }) => {
      setDrawn((prev) => [...prev, number]);
      setLatest(number);
      setGameStarted(true);
    };
    
    const onClaimSuccess = ({ playerId, playerName, prizeMessage, claimType, lineIndex, prizeAmount }) => {
      alert(`🎉 Amazing! ${playerName} won ${prizeMessage}! 🎉`);
      
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
    
    setNextDrawCountdown(autoDrawInterval);
    
    const timer = setInterval(() => {
      if (!gameCompleted && !gameCancelled) {
        drawRandom();
        setNextDrawCountdown(autoDrawInterval); // Reset countdown after each draw
      } else {
        stopAutoDraw();
      }
    }, autoDrawInterval * 1000);
    
    // Countdown timer
    const countdownTimer = setInterval(() => {
      setNextDrawCountdown(prev => {
        if (prev <= 1) {
          return autoDrawInterval; // Reset to interval when reaching 0
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

      {/* Game not started notification for players */}
      {!isHost && !gameStarted && !gameCompleted && !gameCancelled && (
        <div className="bg-blue-100 border-2 border-blue-400 rounded-lg p-3 text-center">
          <p className="text-blue-800 font-bold">⏳ Waiting for host to draw the first number...</p>
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
                  disabled={gameCompleted || autoDrawEnabled}
                  style={{ opacity: (gameCompleted || autoDrawEnabled) ? 0.5 : 1 }}
                >
                  {gameCompleted ? 'Game Completed' : autoDrawEnabled ? 'Auto-Draw Active' : '🎲 Draw Random Number'}
                </button>

                {/* Auto-Draw Controls */}
                {!gameCompleted && !gameCancelled && (
                  <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
                    <h3 className="font-bold text-blue-800 mb-3">⏰ Auto-Draw</h3>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <label className="text-blue-700 font-medium">Interval:</label>
                        <select
                          className="border border-blue-400 rounded px-3 py-1 font-bold"
                          value={autoDrawInterval}
                          onChange={(e) => setAutoDrawInterval(parseInt(e.target.value))}
                          disabled={autoDrawEnabled}
                        >
                          <option value={3}>3 seconds</option>
                          <option value={5}>5 seconds</option>
                          <option value={10}>10 seconds</option>
                          <option value={15}>15 seconds</option>
                          <option value={30}>30 seconds</option>
                          <option value={60}>1 minute</option>
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
            (() => {
              console.log('Render check:', { tickets, ticketsLength: tickets?.length, gameCompleted, isHost });
              return !isHost && tickets && tickets.length > 0 && !gameCompleted;
            })() && (
              <>
                {/* Portrait layout - stacked */}
                <div className="block landscape:hidden">
                  <AllTicketsView
                    tickets={tickets}
                    marked={marked}
                    onCell={toggleMark}
                    latestNumber={latest}
                  />
                  
                  {/* Claim buttons - below tickets */}
                  <div className="mt-4 px-2">
                    <div className="bg-white border-2 border-purple-400 rounded-lg p-3 shadow-lg">
                      <h3 className="text-center font-bold text-purple-800 mb-3 text-sm">
                        🏆 Claim Prize 🏆
                      </h3>
                      <div className="grid grid-cols-3 gap-2">
                        <button 
                          className={`btn-claim-compact text-xs py-2 ${winners.topLine ? 'btn-claimed' : 'btn-primary'}`}
                          onClick={() => handleClaim('line', 0)}
                          disabled={!!winners.topLine}
                        >
                          <div className="text-center">
                            <div>🔥 Top</div>
                            <div className="text-xs">₹{gamePrizes.topLine}</div>
                          </div>
                        </button>
                        <button 
                          className={`btn-claim-compact text-xs py-2 ${winners.middleLine ? 'btn-claimed' : 'btn-primary'}`}
                          onClick={() => handleClaim('line', 1)}
                          disabled={!!winners.middleLine}
                        >
                          <div className="text-center">
                            <div>⭐ Mid</div>
                            <div className="text-xs">₹{gamePrizes.middleLine}</div>
                          </div>
                        </button>
                        <button 
                          className={`btn-claim-compact text-xs py-2 ${winners.bottomLine ? 'btn-claimed' : 'btn-primary'}`}
                          onClick={() => handleClaim('line', 2)}
                          disabled={!!winners.bottomLine}
                        >
                          <div className="text-center">
                            <div>💫 Bot</div>
                            <div className="text-xs">₹{gamePrizes.bottomLine}</div>
                          </div>
                        </button>
                        <button 
                          className={`btn-claim-compact text-xs py-2 ${winners.corners ? 'btn-claimed' : 'btn-secondary'}`}
                          onClick={() => handleClaim('corners')}
                          disabled={!!winners.corners}
                        >
                          <div className="text-center">
                            <div>🔸 Corner</div>
                            <div className="text-xs">₹{gamePrizes.corners}</div>
                          </div>
                        </button>
                        <button 
                          className={`btn-claim-compact text-xs py-2 col-span-2 ${winners.house ? 'btn-claimed' : 'btn-danger'}`}
                          onClick={() => handleClaim('house')}
                          disabled={!!winners.house}
                        >
                          <div className="text-center">
                            <div>🎉 Full House</div>
                            <div className="text-xs">₹{gamePrizes.house}</div>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Landscape layout - tickets with buttons below */}
                <div className="hidden landscape:block">
                  <AllTicketsView
                    tickets={tickets}
                    marked={marked}
                    onCell={toggleMark}
                    latestNumber={latest}
                  />
                  
                  {/* Claim buttons - below tickets for landscape */}
                  <div className="mt-4 px-2">
                    <div className="bg-white border-2 border-purple-400 rounded-lg p-3 shadow-lg">
                      <h3 className="text-center font-bold text-purple-800 mb-3 text-sm">
                        🏆 Claim Prize 🏆
                      </h3>
                      <div className="grid grid-cols-5 gap-2">
                        <button 
                          className={`btn-claim-compact text-xs py-2 ${winners.topLine ? 'btn-claimed' : 'btn-primary'}`}
                          onClick={() => handleClaim('line', 0)}
                          disabled={!!winners.topLine}
                        >
                          <div className="text-center">
                            <div>🔥 Top</div>
                            <div className="text-xs">₹{gamePrizes.topLine}</div>
                          </div>
                        </button>
                        <button 
                          className={`btn-claim-compact text-xs py-2 ${winners.middleLine ? 'btn-claimed' : 'btn-primary'}`}
                          onClick={() => handleClaim('line', 1)}
                          disabled={!!winners.middleLine}
                        >
                          <div className="text-center">
                            <div>⭐ Mid</div>
                            <div className="text-xs">₹{gamePrizes.middleLine}</div>
                          </div>
                        </button>
                        <button 
                          className={`btn-claim-compact text-xs py-2 ${winners.bottomLine ? 'btn-claimed' : 'btn-primary'}`}
                          onClick={() => handleClaim('line', 2)}
                          disabled={!!winners.bottomLine}
                        >
                          <div className="text-center">
                            <div>💫 Bot</div>
                            <div className="text-xs">₹{gamePrizes.bottomLine}</div>
                          </div>
                        </button>
                        <button 
                          className={`btn-claim-compact text-xs py-2 ${winners.corners ? 'btn-claimed' : 'btn-secondary'}`}
                          onClick={() => handleClaim('corners')}
                          disabled={!!winners.corners}
                        >
                          <div className="text-center">
                            <div>🔸 Corner</div>
                            <div className="text-xs">₹{gamePrizes.corners}</div>
                          </div>
                        </button>
                        <button 
                          className={`btn-claim-compact text-xs py-2 ${winners.house ? 'btn-claimed' : 'btn-danger'}`}
                          onClick={() => handleClaim('house')}
                          disabled={!!winners.house}
                        >
                          <div className="text-center">
                            <div>🎉 House</div>
                            <div className="text-xs">₹{gamePrizes.house}</div>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )
          )}
        </div>
      )}

      {/* footer */}
      {!gameCancelled && (
        <div className="bg-gradient-to-r from-green-500 to-blue-500 py-2 flex justify-center gap-2">
          {drawn.slice(-5).map((n, i, arr) => (
            <span key={i} className={`px-2 py-1 rounded-full font-bold ${i === arr.length - 1 ? 'bg-yellow-200' : 'bg-white'}`}>{n}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export default GameBoard; 