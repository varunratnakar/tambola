import React, { useEffect, useState } from 'react';

function NumberGrid({ drawnNumbers, onNumberClick }) {
  const numbers = Array.from({ length: 90 }, (_, i) => i + 1);
  return (
    <div className="grid grid-cols-5 sm:grid-cols-10 gap-1 mb-4 select-none">
      {numbers.map((num) => (
        <div
          key={num}
          onClick={() => onNumberClick && onNumberClick(num)}
          className={`w-10 h-10 flex items-center justify-center rounded cursor-pointer text-sm sm:text-base ${drawnNumbers.includes(num) ? 'bg-blue-600 text-white cursor-default' : 'bg-gray-200 hover:bg-gray-300'}`}
        >
          {num}
        </div>
      ))}
    </div>
  );
}

function TicketGrid({ ticket, markedNumbers, onCellClick }) {
  return (
    <table className="mx-auto mt-4 border-collapse">
      <tbody>
        {ticket.map((row, rIdx) => (
          <tr key={rIdx}>
            {row.map((num, cIdx) => {
              const isMarked = markedNumbers.includes(num);
              return (
                <td
                  key={cIdx}
                  onClick={() => num && onCellClick(num)}
                  className={`w-10 h-10 border text-center text-sm sm:text-base ${num ? 'cursor-pointer' : ''} ${isMarked ? 'bg-green-600 text-white font-bold' : 'bg-white'}`}
                >
                  {num || ''}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function GameBoard({ socket, ticket, gameId, isHost }) {
  const [drawnNumbers, setDrawnNumbers] = useState([]);
  const [lastNumber, setLastNumber] = useState(null);
  const [markedNumbers, setMarkedNumbers] = useState([]);

  useEffect(() => {
    socket.on('number_drawn', ({ number }) => {
      setDrawnNumbers((prev) => [...prev, number]);
      setLastNumber(number);
    });

    socket.on('claim_success', ({ playerId, claimType }) => {
      alert(`Player ${playerId} won ${claimType}!`);
    });

    socket.on('claim_failed', ({ reason }) => {
      alert(`Claim failed: ${reason}`);
    });

    socket.on('game_ended', () => {
      alert('Game ended');
    });

    return () => {
      socket.off('number_drawn');
      socket.off('claim_success');
      socket.off('claim_failed');
      socket.off('game_ended');
    };
  }, [socket]);

  const handleDrawRandom = () => {
    socket.emit('draw_number', { gameId }, (res) => {
      if (res.status !== 'ok') {
        alert(res.message);
      }
    });
  };

  const handleNumberGridClick = (num) => {
    if (drawnNumbers.includes(num)) return;
    socket.emit('draw_number', { gameId, number: num }, (res) => {
      if (res.status !== 'ok') {
        alert(res.message);
      }
    });
  };

  const handleTicketClick = (num) => {
    setMarkedNumbers((prev) =>
      prev.includes(num) ? prev.filter((n) => n !== num) : [...prev, num]
    );
  };

  const handleClaimLine = (lineIdx) => {
    socket.emit('claim', { gameId, claimType: 'line', lines: [lineIdx] }, (res) => {
      if (!res.valid) {
        alert(res.reason || 'Invalid claim');
      }
    });
  };

  const handleClaimHouse = () => {
    socket.emit('claim', { gameId, claimType: 'house' }, (res) => {
      if (!res.valid) {
        alert(res.reason || 'Invalid claim');
      }
    });
  };

  return (
    <div>
      <h2>Game ID: {gameId}</h2>
      {!ticket ? (
        <p>Loading ticket...</p>
      ) : (
        <>
      {isHost && (
        <>
          <button className="mb-2 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700" onClick={handleDrawRandom}>
            Draw Random Number
          </button>
          <NumberGrid
            drawnNumbers={drawnNumbers}
            onNumberClick={handleNumberGridClick}
          />
        </>
      )}
      {lastNumber && <h3 className="text-xl font-semibold mb-2">Last Number: {lastNumber}</h3>}
      <p className="mb-2">Last Numbers:&nbsp;{drawnNumbers.slice(-3).join(', ')}</p>

      {!isHost && (
        <>
          <TicketGrid
            ticket={ticket}
            markedNumbers={markedNumbers}
            onCellClick={handleTicketClick}
          />

          <div className="mt-4 flex flex-wrap gap-2 justify-center">
            <button className="bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700" onClick={() => handleClaimLine(0)}>
              Claim Top Line
            </button>
            <button className="bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700" onClick={() => handleClaimLine(1)}>
              Claim Middle Line
            </button>
            <button className="bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700" onClick={() => handleClaimLine(2)}>
              Claim Bottom Line
            </button>
            <button className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700" onClick={handleClaimHouse}>
              Claim Full House
            </button>
          </div>
        </>
      )}
      </>
      )}
    </div>
  );
}

export default GameBoard; 