const { v4: uuidv4 } = require('uuid');
const { generateTicket } = require('./ticket');

class GameManager {
  constructor(io) {
    this.io = io;
    this.games = new Map(); // gameId -> game object
    this.playerGameMap = new Map(); // socketId -> gameId
  }

  createGame(hostSocketId, hostName) {
    const gameId = uuidv4().slice(0, 6);
    const game = {
      id: gameId,
      host: hostSocketId,
      players: {}, // socketId -> { name, ticket, status }
      drawnNumbers: [],
      remainingNumbers: Array.from({ length: 90 }, (_, i) => i + 1),
      started: false,
      winners: {
        line: null,
        house: null,
      },
    };
    // add host as first player
    const ticket = generateTicket();
    game.players[hostSocketId] = {
      name: hostName || 'Host',
      ticket,
      status: {},
    };

    this.games.set(gameId, game);
    this.playerGameMap.set(hostSocketId, gameId);
    return { gameId, ticket, players: [game.players[hostSocketId].name] };
  }

  joinGame(gameId, socketId, playerName) {
    const game = this.games.get(gameId);
    if (!game) throw new Error('Invalid game ID');
    if (game.started) throw new Error('Game already started');

    const ticket = generateTicket();
    game.players[socketId] = {
      name: playerName || 'Player',
      ticket,
      status: {},
    };
    this.playerGameMap.set(socketId, gameId);
    const players = Object.values(game.players).map(p => p.name);
    return { ticket, players };
  }

  startGame(gameId, socketId) {
    const game = this.games.get(gameId);
    if (!game) throw new Error('Invalid game ID');
    if (socketId !== game.host) throw new Error('Only host can start the game');
    game.started = true;
  }

  drawNumber(gameId, socketId, chosenNumber = null) {
    const game = this.games.get(gameId);
    if (!game) throw new Error('Invalid game ID');
    if (socketId !== game.host) throw new Error('Only host can draw numbers');
    if (!game.started) throw new Error('Game not started');
    if (game.remainingNumbers.length === 0) throw new Error('All numbers drawn');

    let number;
    if (chosenNumber) {
      if (!game.remainingNumbers.includes(chosenNumber)) {
        throw new Error('Number already drawn or invalid');
      }
      // remove chosenNumber from remainingNumbers
      game.remainingNumbers = game.remainingNumbers.filter((n) => n !== chosenNumber);
      number = chosenNumber;
    } else {
      const idx = Math.floor(Math.random() * game.remainingNumbers.length);
      number = game.remainingNumbers.splice(idx, 1)[0];
    }
    game.drawnNumbers.push(number);
    return number;
  }

  validateClaim(gameId, socketId, claimType, lines) {
    const game = this.games.get(gameId);
    if (!game) throw new Error('Invalid game ID');
    const player = game.players[socketId];
    if (!player) throw new Error('Player not in game');

    // Basic validation: all claimed numbers should be in drawnNumbers
    const { ticket } = player;
    const flatTicketNumbers = ticket.flat().filter(Boolean);
    const claimedNumbers = flatTicketNumbers.filter((n) => game.drawnNumbers.includes(n));

    if (claimType === 'line') {
      if (game.winners.line) {
        return { valid: false, reason: 'Line already claimed' };
      }
      const lineIndex = lines?.[0] ?? 0;
      const lineNumbers = ticket[lineIndex].filter(Boolean);
      const allCalled = lineNumbers.every((n) => game.drawnNumbers.includes(n));
      if (allCalled) {
        game.winners.line = player.name;
        return { valid: true };
      }
      return { valid: false, reason: 'Not all numbers called' };
    } else if (claimType === 'house') {
      if (game.winners.house) {
        return { valid: false, reason: 'House already claimed' };
      }
      const allCalled = flatTicketNumbers.every((n) => game.drawnNumbers.includes(n));
      if (allCalled) {
        game.winners.house = player.name;
        return { valid: true };
      }
      return { valid: false, reason: 'Not all numbers called' };
    }
    return { valid: false, reason: 'Invalid claim type' };
  }

  removePlayer(socketId) {
    const gameId = this.playerGameMap.get(socketId);
    if (!gameId) return;
    const game = this.games.get(gameId);
    if (!game) return;
    delete game.players[socketId];
    this.playerGameMap.delete(socketId);
    this.io.to(gameId).emit('player_left', { playerId: socketId });

    // If host left or no players, end game
    if (socketId === game.host || Object.keys(game.players).length === 0) {
      this.games.delete(gameId);
      this.io.to(gameId).emit('game_ended');
    }
  }
}

module.exports = { GameManager }; 