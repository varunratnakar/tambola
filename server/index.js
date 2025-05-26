// Tambola Multiplayer Game Server
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const { GameManager } = require('./gameManager');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ["websocket"],
  allowEIO3: false,
  // Extended timeout settings for long games
  pingTimeout: 60000, // 60 seconds
  pingInterval: 25000, // 25 seconds
  // Keep connections alive for 30 minutes
  connectTimeout: 30 * 60 * 1000, // 30 minutes
  // Allow time for reconnection
  maxHttpBufferSize: 1e6,
  // Heartbeat settings
  heartbeatTimeout: 30000,
  heartbeatInterval: 10000
});

const PORT = process.env.PORT || 4000;

const gameManager = new GameManager(io);

// Basic health check
app.get('/', (_, res) => res.send('Tambola server is running'));

io.on('connection', (socket) => {
  console.log('A user connected', socket.id);
  
  // Send heartbeat to keep connection alive
  const heartbeatInterval = setInterval(() => {
    socket.emit('heartbeat', { timestamp: Date.now() });
  }, 30000); // Every 30 seconds
  
  // Handle heartbeat response
  socket.on('heartbeat_response', () => {
    // Client is alive, reset any disconnect timers
  });

  socket.on('create_game', ({ pricePerTicket, numTickets = 1, gameOptions = {} }, cb) => {
    try {
      const { gameId, tickets, players } = gameManager.createGame(socket.id, pricePerTicket, {}, numTickets, gameOptions);
      socket.join(gameId);
      cb({ status: 'ok', gameId, tickets, players });
    } catch (err) {
      cb({ status: 'error', message: err.message });
    }
  });

  socket.on('get_game_details', ({ gameId }, cb) => {
    try {
      console.log(`Getting game details for: ${gameId}`);
      const gameDetails = gameManager.getGameDetails(gameId);
      console.log(`Game details found for ${gameId}:`, gameDetails);
      cb({ status: 'ok', gameDetails });
    } catch (err) {
      console.log(`Error getting game details for ${gameId}:`, err.message);
      // Provide more helpful error messages
      if (err.message === 'Invalid game ID') {
        cb({ status: 'error', message: 'Game not found. It may have been cancelled or expired.' });
      } else if (err.message === 'Game already started') {
        cb({ status: 'error', message: 'This game has already started and cannot accept new players.' });
      } else {
        cb({ status: 'error', message: err.message });
      }
    }
  });

  socket.on('join_game', ({ gameId, playerName, numTickets = 1 }, cb) => {
    try {
      console.log(`Player ${playerName} attempting to join game: ${gameId}`);
      const result = gameManager.joinGame(gameId, socket.id, playerName, numTickets);
      const { tickets, players, reconnected, wasHost } = result;
      console.log(`Player ${playerName} successfully joined game ${gameId}. Reconnected: ${reconnected}`);
      socket.join(gameId);
      
      // Get the game to notify all players
      const game = gameManager.getGame(gameId);
      if (game) {
        if (reconnected) {
          // Notify all players about reconnection
          if (wasHost) {
            io.to(gameId).emit('host_reconnected', { 
              hostName: playerName,
              timestamp: Date.now()
            });
          } else {
            io.to(gameId).emit('player_reconnected', { 
              playerName,
              playerId: socket.id,
              timestamp: Date.now()
            });
          }
        }
        
        // Notify each player with updated player list and prizes
        Object.keys(game.players).forEach(playerId => {
          const playerList = gameManager.getPlayersForUser(gameId, playerId);
          io.to(playerId).emit('players_updated', { players: playerList });
          io.to(playerId).emit('prizes_updated', { 
            prizes: game.prizes, 
            totalTicketsSold: game.totalTicketsSold,
            totalRevenue: game.totalTicketsSold * game.pricePerTicket
          });
        });
      }
      
      cb({ status: 'ok', tickets, players, reconnected, wasHost });
    } catch (err) {
      console.log(`Error joining game ${gameId}:`, err.message);
      // Provide more helpful error messages
      if (err.message === 'Invalid game ID') {
        cb({ status: 'error', message: 'Game not found. It may have been cancelled or expired.' });
      } else if (err.message === 'Game already started') {
        cb({ status: 'error', message: 'This game has already started and cannot accept new players.' });
      } else {
        cb({ status: 'error', message: err.message });
      }
    }
  });

  socket.on('get_game_info', ({ gameId }, cb) => {
    try {
      const game = gameManager.getGame(gameId);
      if (game) {
        io.to(socket.id).emit('game_info', { 
          prizes: game.prizes,
          winners: game.winners,
          pricePerTicket: game.pricePerTicket,
          options: game.options
        });
      }
      cb({ status: 'ok' });
    } catch (err) {
      cb({ status: 'error', message: err.message });
    }
  });

  socket.on('start_game', ({ gameId }, cb) => {
    try {
      gameManager.startGame(gameId, socket.id);
      io.to(gameId).emit('game_started', { gameId });
      
      // Send game info to all players when game starts
      const game = gameManager.getGame(gameId);
      if (game) {
        io.to(gameId).emit('game_info', { 
          prizes: game.prizes,
          winners: game.winners,
          options: game.options
        });
      }
      
      cb({ status: 'ok' });
    } catch (err) {
      cb({ status: 'error', message: err.message });
    }
  });

  socket.on('cancel_game', ({ gameId }, cb) => {
    try {
      gameManager.cancelGame(gameId, socket.id);
      io.to(gameId).emit('game_cancelled', { reason: 'Host cancelled the game' });
      cb({ status: 'ok' });
    } catch (err) {
      cb({ status: 'error', message: err.message });
    }
  });

  socket.on('draw_number', ({ gameId, number: chosenNumber }, cb) => {
    try {
      const number = gameManager.drawNumber(gameId, socket.id, chosenNumber);
      io.to(gameId).emit('number_drawn', { number });
      cb({ status: 'ok', number });
    } catch (err) {
      cb({ status: 'error', message: err.message });
    }
  });

  socket.on('claim', ({ gameId, claimType, lines }, cb) => {
    // claimType: 'line', 'corners', 'early5', or 'house'
    try {
      const result = gameManager.validateClaim(gameId, socket.id, claimType, lines);
      if (result.valid) {
        const game = gameManager.getGame(gameId);
        let prizeMessage = '';
        let prizeAmount = 0;
        let lineIndex = null;
        
        if (claimType === 'line') {
          const lineNames = { topLine: 'Top Line', middleLine: 'Middle Line', bottomLine: 'Bottom Line' };
          prizeMessage = lineNames[result.lineType];
          prizeAmount = game.prizes[result.lineType];
          lineIndex = lines?.[0] ?? 0;
        } else if (claimType === 'corners') {
          prizeMessage = 'Corners';
          prizeAmount = game.prizes.corners;
        } else if (claimType === 'early5') {
          prizeMessage = 'Early 5';
          prizeAmount = game.prizes.early5;
        } else if (claimType === 'house') {
          if (result.housePosition) {
            prizeMessage = `Full House #${result.housePosition}`;
            prizeAmount = result.prizeAmount;
          } else {
            prizeMessage = 'Full House';
            prizeAmount = game.prizes.house;
          }
        }
        
        io.to(gameId).emit('claim_success', { 
          playerId: socket.id, 
          playerName: result.playerName,
          claimType,
          prizeMessage,
          prizeAmount,
          lineIndex,
          ticketIndex: result.ticketIndex,
          housePosition: result.housePosition
        });
        
        // Check if all prizes are claimed and end game early if so
        gameManager.checkGameCompletion(gameId);
      } else {
        socket.emit('claim_failed', { reason: result.reason });
      }
      cb(result);
    } catch (err) {
      cb({ status: 'error', message: err.message });
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('User disconnected', socket.id, 'Reason:', reason);
    
    // Clear heartbeat interval
    clearInterval(heartbeatInterval);
    
    // Get game info before removing player
    const gameId = gameManager.playerGameMap.get(socket.id);
    const game = gameId ? gameManager.getGame(gameId) : null;
    const wasHost = game && game.host === socket.id;
    
    // Remove player and handle disconnection
    gameManager.removePlayer(socket.id);
    
    // Notify remaining players about disconnection
    if (game && gameId) {
      if (wasHost) {
        // Host disconnected - notify all players
        io.to(gameId).emit('host_disconnected', { 
          reason: 'Host has disconnected',
          timestamp: Date.now(),
          gameWillEndIn: game.started ? 10 * 60 * 1000 : 0 // 10 minutes if game started, immediate if not
        });
      } else {
        // Regular player disconnected - notify remaining players
        const playerName = game.players[socket.id]?.name || 'Unknown Player';
        io.to(gameId).emit('player_disconnected', { 
          playerName,
          playerId: socket.id,
          timestamp: Date.now()
        });
        
        // Update player list for remaining players
        Object.keys(game.players).forEach(playerId => {
          if (playerId !== socket.id) {
            const playerList = gameManager.getPlayersForUser(gameId, playerId);
            io.to(playerId).emit('players_updated', { players: playerList });
          }
        });
      }
    }
  });
});

server.listen(PORT, () => console.log(`Tambola server listening on port ${PORT}`)); 