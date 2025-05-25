import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const SERVER_URL =
  import.meta.env.VITE_SERVER_URL || `${window.location.protocol}//${window.location.hostname}:4000`;

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
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const socketRef = useRef(null);

  // Initialize socket connection
  useEffect(() => {
    console.log('Connecting to server:', SERVER_URL);
    
    // Force WebSocket transport only to avoid long-polling session issues on Fly.io
    const socket = io(SERVER_URL, {
      transports: ['websocket'], // disable HTTP long-polling
      upgrade: false,
      timeout: 20000,
      forceNew: true
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to server');
      setConnectionStatus('connected');
      setError(null);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnectionStatus('disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setConnectionStatus('error');
      setError('Failed to connect to server. Please try again.');
    });

    socket.on('player_joined', ({ playerName }) => {
      setPlayers((prev) => [...prev, playerName]);
    });

    socket.on('game_started', () => {
      onStart({ socket, ticket, gameId, isHost });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleCreate = () => {
    if (!socketRef.current || connectionStatus !== 'connected') {
      setError('Not connected to server. Please wait and try again.');
      return;
    }

    socketRef.current.emit('create_game', { hostName: name }, (res) => {
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
    if (!socketRef.current || connectionStatus !== 'connected') {
      setError('Not connected to server. Please wait and try again.');
      return;
    }

    socketRef.current.emit('join_game', { gameId: gameIdInput, playerName: name }, (res) => {
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
    if (!socketRef.current || connectionStatus !== 'connected') {
      setError('Not connected to server. Please wait and try again.');
      return;
    }

    socketRef.current.emit('start_game', { gameId }, (res) => {
      if (res.status === 'ok') {
        // Immediately transition host to game view to avoid race
        const hostTicket = latestTicket || ticket;
        onStart({ socket: socketRef.current, ticket: hostTicket, gameId, isHost: true });
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
        
        {/* Connection Status */}
        <div className="mt-2">
          {connectionStatus === 'connecting' && (
            <p className="text-yellow-600 font-bold animate-pulse">🔄 Connecting to server...</p>
          )}
          {connectionStatus === 'connected' && (
            <p className="text-green-600 font-bold">✅ Connected to server!</p>
          )}
          {connectionStatus === 'disconnected' && (
            <p className="text-red-600 font-bold">❌ Disconnected from server</p>
          )}
          {connectionStatus === 'error' && (
            <p className="text-red-600 font-bold">⚠️ Connection error</p>
          )}
        </div>
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
            disabled={connectionStatus !== 'connected'}
          />
        </div>

        <div className="flex items-center justify-center space-x-8">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              className="w-5 h-5 text-pink-500"
              checked={mode === 'create'}
              onChange={() => setMode('create')}
              disabled={connectionStatus !== 'connected'}
            />
            <span className="text-lg font-bold text-purple-800">🌟 Create New Game</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              className="w-5 h-5 text-pink-500"
              checked={mode === 'join'}
              onChange={() => setMode('join')}
              disabled={connectionStatus !== 'connected'}
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
              disabled={connectionStatus !== 'connected'}
            />
          </div>
        )}

        <div className="text-center">
          <button
            className={`${mode === 'create' ? 'fun-button' : 'fun-button-green'} ${
              connectionStatus !== 'connected' ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            onClick={mode === 'create' ? handleCreate : handleJoin}
            disabled={connectionStatus !== 'connected'}
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