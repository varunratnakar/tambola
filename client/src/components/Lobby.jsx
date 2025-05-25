import React, { useState } from 'react';
import { io } from 'socket.io-client';

const SERVER_URL =
  import.meta.env.VITE_SERVER_URL || `${window.location.protocol}//${window.location.hostname}:4000`;

const socket = io(SERVER_URL, {
  transports: ['polling', 'websocket'],
  upgrade: true,
  rememberUpgrade: true
});

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
    <div>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">
          Your Name:
          <input
            className="mt-1 w-full border rounded px-2 py-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
      </div>

      <div className="flex items-center space-x-4 mb-4">
        <input
          type="radio"
          className="mr-1"
          checked={mode === 'create'}
          onChange={() => setMode('create')}
        />
        Create Game
        <input
          type="radio"
          className="mr-1"
          checked={mode === 'join'}
          onChange={() => setMode('join')}
        />
        Join Game
      </div>

      {mode === 'join' && (
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">
            Game ID:
            <input
              className="mt-1 w-full border rounded px-2 py-1"
              value={gameIdInput}
              onChange={(e) => setGameIdInput(e.target.value)}
            />
          </label>
        </div>
      )}

      <button
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        onClick={mode === 'create' ? handleCreate : handleJoin}
      >
        {mode === 'create' ? 'Create' : 'Join'}
      </button>

      {gameId && (
        <div className="mt-4 bg-gray-100 p-4 rounded">
          <p>
            Game ID: <strong>{gameId}</strong>
          </p>
          <p>Share this ID with your friends to join.</p>
          <p>Players: {players.join(', ')}</p>
          {isHost && (
            <button
              className="mt-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              onClick={handleStart}
            >
              Start Game
            </button>
          )}
        </div>
      )}

      {error && <p className="text-red-600 mt-2">{error}</p>}
    </div>
  );
}

export default Lobby; 