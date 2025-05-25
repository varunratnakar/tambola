import React, { useEffect, useState } from 'react';

function NumberGrid({ drawnNumbers, onNumberClick }) {
  const numbers = Array.from({ length: 90 }, (_, i) => i + 1);
  return (
    <div className="space-y-4">
      <h3 className="text-2xl font-bold text-purple-800 text-center" style={{ fontFamily: 'Fredoka One' }}>
        🎯 Click a Number to Call! 🎯
      </h3>
      <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 p-4 bg-gradient-to-br from-purple-100 to-pink-100 rounded-3xl border-4 border-purple-300">
        {numbers.map((num) => (
          <div
            key={num}
            onClick={() => onNumberClick && onNumberClick(num)}
            className={`number-cell ${
              drawnNumbers.includes(num) ? 'number-cell-called' : 'number-cell-available'
            } ${drawnNumbers.includes(num) ? '' : 'hover:wiggle'}`}
          >
            {num}
          </div>
        ))}
      </div>
    </div>
  );
}

function TicketGrid({ ticket, markedNumbers, onCellClick }) {
  return (
    <div className="space-y-4">
      <h3 className="text-2xl font-bold text-blue-800 text-center" style={{ fontFamily: 'Fredoka One' }}>
        🎫 Your Magic Ticket! 🎫
      </h3>
      <div className="flex justify-center">
        <div className="bg-gradient-to-br from-blue-100 to-green-100 p-6 rounded-3xl border-4 border-blue-300 shadow-2xl">
          <table className="border-collapse">
            <tbody>
              {ticket.map((row, rIdx) => (
                <tr key={rIdx}>
                  {row.map((num, cIdx) => {
                    const isMarked = markedNumbers.includes(num);
                    return (
                      <td key={cIdx} className="p-1">
                        <div
                          onClick={() => num && onCellClick(num)}
                          className={`ticket-cell ${
                            isMarked ? 'ticket-cell-marked bounce-in' : 'ticket-cell-unmarked'
                          } ${num ? 'hover:wiggle' : ''}`}
                        >
                          {num || ''}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function GameBoard({ socket, ticket, gameId, isHost }) {
  const [drawnNumbers, setDrawnNumbers] = useState([]);
  const [lastNumber, setLastNumber] = useState(null);
  const [markedNumbers, setMarkedNumbers] = useState([]);
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    const onNumberDrawn = ({ number }) => {
      setDrawnNumbers((prev) => [...prev, number]);
      setLastNumber(number);
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 1000);
    };

    const onClaimSuccess = ({ playerId, claimType }) => {
      alert(`🎉 Amazing! Someone won ${claimType}! 🎉`);
    };

    const onClaimFailed = ({ reason }) => {
      alert(`😅 Oops! ${reason} - Keep trying! 💪`);
    };

    const onGameEnded = () => {
      alert('🎮 Game Over! Thanks for playing! 🌟');
    };

    socket.on('number_drawn', onNumberDrawn);
    socket.on('claim_success', onClaimSuccess);
    socket.on('claim_failed', onClaimFailed);
    socket.on('game_ended', onGameEnded);

    return () => {
      socket.off('number_drawn', onNumberDrawn);
      socket.off('claim_success', onClaimSuccess);
      socket.off('claim_failed', onClaimFailed);
      socket.off('game_ended', onGameEnded);
    };
  }, [socket]);

  const handleDrawRandom = () => {
    socket.emit('draw_number', { gameId }, (res) => {
      if (res.status !== 'ok') {
        alert(`😅 Oops! ${res.message}`);
      }
    });
  };

  const handleNumberGridClick = (num) => {
    if (drawnNumbers.includes(num)) return;
    socket.emit('draw_number', { gameId, number: num }, (res) => {
      if (res.status !== 'ok') {
        alert(`😅 Oops! ${res.message}`);
      }
    });
  };

  const handleTicketClick = (num) => {
    setMarkedNumbers((prev) =>
      prev.includes(num) ? prev.filter((n) => n !== num) : [...prev, num]
    );
  };

  const handleClaimLine = (lineIdx) => {
    const lineNames = ['Top', 'Middle', 'Bottom'];
    socket.emit('claim', { gameId, claimType: 'line', lines: [lineIdx] }, (res) => {
      // Alert is handled by socket event listener, no need for duplicate here
    });
  };

  const handleClaimHouse = () => {
    socket.emit('claim', { gameId, claimType: 'house' }, (res) => {
      // Alert is handled by socket event listener, no need for duplicate here
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-4xl font-extrabold text-yellow-300 mb-2 tracking-wider" style={{ fontFamily: 'Fredoka One' }}>
          🎮 Game Code: <span className="bg-white text-orange-700 px-4 py-1 rounded-2xl border-4 border-orange-400 inline-block shadow-md">
            {gameId || '---'}
          </span> 🎮
        </h2>
        {isHost && (
          <p className="text-yellow-200 font-bold text-lg">
            🌟 You're the Game Master! 🌟
          </p>
        )}
      </div>

      {isHost && (
        <div className="space-y-4">
          <div className="text-center">
            <button className="fun-button-orange" onClick={handleDrawRandom}>
              🎲 Draw Random Number! 🎲
            </button>
          </div>
          <NumberGrid
            drawnNumbers={drawnNumbers}
            onNumberClick={handleNumberGridClick}
          />
        </div>
      )}

      {lastNumber && (
        <div className={`text-center ${showCelebration ? 'bounce-in' : ''}`}>
          <div className="bg-gradient-to-r from-yellow-300 to-orange-400 rounded-3xl p-6 border-4 border-yellow-500 shadow-2xl">
            <h3 className="text-2xl font-bold text-orange-800 mb-2" style={{ fontFamily: 'Fredoka One' }}>
              🎊 Latest Number Called! 🎊
            </h3>
            <div className="text-6xl font-bold text-orange-900 pulse-glow" style={{ fontFamily: 'Fredoka One' }}>
              {lastNumber}
            </div>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-r from-green-100 to-blue-100 rounded-3xl p-4 border-4 border-green-300">
        <h4 className="text-lg font-bold text-green-800 text-center mb-2" style={{ fontFamily: 'Fredoka One' }}>
          📋 Last 5 Numbers Called:
        </h4>
        <div className="flex flex-wrap justify-center gap-2">
          {drawnNumbers.slice(-5).map((num, index) => (
            <span
              key={index}
              className="bg-gradient-to-r from-green-400 to-blue-400 text-white px-3 py-1 rounded-full font-bold text-sm bounce-in"
            >
              {num}
            </span>
          ))}
          {drawnNumbers.length > 5 && (
            <span className="text-green-600 font-bold">
              ... and {drawnNumbers.length - 5} more!
            </span>
          )}
        </div>
      </div>

      {!isHost && !ticket && (
        <p className="text-center text-purple-600 font-bold">Loading your ticket...</p>
      )}

      {!isHost && ticket && (
        <>
          <TicketGrid
            ticket={ticket}
            markedNumbers={markedNumbers}
            onCellClick={handleTicketClick}
          />

          <div className="space-y-4">
            <h3 className="text-2xl font-bold text-purple-800 text-center" style={{ fontFamily: 'Fredoka One' }}>
              🏆 Ready to Win? 🏆
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button className="fun-button text-sm py-2" onClick={() => handleClaimLine(0)}>
                🔥 Top Line!
              </button>
              <button className="fun-button text-sm py-2" onClick={() => handleClaimLine(1)}>
                ⭐ Middle Line!
              </button>
              <button className="fun-button text-sm py-2" onClick={() => handleClaimLine(2)}>
                💫 Bottom Line!
              </button>
              <button className="fun-button-orange text-sm py-2" onClick={handleClaimHouse}>
                🎉 FULL HOUSE! 🎉
              </button>
            </div>
            <div className="text-center">
              <p className="text-purple-600 font-bold text-sm">
                💡 Tip: Click numbers on your ticket to mark them! 💡
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default GameBoard; 