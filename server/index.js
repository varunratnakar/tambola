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

  socket.on('create_game', ({ hostName }, cb) => {
    try {
      const { gameId, ticket, players } = gameManager.createGame(socket.id, hostName);
      socket.join(gameId);
      cb({ status: 'ok', gameId, ticket, players });
    } catch (err) {
      cb({ status: 'error', message: err.message });
    }
  });

  socket.on('join_game', ({ gameId, playerName }, cb) => {
    try {
      const { ticket, players } = gameManager.joinGame(gameId, socket.id, playerName);
      socket.join(gameId);
      
      // Get the game to notify all players
      const game = gameManager.getGame(gameId);
      if (game) {
        // Notify each player with their personalized player list
        Object.keys(game.players).forEach(playerId => {
          const playerList = gameManager.getPlayersForUser(gameId, playerId);
          io.to(playerId).emit('players_updated', { players: playerList });
        });
      }
      
      cb({ status: 'ok', ticket, players });
    } catch (err) {
      cb({ status: 'error', message: err.message });
    }
  });

  socket.on('start_game', ({ gameId }, cb) => {
    try {
      gameManager.startGame(gameId, socket.id);
      io.to(gameId).emit('game_started', { gameId });
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
        let prizeMessage = '';
        if (claimType === 'line') {
          const lineNames = { topLine: 'Top Line', middleLine: 'Middle Line', bottomLine: 'Bottom Line' };
          prizeMessage = lineNames[result.lineType];
        } else if (claimType === 'corners') {
          prizeMessage = 'Corners';
        } else if (claimType === 'house') {
          prizeMessage = 'Full House';
        }
        
        io.to(gameId).emit('claim_success', { 
          playerId: socket.id, 
          playerName: result.playerName,
          claimType,
          prizeMessage 
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