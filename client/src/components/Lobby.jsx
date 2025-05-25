import React, { useState, useRef } from 'react';
import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || `${window.location.protocol}//${window.location.hostname}:4000`;

function Lobby({ onStart }) {
  const [name, setName] = useState('');
  const [mode, setMode] = useState('create');
  const [gameCode, setGameCode] = useState('');
  const [error, setError] = useState(null);
  const [players, setPlayers] = useState([]);
  const [ticket, setTicket] = useState(null);
  const [joined, setJoined] = useState(false);
  const ticketRef = useRef(null);
  const socketRef = useRef(null);

  const connect = () => {
    if (!socketRef.current) {
      socketRef.current = io(SERVER_URL, { transports: ['websocket'], upgrade: false });

      socketRef.current.on('players_updated', ({ players }) => {
        setPlayers(players);
      });

      socketRef.current.on('game_started', ({ gameId }) => {
        onStart({ 
          socket: socketRef.current, 
          gameId, 
          isHost: mode === 'create', 
          ticket: ticketRef.current 
        });
      });
    }
  };

  const handleCreate = () => {
    if (!name.trim()) {
      setError('Please enter your name first!');
      return;
    }
    connect();
    socketRef.current.emit('create_game', { hostName: name }, (res) => {
      if (res.status === 'ok') {
        setGameCode(res.gameId);
        setPlayers(res.players);
        setTicket(res.ticket);
        ticketRef.current = res.ticket;
        setJoined(true);
      } else {
        setError(res.message);
      }
    });
  };

  const handleJoin = () => {
    if (!name.trim()) {
      setError('Please enter your name first!');
      return;
    }
    connect();
    const code = gameCode.trim().toLowerCase();
    socketRef.current.emit('join_game', { gameId: code, playerName: name }, (res) => {
      if (res.status === 'ok') {
        setPlayers(res.players);
        setTicket(res.ticket);
        ticketRef.current = res.ticket;
        setJoined(true);
      } else {
        setError(res.message);
      }
    });
  };

  return (
    <div className="space-y-6 max-w-md mx-auto p-2">
      <h2 className="text-center text-2xl font-extrabold text-purple-800" style={{ fontFamily: 'Fredoka One' }}>
        {mode === 'create' ? 'Create Game' : 'Join Game'}
      </h2>

      <input
        className="w-full border-2 border-purple-400 rounded-md p-3 font-bold"
        placeholder="Your cool name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      {mode === 'join' && (
        <input
          className="w-full border-2 border-blue-400 rounded-md p-3 font-bold"
          placeholder="Game code"
          value={gameCode}
          onChange={(e) => setGameCode(e.target.value)}
        />
      )}

      {error && <p className="text-red-600 text-center font-bold">{error}</p>}

      {/* Main action buttons */}
      {mode === 'create' && !gameCode && (
        <div className="space-y-3">
          <button className="btn-primary w-full" onClick={handleCreate}>
            🎮 Create & Share Code
          </button>
          
          <button 
            className="w-full py-2 text-purple-700 font-bold underline"
            onClick={() => setMode('join')}
          >
            Or join a game with code
          </button>
        </div>
      )}

      {mode === 'join' && !joined && (
        <div className="space-y-3">
          <button
            className="btn-secondary w-full"
            onClick={handleJoin}
            disabled={!gameCode.trim()}
          >
            🚀 Join Game
          </button>
          
          <button 
            className="w-full py-2 text-purple-700 font-bold underline"
            onClick={() => setMode('create')}
          >
            Or create a new game
          </button>
        </div>
      )}

      {gameCode && joined && (
        <div className="text-center space-y-4">
          {/* Main waiting message */}
          {mode === 'create' ? (
            <div className="bg-green-100 border-2 border-green-400 rounded-lg p-4">
              <p className="text-lg font-bold text-green-800 mb-2">🎮 Game Created!</p>
              <p className="text-green-700">You can start the game when ready</p>
            </div>
          ) : (
            <div className="bg-blue-100 border-2 border-blue-400 rounded-lg p-4">
              <p className="text-lg font-bold text-blue-800 mb-2">✅ Joined Successfully!</p>
              <p className="text-blue-700 font-bold">Waiting for host to start the game...</p>
            </div>
          )}

          {/* Players list */}
          <div>
            <p className="font-bold text-purple-800 mb-2">Players in game:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {players.map((p, idx) => (
                <span key={idx} className="px-3 py-1 bg-purple-200 rounded-full font-medium">{p}</span>
              ))}
            </div>
          </div>

          {/* Action button */}
          {mode === 'create' && (
            <button className="btn-primary w-full" onClick={() => socketRef.current.emit('start_game', { gameId: gameCode }, () => {})}>
              🚀 Start Game
            </button>
          )}

          {/* Share code - smaller and at bottom */}
          <div className="mt-6 pt-4 border-t border-gray-300">
            <p className="text-sm text-gray-600 mb-1">Share this code to invite more players:</p>
            <p className="text-2xl font-bold text-orange-700" style={{ fontFamily: 'Fredoka One' }}>{gameCode}</p>
          </div>
        </div>
      )}

      {joined && !gameCode && (
        <div className="text-center space-y-4">
          <div className="bg-blue-100 border-2 border-blue-400 rounded-lg p-4">
            <p className="text-lg font-bold text-blue-800 mb-2">✅ Joined Successfully!</p>
            <p className="text-blue-700 font-bold">Waiting for host to start the game...</p>
          </div>
          
          <div>
            <p className="font-bold text-purple-800 mb-2">Players in game:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {players.map((p, idx) => (
                <span key={idx} className="px-3 py-1 bg-purple-200 rounded-full font-medium">{p}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Lobby; 