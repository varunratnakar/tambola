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
  allowEIO3: false
});

const PORT = process.env.PORT || 4000;

const gameManager = new GameManager(io);

// Basic health check
app.get('/', (_, res) => res.send('Tambola server is running'));

io.on('connection', (socket) => {
  console.log('A user connected', socket.id);

  socket.on('create_game', ({ pricePerTicket, prizes, numTickets = 1 }, cb) => {
    try {
      const { gameId, tickets, players } = gameManager.createGame(socket.id, pricePerTicket, prizes, numTickets);
      socket.join(gameId);
      cb({ status: 'ok', gameId, tickets, players });
    } catch (err) {
      cb({ status: 'error', message: err.message });
    }
  });

  socket.on('get_game_details', ({ gameId }, cb) => {
    try {
      const gameDetails = gameManager.getGameDetails(gameId);
      cb({ status: 'ok', gameDetails });
    } catch (err) {
      cb({ status: 'error', message: err.message });
    }
  });

  socket.on('join_game', ({ gameId, playerName, numTickets = 1 }, cb) => {
    try {
      const { tickets, players } = gameManager.joinGame(gameId, socket.id, playerName, numTickets);
      socket.join(gameId);
      
      // Get the game to notify all players
      const game = gameManager.getGame(gameId);
      if (game) {
        // Notify each player with updated player list
        Object.keys(game.players).forEach(playerId => {
          const playerList = gameManager.getPlayersForUser(gameId, playerId);
          io.to(playerId).emit('players_updated', { players: playerList });
        });
      }
      
      cb({ status: 'ok', tickets, players });
    } catch (err) {
      cb({ status: 'error', message: err.message });
    }
  });

  socket.on('get_game_info', ({ gameId }, cb) => {
    try {
      const game = gameManager.getGame(gameId);
      if (game) {
        io.to(socket.id).emit('game_info', { 
          prizes: game.prizes,
          winners: game.winners 
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
          winners: game.winners 
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
    // claimType: 'line', 'corners', or 'house'
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
        } else if (claimType === 'house') {
          prizeMessage = 'Full House';
          prizeAmount = game.prizes.house;
        }
        
        io.to(gameId).emit('claim_success', { 
          playerId: socket.id, 
          playerName: result.playerName,
          claimType,
          prizeMessage,
          prizeAmount,
          lineIndex,
          ticketIndex: result.ticketIndex
        });
      } else {
        socket.emit('claim_failed', { reason: result.reason });
      }
      cb(result);
    } catch (err) {
      cb({ status: 'error', message: err.message });
    }
  });

  socket.on('disconnect', () => {
    gameManager.removePlayer(socket.id);
    console.log('User disconnected', socket.id);
  });
});

server.listen(PORT, () => console.log(`Tambola server listening on port ${PORT}`)); 