import React, { useState, useRef, useEffect } from 'react';
import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || `${window.location.protocol}//${window.location.hostname}:4000`;

function Lobby({ onStart }) {
  const [screen, setScreen] = useState('main'); // 'main', 'create', 'join', 'gameDetails', 'lobby'
  const [gameCode, setGameCode] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Game settings
  const [pricePerTicket, setPricePerTicket] = useState(50);
  const [gameOptions, setGameOptions] = useState({
    enableEarly5: false,
    enableMultipleHouses: false,
    maxHouseWinners: 3,
    houseReductionPercent: 50,
    autoDrawInterval: 10, // Default 15 seconds
    enableBogey: false
  });
  
  // Prize tracking
  const [currentPrizes, setCurrentPrizes] = useState({
    topLine: 0,
    middleLine: 0,
    bottomLine: 0,
    corners: 0,
    house: 0,
    early5: 0
  });
  const [totalRevenue, setTotalRevenue] = useState(0);
  
  // Join game data
  const [gameDetails, setGameDetails] = useState(null);
  const [numTickets, setNumTickets] = useState(1);
  const [playerName, setPlayerName] = useState('');
  
  // Lobby data
  const [players, setPlayers] = useState([]);
  const [tickets, setTickets] = useState(null);
  const [isHost, setIsHost] = useState(false);
  
  // Connection status
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  
  const socketRef = useRef(null);
  const ticketsRef = useRef(null);
  const isHostRef = useRef(false);

  // Auto-rejoin logic on mount
  useEffect(() => {
    const saved = sessionStorage.getItem('tambolaSession');
    if (!saved) return;
    const { gameId: savedGameId, playerName: savedName, numTickets: savedTickets, isHost: savedHost } = JSON.parse(saved);
    if (!savedGameId || !savedName) return;

    setGameCode(savedGameId);
    setPlayerName(savedName);
    setNumTickets(savedTickets || 1);

    connect();

    // After connection established, attempt join_game
    let rejoinAttempts = 0;
    const tryJoin = () => {
      if (rejoinAttempts > 10) {
        console.warn('Auto rejoin exhausted attempts');
        sessionStorage.removeItem('tambolaSession');
        return;
      }
      rejoinAttempts++;
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('join_game', {
          gameId: savedGameId,
          playerName: savedName,
          numTickets: savedTickets || 1
        }, (res) => {
          if (res.status === 'ok') {
            setPlayers(res.players);
            setTickets(res.tickets);
            ticketsRef.current = res.tickets;
            setIsHost(savedHost);
            isHostRef.current = savedHost;
            setScreen('lobby');
          } else if (res.message && res.message.includes('already started')) {
            // Maybe we are still registered: ask game info
            socketRef.current.emit('get_game_info', { gameId: savedGameId }, (infoRes) => {
              if (infoRes.status === 'ok') {
                setScreen('lobby');
              } else {
                console.warn('Rejoin race – retrying in 1s');
                setTimeout(tryJoin, 1000);
              }
            });
          } else {
            console.warn('Auto rejoin failed', res.message);
            sessionStorage.removeItem('tambolaSession');
          }
        });
      } else {
        setTimeout(tryJoin, 200);
      }
    };

    tryJoin();
  }, []);

  const connect = () => {
    if (!socketRef.current) {
      socketRef.current = io(SERVER_URL, { 
        transports: ['websocket'], 
        upgrade: false,
        timeout: 20000, // 20 seconds - reduced from 60
        forceNew: false,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5, // reduced from 10
        maxReconnectionAttempts: 5 // reduced from 10
      });

      // Handle heartbeat to keep connection alive
      socketRef.current.on('heartbeat', () => {
        socketRef.current.emit('heartbeat_response');
      });

      socketRef.current.on('players_updated', ({ players }) => {
        setPlayers(players);
      });

      socketRef.current.on('player_left', ({ playerName }) => {
        // Show a simple alert or toast – using window.alert for simplicity in lobby
        alert(`👋 ${playerName || 'A player'} left the game.`);
      });

      socketRef.current.on('prizes_updated', ({ prizes, totalRevenue: revenue }) => {
        setCurrentPrizes(prizes);
        setTotalRevenue(revenue);
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
      socketRef.current.on('player_disconnected', ({ playerName }) => {
        console.log(`Player ${playerName} disconnected`);
      });

      socketRef.current.on('player_reconnected', ({ playerName }) => {
        console.log(`Player ${playerName} reconnected`);
      });

      socketRef.current.on('host_left', ({ message }) => {
        alert(`ℹ️ ${message}`);
      });

      // Handle connection status
      socketRef.current.on('connect', () => {
        console.log('Connected to server');
        setConnectionStatus('connected');
        setError(null);
      });

      socketRef.current.on('connecting', () => {
        console.log('Connecting to server...');
        setConnectionStatus('connecting');
      });

      socketRef.current.on('connect_error', (error) => {
        console.error('Connection error:', error);
        setConnectionStatus('error');
        setError('Connection failed. Please check your internet connection.');
      });

      socketRef.current.on('disconnect', (reason) => {
        console.log('Disconnected:', reason);
        setConnectionStatus('disconnected');
        if (reason === 'io server disconnect') {
          // Server disconnected the client, try to reconnect
          socketRef.current.connect();
        }
      });

      socketRef.current.on('reconnect', (attemptNumber) => {
        console.log('Reconnected after', attemptNumber, 'attempts');
        setConnectionStatus('connected');
        setError(null);
      });

      socketRef.current.on('reconnect_error', (error) => {
        console.error('Reconnection failed:', error);
        setConnectionStatus('error');
        setError('Reconnection failed. Please refresh the page.');
      });
    }
  };

  const handleCreateGame = () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }
    
    setLoading(true);
    setError(null);
    connect();
    
    // Wait for socket to be connected before making the request
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max wait time
    
    const makeRequest = () => {
      attempts++;
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('create_game', { 
          hostName: playerName,
          pricePerTicket, 
          numTickets: numTickets,
          gameOptions
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
            // Persist session for auto-rejoin
            sessionStorage.setItem('tambolaSession', JSON.stringify({ gameId: res.gameId, playerName, numTickets, isHost: true }));
          } else {
            setError(res.message);
          }
        });
      } else if (attempts < maxAttempts) {
        // Socket not connected yet, wait a bit and try again
        setTimeout(makeRequest, 100);
      } else {
        // Timeout - connection failed
        setLoading(false);
        setError('Connection timeout. Please check your internet connection and try again.');
      }
    };
    
    makeRequest();
  };

  const handleGetGameDetails = () => {
    if (!gameCode.trim()) {
      setError('Please enter a game code');
      return;
    }
    
    setLoading(true);
    setError(null);
    connect();
    
    const code = gameCode.trim().toUpperCase();
    
    // Wait for socket to be connected before making the request
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max wait time
    
    const makeRequest = () => {
      attempts++;
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('get_game_details', { gameId: code }, (res) => {
          setLoading(false);
          if (res.status === 'ok') {
            setGameDetails(res.gameDetails);
            setScreen('gameDetails');
          } else {
            setError(res.message);
          }
        });
      } else if (attempts < maxAttempts) {
        // Socket not connected yet, wait a bit and try again
        setTimeout(makeRequest, 100);
      } else {
        // Timeout - connection failed
        setLoading(false);
        setError('Connection timeout. Please check your internet connection and try again.');
      }
    };
    
    makeRequest();
  };

  const handleJoinGame = () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    const code = gameCode.trim().toUpperCase();
    
    // Wait for socket to be connected before making the request
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max wait time
    
    const makeRequest = () => {
      attempts++;
      if (socketRef.current && socketRef.current.connected) {
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
            // Persist session for auto-rejoin
            sessionStorage.setItem('tambolaSession', JSON.stringify({ gameId: code, playerName, numTickets, isHost: false }));
          } else {
            setError(res.message);
          }
        });
      } else if (attempts < maxAttempts) {
        // Socket not connected yet, wait a bit and try again
        setTimeout(makeRequest, 100);
      } else {
        // Timeout - connection failed
        setLoading(false);
        setError('Connection timeout. Please check your internet connection and try again.');
      }
    };
    
    makeRequest();
  };

  const handleStartGame = () => {
    socketRef.current.emit('start_game', { gameId: gameCode }, () => {});
  };

  // Leave current game and return to main menu
  const handleExitGame = () => {
    if (socketRef.current) {
      try {
        socketRef.current.disconnect();
      } catch (_) {}
      socketRef.current = null;
    }
    sessionStorage.removeItem('tambolaSession');
    // Reset lobby state
    setScreen('main');
    setGameCode('');
    setPlayers([]);
    setTickets(null);
    setIsHost(false);
    setGameDetails(null);
    setCurrentPrizes({ topLine:0, middleLine:0, bottomLine:0, corners:0, house:0, early5:0 });
    setTotalRevenue(0);
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

          <div>
            <label className="block text-purple-800 font-bold text-sm mb-2">
              🎫 Number of tickets for you (1-6):
            </label>
            <select
              className="w-full border-2 border-purple-400 rounded-md p-3 font-bold"
              value={numTickets}
              onChange={(e) => setNumTickets(parseInt(e.target.value))}
            >
              {[1, 2, 3, 4, 5, 6].map(num => (
                <option key={num} value={num}>
                  {num} ticket{num > 1 ? 's' : ''} - ₹{num * pricePerTicket}
                </option>
              ))}
            </select>
          </div>

          {/* Game Options */}
          <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
            <h3 className="font-bold text-blue-800 mb-3">⚙️ Game Options</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span>Enable Early 5 (first 5 numbers):</span>
                <input
                  type="checkbox"
                  className="w-5 h-5"
                  checked={gameOptions.enableEarly5}
                  onChange={(e) => setGameOptions({...gameOptions, enableEarly5: e.target.checked})}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <span>Allow Multiple Full Houses:</span>
                <input
                  type="checkbox"
                  className="w-5 h-5"
                  checked={gameOptions.enableMultipleHouses}
                  onChange={(e) => setGameOptions({...gameOptions, enableMultipleHouses: e.target.checked})}
                />
              </div>
              
              {gameOptions.enableMultipleHouses && (
                <>
                  <div className="flex items-center justify-between">
                    <span>Max Full House Winners:</span>
                    <select
                      className="border border-blue-400 rounded px-2 py-1"
                      value={gameOptions.maxHouseWinners}
                      onChange={(e) => setGameOptions({...gameOptions, maxHouseWinners: parseInt(e.target.value)})}
                    >
                      <option value={2}>2</option>
                      <option value={3}>3</option>
                      <option value={4}>4</option>
                      <option value={5}>5</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span>Prize Reduction (%):</span>
                    <select
                      className="border border-blue-400 rounded px-2 py-1"
                      value={gameOptions.houseReductionPercent}
                      onChange={(e) => setGameOptions({...gameOptions, houseReductionPercent: parseInt(e.target.value)})}
                    >
                      <option value={25}>25% (2nd: 75%, 3rd: 56%)</option>
                      <option value={50}>50% (2nd: 50%, 3rd: 25%)</option>
                      <option value={75}>75% (2nd: 25%, 3rd: 6%)</option>
                    </select>
                  </div>
                </>
              )}
              
              <div className="flex items-center justify-between">
                <span>Auto-Draw Interval:</span>
                <select
                  className="border border-blue-400 rounded px-2 py-1"
                  value={gameOptions.autoDrawInterval}
                  onChange={(e) => setGameOptions({...gameOptions, autoDrawInterval: parseInt(e.target.value)})}
                >
                  <option value={5}>5 seconds (Fast)</option>
                  <option value={10}>10 seconds (Default)</option>
                  <option value={15}>15 seconds</option>
                  <option value={20}>20 seconds</option>
                  <option value={30}>30 seconds (Slow)</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <span>Enable Bogey (false claim penalty):</span>
                <input
                  type="checkbox"
                  className="w-5 h-5"
                  checked={gameOptions.enableBogey}
                  onChange={(e) => setGameOptions({...gameOptions, enableBogey: e.target.checked})}
                />
              </div>
            </div>
          </div>
        </div>

        {error && <p className="text-red-600 text-center font-bold">{error}</p>}

        <button 
          className="btn-primary w-full"
          onClick={handleCreateGame}
        >
          {loading ? '⏳ Creating...' : '🎮 Create & Get Code'}
        </button>


        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
          <h3 className="font-bold text-yellow-800 mb-3">🏆 Prize Distribution</h3>
          <div className="space-y-2 text-sm">
            <div className="text-center text-yellow-700 mb-2 italic">
              Prizes calculated automatically from ticket sales
            </div>
            <div className="flex justify-between">
              <span>🔥 Top Line:</span>
              <span className="font-bold">15% of total</span>
            </div>
            <div className="flex justify-between">
              <span>⭐ Middle Line:</span>
              <span className="font-bold">15% of total</span>
            </div>
            <div className="flex justify-between">
              <span>💫 Bottom Line:</span>
              <span className="font-bold">15% of total</span>
            </div>
            <div className="flex justify-between">
              <span>🔸 Corners:</span>
              <span className="font-bold">10% of total</span>
            </div>
            <div className="flex justify-between">
              <span>🎉 Full House:</span>
              <span className="font-bold">{gameOptions.enableEarly5 ? '35%' : '40%'} of total</span>
            </div>
            {gameOptions.enableEarly5 && (
              <div className="flex justify-between">
                <span>⚡ Early 5:</span>
                <span className="font-bold">5% of total</span>
              </div>
            )}
            <div className="border-t border-yellow-400 pt-2 mt-2">
              <div className="flex justify-between text-xs text-yellow-600">
                <span>Host Commission:</span>
                <span>5% of total</span>
              </div>
            </div>
          </div>
        </div>        
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

        {/* Connection Status Indicator */}
        {connectionStatus !== 'connected' && connectionStatus !== 'disconnected' && (
          <div className="text-center text-sm">
            <span className={`inline-block px-3 py-1 rounded-full ${
              connectionStatus === 'connecting' ? 'bg-yellow-100 text-yellow-800' :
              connectionStatus === 'error' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {connectionStatus === 'connecting' ? '🔄 Connecting...' : 
               connectionStatus === 'error' ? '❌ Connection Error' : connectionStatus}
            </span>
          </div>
        )}

        {error && <p className="text-red-600 text-center font-bold">{error}</p>}

        <button
          className="btn-secondary w-full"
          onClick={handleGetGameDetails}
          disabled={!gameCode.trim() || loading}
        >
          {loading ? '⏳ Checking...' : '🔍 Check Game'}
        </button>
        
        {/* Retry button for connection issues */}
        {error && error.includes('Connection') && (
          <button
            className="btn-secondary w-full text-sm"
            onClick={() => {
              setError(null);
              // Force reconnection
              if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
              }
              handleGetGameDetails();
            }}
          >
            🔄 Retry Connection
          </button>
        )}
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
        >
          {loading ? '⏳ Joining...' : `🚀 Join Game - ₹${numTickets * gameDetails.pricePerTicket}`}
        </button>

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


        {/* Game Options Display */}
        {(gameDetails.options?.enableEarly5 || gameDetails.options?.enableMultipleHouses || gameDetails.options?.autoDrawInterval) && (
          <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
            <h3 className="font-bold text-blue-800 mb-3">⚙️ Game Features</h3>
            <div className="space-y-1 text-sm">
              {gameDetails.options.enableEarly5 && (
                <div className="flex items-center">
                  <span className="text-green-600">✓</span>
                  <span className="ml-2">Early 5 enabled</span>
                </div>
              )}
              {gameDetails.options.enableMultipleHouses && (
                <div className="flex items-center">
                  <span className="text-green-600">✓</span>
                  <span className="ml-2">
                    Multiple Full Houses (max {gameDetails.options.maxHouseWinners}, 
                    {gameDetails.options.houseReductionPercent}% reduction)
                  </span>
                </div>
              )}
              {gameDetails.options.autoDrawInterval && (
                <div className="flex items-center">
                  <span className="text-blue-600">⏰</span>
                  <span className="ml-2">
                    Auto-draw every {gameDetails.options.autoDrawInterval} seconds
                  </span>
                </div>
              )}
            </div>
          </div>
        )}


        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
          <h3 className="font-bold text-yellow-800 mb-3">🏆 Current Prize Pool</h3>
          <div className="space-y-1 text-sm">
            <div className="text-center mb-2">
              <div className="text-yellow-700 font-bold">Total Revenue: ₹{gameDetails.totalRevenue || 0}</div>
              <div className="text-yellow-600 text-xs">({gameDetails.totalTicketsSold || 0} tickets sold)</div>
            </div>
            <div className="flex justify-between">
              <span>🔥 Top Line:</span>
              <span className="font-bold">₹{gameDetails.prizes.topLine || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>⭐ Middle Line:</span>
              <span className="font-bold">₹{gameDetails.prizes.middleLine || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>💫 Bottom Line:</span>
              <span className="font-bold">₹{gameDetails.prizes.bottomLine || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>🔸 Corners:</span>
              <span className="font-bold">₹{gameDetails.prizes.corners || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>🎉 Full House:</span>
              <span className="font-bold">₹{gameDetails.prizes.house || 0}</span>
            </div>
            {gameDetails.options?.enableEarly5 && (
              <div className="flex justify-between">
                <span>⚡ Early 5:</span>
                <span className="font-bold">₹{gameDetails.prizes.early5 || 0}</span>
              </div>
            )}
            <div className="border-t border-yellow-400 pt-1 mt-2">
              <div className="text-center text-yellow-600 text-xs italic">
                Prizes update automatically as players join
              </div>
            </div>
          </div>
        </div>

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
          
        {/* Current Prize Pool */}
        {totalRevenue > 0 && (
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
            <h3 className="font-bold text-yellow-800 mb-3 text-center">🏆 Current Prize Pool</h3>
            <div className="text-center mb-3">
              <div className="text-yellow-700 font-bold text-lg">Total: ₹{totalRevenue}</div>
              <div className="text-yellow-600 text-sm">({players.reduce((sum, p) => sum + p.ticketCount, 0)} tickets sold)</div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span>🔥 Top Line:</span>
                <span className="font-bold">₹{currentPrizes.topLine}</span>
              </div>
              <div className="flex justify-between">
                <span>⭐ Middle:</span>
                <span className="font-bold">₹{currentPrizes.middleLine}</span>
              </div>
              <div className="flex justify-between">
                <span>💫 Bottom:</span>
                <span className="font-bold">₹{currentPrizes.bottomLine}</span>
              </div>
              <div className="flex justify-between">
                <span>🔸 Corners:</span>
                <span className="font-bold">₹{currentPrizes.corners}</span>
              </div>
              <div className="flex justify-between col-span-2">
                <span>🎉 Full House:</span>
                <span className="font-bold">₹{currentPrizes.house}</span>
              </div>
              {gameOptions.enableEarly5 && currentPrizes.early5 > 0 && (
                <div className="flex justify-between col-span-2">
                  <span>⚡ Early 5:</span>
                  <span className="font-bold">₹{currentPrizes.early5}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Players list with ticket counts */}
          <div>
            <p className="font-bold text-purple-800 mb-2">Players in game:</p>
          <div className="space-y-2">
            {players.map((player, idx) => (
              <div key={idx} className="flex justify-between items-center bg-purple-100 rounded-lg px-3 py-2">
                <span className="font-medium">
                  {player.name}
                  {player.isHost && <span className="ml-2 text-xs bg-green-500 text-white px-2 py-1 rounded-full">HOST</span>}
                </span>
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

        {/* Exit Game button for everyone */}
        <button
          className="btn-danger w-full mt-2"
          onClick={handleExitGame}
        >
          🏃 Exit Game
        </button>

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