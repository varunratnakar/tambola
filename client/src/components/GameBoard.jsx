import React, { useEffect, useState } from 'react';

function NumberGrid({ drawnNumbers, onClick }) {
  const nums = Array.from({ length: 90 }, (_, i) => i + 1);
  return (
    <div className="grid grid-cols-9 sm:grid-cols-10 gap-1">
      {nums.map((n) => (
        <div
          key={n}
          onClick={() => onClick && onClick(n)}
          className={`cell ${drawnNumbers.includes(n) ? 'cell-called' : 'cell-number'}`}
        >
          {n}
        </div>
      ))}
    </div>
  );
}

function TicketGrid({ ticket, marked, onCell, latestNumber }) {
  return (
    <div className="ticket-container">
      <div 
        className="bg-white border-4 border-gray-800 rounded-lg p-4 shadow-xl mx-auto relative"
        style={{
          width: 'var(--optimal-width-portrait)',
          maxWidth: '90vw' // Fallback for very small screens
        }}
      >
        {/* Latest number overlay */}
        {latestNumber && (
          <div 
            className="absolute top-2 left-5 flex items-center justify-center bounce-in animate-fade-out"
            style={{
              fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
              fontWeight: 'bold',
              color: '#dc2626',
              zIndex: 10,
              fontFamily: 'Fredoka One'
            }}
          >
            {latestNumber}
          </div>
        )}
        
        <h3 className="text-center font-bold text-gray-800 mb-3" 
            style={{ 
              fontFamily: 'Fredoka One',
              fontSize: 'clamp(0.875rem, 3vw, 1.5rem)'
            }}>
          🎫 TAMBOLA TICKET 🎫
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
                        ? 'bg-red-500 text-white' 
                        : 'bg-white text-gray-800 hover:bg-blue-50'
                    }
                  `}
                  style={{
                    fontSize: 'clamp(0.875rem, 2.5vw, 1.5rem)'
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

function GameBoard({ socket, gameId, isHost, ticket: initialTicket, onBackToLobby }) {
  const [drawn, setDrawn] = useState([]);
  const [latest, setLatest] = useState(null);
  const [ticket, setTicket] = useState(initialTicket || (isHost ? null : []));
  const [marked, setMarked] = useState([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [gameEndInfo, setGameEndInfo] = useState(null);
  const [gameCancelled, setGameCancelled] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // DEBUG – remove later
  useEffect(() => {
    console.log('GB props:', { gameId, isHost, initialTicket });
    console.log('socket in GameBoard:', socket);
    if (socket) {
      console.log('socket id:', socket.id);
      window.socket = socket;            // expose for manual testing
    }
  }, []);

  useEffect(() => {
    const onNumber = ({ number }) => {
      setDrawn((prev) => [...prev, number]);
      setLatest(number);
      setGameStarted(true);
    };
    
    const onClaimSuccess = ({ playerId, playerName, prizeMessage }) => {
      alert(`🎉 Amazing! ${playerName} won ${prizeMessage}! 🎉`);
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

    socket.on('number_drawn', onNumber);
    socket.on('claim_success', onClaimSuccess);
    socket.on('claim_failed', onClaimFailed);
    socket.on('game_completed', onGameCompleted);
    socket.on('game_cancelled', onGameCancelled);
    
    return () => {
      socket.off('number_drawn', onNumber);
      socket.off('claim_success', onClaimSuccess);
      socket.off('claim_failed', onClaimFailed);
      socket.off('game_completed', onGameCompleted);
      socket.off('game_cancelled', onGameCancelled);
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
  const toggleMark = (n) => setMarked((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]));
  
  const handleClaim = (type, lineIndex = null) => {
    const payload = { gameId, claimType: type };
    if (type === 'line' && lineIndex !== null) {
      payload.lines = [lineIndex];
    }
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

      {!gameCancelled && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 landscape:p-2 landscape:space-y-2">
          {isHost ? (
            <>
              <button 
                className="btn-primary w-full mb-3" 
                onClick={drawRandom}
                disabled={gameCompleted}
                style={{ opacity: gameCompleted ? 0.5 : 1 }}
              >
                {gameCompleted ? 'Game Completed' : 'Draw Random'}
              </button>
              {!gameCompleted && !gameCancelled && (
                <button 
                  className="btn-danger w-full mb-3" 
                  onClick={cancelGame}
                >
                  ❌ Cancel Game
                </button>
              )}
              <NumberGrid drawnNumbers={drawn} onClick={gameCompleted ? null : drawSpecific} />
            </>
          ) : (
            ticket && !gameCompleted && (
              <>
                {/* Portrait layout - stacked */}
                <div className="block landscape:hidden">
                  <TicketGrid ticket={ticket} marked={marked} onCell={toggleMark} latestNumber={latest} />
                  
                  <div className="claim-buttons-portrait space-y-2 mt-4">
                    <h3 className="text-center font-bold text-purple-800" 
                        style={{ 
                          fontFamily: 'Fredoka One',
                          fontSize: 'var(--button-font-size)'
                        }}>
                      🏆 Claim Prize 🏆
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        className="btn-primary" 
                        style={{
                          height: 'var(--button-height)',
                          fontSize: 'var(--button-font-size)',
                          padding: '12px 16px'
                        }}
                        onClick={() => handleClaim('line', 0)}
                      >
                        🔥 Top
                      </button>
                      <button 
                        className="btn-primary" 
                        style={{
                          height: 'var(--button-height)',
                          fontSize: 'var(--button-font-size)',
                          padding: '12px 16px'
                        }}
                        onClick={() => handleClaim('line', 1)}
                      >
                        ⭐ Mid
                      </button>
                      <button 
                        className="btn-primary" 
                        style={{
                          height: 'var(--button-height)',
                          fontSize: 'var(--button-font-size)',
                          padding: '12px 16px'
                        }}
                        onClick={() => handleClaim('line', 2)}
                      >
                        💫 Bot
                      </button>
                      <button 
                        className="btn-secondary" 
                        style={{
                          height: 'var(--button-height)',
                          fontSize: 'var(--button-font-size)',
                          padding: '12px 16px'
                        }}
                        onClick={() => handleClaim('corners')}
                      >
                        🔸 Corners
                      </button>
                      <button 
                        className="btn-danger col-span-2" 
                        style={{
                          height: 'var(--button-height)',
                          fontSize: 'var(--button-font-size)',
                          padding: '12px 16px'
                        }}
                        onClick={() => handleClaim('house')}
                      >
                        🎉 Full House
                      </button>
                    </div>
                  </div>
                </div>

                {/* Landscape layout - buttons on both sides */}
                <div className="hidden landscape:flex landscape:gap-4 landscape:items-start">
                  {/* Left side buttons - Lines */}
                  <div className="claim-buttons-landscape-left flex flex-col justify-start space-y-3">
                    <h3 className="text-center font-bold text-purple-800 mb-3" 
                        style={{ 
                          fontFamily: 'Fredoka One',
                          fontSize: 'var(--button-font-size)'
                        }}>
                      📏 Lines
                    </h3>
                    <div className="flex flex-col space-y-3">
                      <button 
                        className="btn-primary" 
                        style={{
                          height: 'var(--button-height)',
                          width: 'var(--button-width)',
                          fontSize: 'var(--button-font-size)',
                          padding: '12px 16px'
                        }}
                        onClick={() => handleClaim('line', 0)}
                      >
                        🔥 Top Line
                      </button>
                      <button 
                        className="btn-primary" 
                        style={{
                          height: 'var(--button-height)',
                          width: 'var(--button-width)',
                          fontSize: 'var(--button-font-size)',
                          padding: '12px 16px'
                        }}
                        onClick={() => handleClaim('line', 1)}
                      >
                        ⭐ Middle Line
                      </button>
                      <button 
                        className="btn-primary" 
                        style={{
                          height: 'var(--button-height)',
                          width: 'var(--button-width)',
                          fontSize: 'var(--button-font-size)',
                          padding: '12px 16px'
                        }}
                        onClick={() => handleClaim('line', 2)}
                      >
                        💫 Bottom Line
                      </button>
                    </div>
                  </div>

                  {/* Center - Ticket */}
                  <div className="flex-1">
                    <TicketGrid ticket={ticket} marked={marked} onCell={toggleMark} latestNumber={latest} />
                  </div>
                  
                  {/* Right side buttons - Corners & House */}
                  <div className="claim-buttons-landscape-right flex flex-col justify-start space-y-3">
                    <h3 className="text-center font-bold text-purple-800 mb-3" 
                        style={{ 
                          fontFamily: 'Fredoka One',
                          fontSize: 'var(--button-font-size)'
                        }}>
                      🏆 Special
                    </h3>
                    <div className="flex flex-col space-y-3">
                      <button 
                        className="btn-secondary" 
                        style={{
                          height: 'var(--button-height)',
                          width: 'var(--button-width)',
                          fontSize: 'var(--button-font-size)',
                          padding: '12px 16px'
                        }}
                        onClick={() => handleClaim('corners')}
                      >
                        🔸 Corners
                      </button>
                      <button 
                        className="btn-danger" 
                        style={{
                          height: 'var(--button-height)',
                          width: 'var(--button-width)',
                          fontSize: 'var(--button-font-size)',
                          padding: '12px 16px'
                        }}
                        onClick={() => handleClaim('house')}
                      >
                        🎉 Full House
                      </button>
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