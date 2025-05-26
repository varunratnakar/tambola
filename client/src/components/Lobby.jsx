import React, { useState, useRef } from 'react';
import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || `${window.location.protocol}//${window.location.hostname}:4000`;

function Lobby({ onStart }) {
  const [screen, setScreen] = useState('main'); // 'main', 'create', 'join', 'gameDetails', 'lobby'
  const [gameCode, setGameCode] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Game settings
  const [pricePerTicket, setPricePerTicket] = useState(50);
  const [prizes, setPrizes] = useState({
    topLine: 100,
    middleLine: 100,
    bottomLine: 100,
    corners: 150,
    house: 500
  });
  
  // Join game data
  const [gameDetails, setGameDetails] = useState(null);
  const [numTickets, setNumTickets] = useState(1);
  const [playerName, setPlayerName] = useState('');
  
  // Lobby data
  const [players, setPlayers] = useState([]);
  const [tickets, setTickets] = useState(null);
  const [isHost, setIsHost] = useState(false);
  
  const socketRef = useRef(null);
  const ticketsRef = useRef(null);
  const isHostRef = useRef(false);

  const connect = () => {
    if (!socketRef.current) {
      socketRef.current = io(SERVER_URL, { 
        transports: ['websocket'], 
        upgrade: false,
        timeout: 60000, // 60 seconds
        forceNew: false,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 10,
        maxReconnectionAttempts: 10
      });

      // Handle heartbeat to keep connection alive
      socketRef.current.on('heartbeat', () => {
        socketRef.current.emit('heartbeat_response');
      });

      socketRef.current.on('players_updated', ({ players }) => {
        setPlayers(players);
      });

      socketRef.current.on('game_started', ({ gameId }) => {
        onStart({ 
          socket: socketRef.current, 
          gameId, 
          isHost: isHostRef.current, 
          tickets: ticketsRef.current 
        });
      });

      // Handle disconnection notifications
      socketRef.current.on('host_disconnected', ({ reason, gameWillEndIn }) => {
        if (gameWillEndIn > 0) {
          alert(`⚠️ ${reason}. Game will end in ${Math.round(gameWillEndIn / 60000)} minutes if host doesn't reconnect.`);
        } else {
          alert(`⚠️ ${reason}. Game has been cancelled.`);
        }
      });

      socketRef.current.on('player_disconnected', ({ playerName }) => {
        console.log(`Player ${playerName} disconnected`);
      });

      socketRef.current.on('host_reconnected', ({ hostName }) => {
        alert(`✅ Host ${hostName} has reconnected! Game continues.`);
      });

      socketRef.current.on('player_reconnected', ({ playerName }) => {
        console.log(`Player ${playerName} reconnected`);
      });

      // Handle connection issues
      socketRef.current.on('connect_error', (error) => {
        console.error('Connection error:', error);
        setError('Connection failed. Please check your internet connection.');
      });

      socketRef.current.on('disconnect', (reason) => {
        console.log('Disconnected:', reason);
        if (reason === 'io server disconnect') {
          // Server disconnected the client, try to reconnect
          socketRef.current.connect();
        }
      });

      socketRef.current.on('reconnect', (attemptNumber) => {
        console.log('Reconnected after', attemptNumber, 'attempts');
        setError(null);
      });

      socketRef.current.on('reconnect_error', (error) => {
        console.error('Reconnection failed:', error);
        setError('Reconnection failed. Please refresh the page.');
      });
    }
  };

  const handleCreateGame = () => {
    setLoading(true);
    setError(null);
    connect();
    
    socketRef.current.emit('create_game', { 
      pricePerTicket, 
      prizes,
      numTickets: 1 // Host gets 1 ticket by default
    }, (res) => {
      setLoading(false);
      if (res.status === 'ok') {
        setGameCode(res.gameId);
        setPlayers(res.players);
        setTickets(res.tickets);
        ticketsRef.current = res.tickets;
        setIsHost(true);
        isHostRef.current = true;
        setScreen('lobby');
      } else {
        setError(res.message);
      }
    });
  };

  const handleGetGameDetails = () => {
    if (!gameCode.trim()) {
      setError('Please enter a game code');
      return;
    }
    
    setLoading(true);
    setError(null);
    connect();
    
    const code = gameCode.trim().toLowerCase();
    socketRef.current.emit('get_game_details', { gameId: code }, (res) => {
      setLoading(false);
      if (res.status === 'ok') {
        setGameDetails(res.gameDetails);
        setScreen('gameDetails');
      } else {
        setError(res.message);
      }
    });
  };

  const handleJoinGame = () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    const code = gameCode.trim().toLowerCase();
    socketRef.current.emit('join_game', { 
      gameId: code, 
      playerName: playerName.trim(),
      numTickets 
    }, (res) => {
      setLoading(false);
      if (res.status === 'ok') {
        setPlayers(res.players);
        setTickets(res.tickets);
        ticketsRef.current = res.tickets;
        setIsHost(false);
        isHostRef.current = false;
        setScreen('lobby');
      } else {
        setError(res.message);
      }
    });
  };

  const handleStartGame = () => {
    socketRef.current.emit('start_game', { gameId: gameCode }, () => {});
  };

  // Main screen - only 2 buttons
  if (screen === 'main') {
  return (
      <div className="space-y-8 max-w-md mx-auto p-6 text-center">
        <h1 className="text-4xl font-extrabold text-purple-800 mb-8" style={{ fontFamily: 'Fredoka One' }}>
          🎯 TAMBOLA 🎯
        </h1>

        <div className="space-y-4">
          <button 
            className="btn-primary w-full text-xl py-4"
            onClick={() => setScreen('create')}
          >
            🎮 Create Game
          </button>
          
          <button 
            className="btn-secondary w-full text-xl py-4"
            onClick={() => setScreen('join')}
          >
            🚀 Join Game
          </button>
        </div>
      </div>
    );
  }

  // Create game screen
  if (screen === 'create') {
    return (
      <div className="space-y-6 max-w-md mx-auto p-4">
        <div className="flex items-center space-x-3 mb-6">
          <button
            className="text-purple-700 text-2xl"
            onClick={() => setScreen('main')}
          >
            ←
          </button>
          <h2 className="text-2xl font-extrabold text-purple-800" style={{ fontFamily: 'Fredoka One' }}>
            Create Game
          </h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-purple-800 font-bold text-sm mb-2">
              💰 Price per ticket
            </label>
            <input
              type="number"
              className="w-full border-2 border-purple-400 rounded-md p-3 font-bold"
              value={pricePerTicket}
              onChange={(e) => setPricePerTicket(parseInt(e.target.value) || 0)}
              min="1"
            />
          </div>

          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
            <h3 className="font-bold text-yellow-800 mb-3">🏆 Prize Money</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span>🔥 Top Line:</span>
                <input
                  type="number"
                  className="w-20 border border-yellow-400 rounded px-2 py-1"
                  value={prizes.topLine}
                  onChange={(e) => setPrizes({...prizes, topLine: parseInt(e.target.value) || 0})}
                />
              </div>
              <div className="flex justify-between items-center">
                <span>⭐ Middle Line:</span>
                <input
                  type="number"
                  className="w-20 border border-yellow-400 rounded px-2 py-1"
                  value={prizes.middleLine}
                  onChange={(e) => setPrizes({...prizes, middleLine: parseInt(e.target.value) || 0})}
                />
              </div>
              <div className="flex justify-between items-center">
                <span>💫 Bottom Line:</span>
                <input
                  type="number"
                  className="w-20 border border-yellow-400 rounded px-2 py-1"
                  value={prizes.bottomLine}
                  onChange={(e) => setPrizes({...prizes, bottomLine: parseInt(e.target.value) || 0})}
                />
              </div>
              <div className="flex justify-between items-center">
                <span>🔸 Corners:</span>
                <input
                  type="number"
                  className="w-20 border border-yellow-400 rounded px-2 py-1"
                  value={prizes.corners}
                  onChange={(e) => setPrizes({...prizes, corners: parseInt(e.target.value) || 0})}
                />
              </div>
              <div className="flex justify-between items-center">
                <span>🎉 Full House:</span>
                <input
                  type="number"
                  className="w-20 border border-yellow-400 rounded px-2 py-1"
                  value={prizes.house}
                  onChange={(e) => setPrizes({...prizes, house: parseInt(e.target.value) || 0})}
                />
              </div>
            </div>
          </div>
        </div>

        {error && <p className="text-red-600 text-center font-bold">{error}</p>}

        <button 
          className="btn-primary w-full"
          onClick={handleCreateGame}
          disabled={loading}
        >
          {loading ? '⏳ Creating...' : '🎮 Create & Get Code'}
        </button>
      </div>
    );
  }

  // Join game screen - enter code
  if (screen === 'join') {
    return (
      <div className="space-y-6 max-w-md mx-auto p-4">
        <div className="flex items-center space-x-3 mb-6">
          <button 
            className="text-purple-700 text-2xl"
            onClick={() => setScreen('main')}
          >
            ←
          </button>
          <h2 className="text-2xl font-extrabold text-purple-800" style={{ fontFamily: 'Fredoka One' }}>
            Join Game
          </h2>
        </div>

        <input
          className="w-full border-2 border-blue-400 rounded-md p-3 font-bold text-center text-2xl"
          placeholder="Enter 3-letter code"
          value={gameCode}
          onChange={(e) => setGameCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
          maxLength={3}
        />

        {error && <p className="text-red-600 text-center font-bold">{error}</p>}

        <button
          className="btn-secondary w-full"
          onClick={handleGetGameDetails}
          disabled={!gameCode.trim() || loading}
        >
          {loading ? '⏳ Checking...' : '🔍 Check Game'}
        </button>
      </div>
    );
  }

  // Game details screen - show game info before joining
  if (screen === 'gameDetails' && gameDetails) {
    return (
      <div className="space-y-6 max-w-md mx-auto p-4">
        <div className="flex items-center space-x-3 mb-6">
          <button 
            className="text-purple-700 text-2xl"
            onClick={() => setScreen('join')}
          >
            ←
          </button>
          <h2 className="text-2xl font-extrabold text-purple-800" style={{ fontFamily: 'Fredoka One' }}>
            Game Details
          </h2>
            </div>

        <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
          <h3 className="font-bold text-blue-800 mb-3">💰 Game Info</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Price per ticket:</span>
              <span className="font-bold">₹{gameDetails.pricePerTicket}</span>
            </div>
            <div className="flex justify-between">
              <span>Players joined:</span>
              <span className="font-bold">{gameDetails.playerCount}</span>
            </div>
            </div>
          </div>

        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
          <h3 className="font-bold text-yellow-800 mb-3">🏆 Prize Money</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>🔥 Top Line:</span>
              <span className="font-bold">₹{gameDetails.prizes.topLine}</span>
            </div>
            <div className="flex justify-between">
              <span>⭐ Middle Line:</span>
              <span className="font-bold">₹{gameDetails.prizes.middleLine}</span>
            </div>
            <div className="flex justify-between">
              <span>💫 Bottom Line:</span>
              <span className="font-bold">₹{gameDetails.prizes.bottomLine}</span>
            </div>
            <div className="flex justify-between">
              <span>🔸 Corners:</span>
              <span className="font-bold">₹{gameDetails.prizes.corners}</span>
            </div>
            <div className="flex justify-between">
              <span>🎉 Full House:</span>
              <span className="font-bold">₹{gameDetails.prizes.house}</span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-purple-800 font-bold text-sm mb-2">
            👤 Your name (required):
          </label>
          <input
            className="w-full border-2 border-purple-400 rounded-md p-3 font-bold"
            placeholder="Enter your name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            maxLength={20}
          />
        </div>

        <div>
          <label className="block text-purple-800 font-bold text-sm mb-2">
            Number of tickets (1-6):
          </label>
          <select
            className="w-full border-2 border-purple-400 rounded-md p-3 font-bold"
            value={numTickets}
            onChange={(e) => setNumTickets(parseInt(e.target.value))}
          >
            {[1, 2, 3, 4, 5, 6].map(num => (
              <option key={num} value={num}>
                {num} ticket{num > 1 ? 's' : ''} - ₹{num * gameDetails.pricePerTicket}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="text-red-600 text-center font-bold">{error}</p>}

        <button
          className="btn-primary w-full"
          onClick={handleJoinGame}
          disabled={loading}
        >
          {loading ? '⏳ Joining...' : `🚀 Join Game - ₹${numTickets * gameDetails.pricePerTicket}`}
        </button>
      </div>
    );
  }

  // Lobby screen - waiting for game to start
  if (screen === 'lobby') {
    return (
      <div className="space-y-6 max-w-md mx-auto p-4">
        <h2 className="text-center text-2xl font-extrabold text-purple-800" style={{ fontFamily: 'Fredoka One' }}>
          Game Lobby
        </h2>

        {isHost ? (
          <div className="bg-green-100 border-2 border-green-400 rounded-lg p-4">
            <p className="text-lg font-bold text-green-800 mb-2">🎮 You're the Host!</p>
            <p className="text-green-700">Start the game when ready</p>
          </div>
        ) : (
          <div className="bg-blue-100 border-2 border-blue-400 rounded-lg p-4">
            <p className="text-lg font-bold text-blue-800 mb-2">✅ Joined Successfully!</p>
            <p className="text-blue-700 font-bold">Waiting for host to start...</p>
          </div>
        )}
          
        {/* Players list with ticket counts */}
          <div>
            <p className="font-bold text-purple-800 mb-2">Players in game:</p>
          <div className="space-y-2">
            {players.map((player, idx) => (
              <div key={idx} className="flex justify-between items-center bg-purple-100 rounded-lg px-3 py-2">
                <span className="font-medium">{player.name}</span>
                <span className="text-sm bg-purple-200 px-2 py-1 rounded-full">
                  {player.ticketCount} ticket{player.ticketCount > 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>

        {isHost && (
          <button 
            className="btn-primary w-full" 
            onClick={handleStartGame}
          >
            🚀 Start Game
          </button>
        )}

        {/* Share code */}
        <div className="mt-6 pt-4 border-t border-gray-300 text-center">
          <p className="text-sm text-gray-600 mb-1">Share this code:</p>
          <p className="text-2xl font-bold text-orange-700" style={{ fontFamily: 'Fredoka One' }}>
            {gameCode}
          </p>
        </div>
    </div>
  );
  }

  return null;
}

export default Lobby; 