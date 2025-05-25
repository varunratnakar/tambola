import React, { useState } from 'react';
import { io } from 'socket.io-client';

const SERVER_URL =
  import.meta.env.VITE_SERVER_URL || `${window.location.protocol}//${window.location.hostname}:4000`;

const socket = io(SERVER_URL);

// Store latest ticket in a ref to avoid closure staleness
let latestTicket = null;

function Lobby({ onStart }) {
  const [mode, setMode] = useState('create'); // create or join
  const [name, setName] = useState('');
  const [gameIdInput, setGameIdInput] = useState('');
  const [ticket, setTicket] = useState(null);
  const [gameId, setGameId] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [players, setPlayers] = useState([]);
  const [error, setError] = useState(null);

  // Socket listeners
  React.useEffect(() => {
    socket.on('player_joined', ({ playerName }) => {
      setPlayers((prev) => [...prev, playerName]);
    });
    socket.on('game_started', () => {
      onStart({ socket, ticket, gameId, isHost });
    });

    return () => {
      socket.off('player_joined');
      socket.off('game_started');
    };
  }, [ticket, gameId, isHost, onStart]);

  const handleCreate = () => {
    socket.emit('create_game', { hostName: name }, (res) => {
      if (res.status === 'ok') {
        setGameId(res.gameId);
        latestTicket = res.ticket;
        setTicket(res.ticket);
        setIsHost(true);
        setPlayers([name || 'Host']);
      } else {
        setError(res.message);
      }
    });
  };

  const handleJoin = () => {
    socket.emit('join_game', { gameId: gameIdInput, playerName: name }, (res) => {
      if (res.status === 'ok') {
        // Save ticket but wait for 'game_started' broadcast before rendering GameBoard
        latestTicket = res.ticket;
        setTicket(res.ticket);
        setGameId(gameIdInput);
        setIsHost(false);
      } else {
        setError(res.message);
      }
    });
  };

  const handleStart = () => {
    socket.emit('start_game', { gameId }, (res) => {
      if (res.status === 'ok') {
        // Immediately transition host to game view to avoid race
        const hostTicket = latestTicket || ticket;
        onStart({ socket, ticket: hostTicket, gameId, isHost: true });
      } else {
        alert(res.message);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-purple-800 mb-2" style={{ fontFamily: 'Fredoka One' }}>
          🎮 Let's Play Together! 🎮
        </h2>
        <p className="text-purple-600 font-semibold">Enter your name and start the fun!</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-purple-800 font-bold mb-2 text-lg">
            👤 Your Super Cool Name:
          </label>
          <input
            className="w-full border-4 border-purple-300 rounded-2xl px-4 py-3 text-lg font-bold text-purple-800 focus:border-pink-400 focus:outline-none transition-colors bg-gradient-to-r from-purple-50 to-pink-50"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your awesome name! ✨"
          />
        </div>

        <div className="flex items-center justify-center space-x-8">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              className="w-5 h-5 text-pink-500"
              checked={mode === 'create'}
              onChange={() => setMode('create')}
            />
            <span className="text-lg font-bold text-purple-800">🌟 Create New Game</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              className="w-5 h-5 text-pink-500"
              checked={mode === 'join'}
              onChange={() => setMode('join')}
            />
            <span className="text-lg font-bold text-purple-800">🚀 Join Game</span>
          </label>
        </div>

        {mode === 'join' && (
          <div className="bounce-in">
            <label className="block text-purple-800 font-bold mb-2 text-lg">
              🎯 Game Code:
            </label>
            <input
              className="w-full border-4 border-blue-300 rounded-2xl px-4 py-3 text-lg font-bold text-blue-800 focus:border-green-400 focus:outline-none transition-colors bg-gradient-to-r from-blue-50 to-green-50"
              value={gameIdInput}
              onChange={(e) => setGameIdInput(e.target.value)}
              placeholder="Enter the secret game code! 🔑"
            />
          </div>
        )}

        <div className="text-center">
          <button
            className={mode === 'create' ? 'fun-button' : 'fun-button-green'}
            onClick={mode === 'create' ? handleCreate : handleJoin}
          >
            {mode === 'create' ? '🎉 Create Amazing Game!' : '🚀 Join the Fun!'}
          </button>
        </div>

        {gameId && (
          <div className="bounce-in bg-gradient-to-r from-yellow-100 to-orange-100 border-4 border-yellow-400 rounded-3xl p-6">
            <div className="text-center space-y-3">
              <h3 className="text-2xl font-bold text-orange-800" style={{ fontFamily: 'Fredoka One' }}>
                🎊 Game Created! 🎊
              </h3>
              <div className="bg-white rounded-2xl p-4 border-4 border-orange-300">
                <p className="text-sm text-orange-600 font-bold mb-1">Share this magic code:</p>
                <p className="text-4xl font-bold text-orange-800 pulse-glow" style={{ fontFamily: 'Fredoka One' }}>
                  {gameId}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-orange-700 font-bold">🎭 Players in the game:</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {players.map((player, index) => (
                    <span
                      key={index}
                      className="bg-gradient-to-r from-pink-300 to-purple-300 text-purple-800 px-3 py-1 rounded-full font-bold text-sm bounce-in"
                    >
                      🌟 {player}
                    </span>
                  ))}
                </div>
              </div>
              {isHost && (
                <button
                  className="fun-button-orange wiggle"
                  onClick={handleStart}
                >
                  🎮 START THE GAME! 🎮
                </button>
              )}
              {!isHost && (
                <p className="text-orange-600 font-bold animate-pulse">
                  ⏳ Waiting for the game master to start... ⏳
                </p>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border-4 border-red-400 rounded-2xl p-4 text-center">
            <p className="text-red-700 font-bold">😅 Oops! {error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Lobby; 