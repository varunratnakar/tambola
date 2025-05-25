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
    origin: '*',
  },
});

const PORT = process.env.PORT || 4000;

const gameManager = new GameManager(io);

// Basic health check
app.get('/', (_, res) => res.send('Tambola server is running'));

io.on('connection', (socket) => {
  console.log('A user connected', socket.id);

  socket.on('create_game', ({ hostName }, cb) => {
    try {
      const { gameId, ticket } = gameManager.createGame(socket.id, hostName);
      socket.join(gameId);
      cb({ status: 'ok', gameId, ticket });
    } catch (err) {
      cb({ status: 'error', message: err.message });
    }
  });

  socket.on('join_game', ({ gameId, playerName }, cb) => {
    try {
      const ticket = gameManager.joinGame(gameId, socket.id, playerName);
      socket.join(gameId);
      io.to(gameId).emit('player_joined', { playerName });
      cb({ status: 'ok', ticket });
    } catch (err) {
      cb({ status: 'error', message: err.message });
    }
  });

  socket.on('start_game', ({ gameId }, cb) => {
    try {
      gameManager.startGame(gameId, socket.id);
      io.to(gameId).emit('game_started');
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
    // claimType: 'line' or 'house'
    try {
      const result = gameManager.validateClaim(gameId, socket.id, claimType, lines);
      if (result.valid) {
        io.to(gameId).emit('claim_success', { playerId: socket.id, claimType });
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