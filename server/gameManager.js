const { generateTicket } = require('./ticket');

class GameManager {
  constructor(io) {
    this.io = io;
    this.games = new Map(); // gameId -> game object
    this.playerGameMap = new Map(); // socketId -> gameId
  }

  createGame(hostSocketId, pricePerTicket = 50, prizes = {}, numTickets = 1) {
    // Generate 3-letter game ID
    const generateGameId = () => {
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      let result = '';
      for (let i = 0; i < 3; i++) {
        result += letters.charAt(Math.floor(Math.random() * letters.length));
      }
      return result;
    };
    
    // Ensure unique game ID
    let gameId;
    do {
      gameId = generateGameId();
    } while (this.games.has(gameId));
    const game = {
      id: gameId,
      host: hostSocketId,
      players: {}, // socketId -> { name, tickets, status }
      drawnNumbers: [],
      remainingNumbers: Array.from({ length: 90 }, (_, i) => i + 1),
      started: false,
      pricePerTicket,
      prizes: {
        topLine: prizes.topLine || 100,
        middleLine: prizes.middleLine || 100,
        bottomLine: prizes.bottomLine || 100,
        corners: prizes.corners || 150,
        house: prizes.house || 500,
      },
      winners: {
        topLine: null,
        middleLine: null,
        bottomLine: null,
        corners: null,
        house: null,
      },
    };
    // Host doesn't get tickets - they just manage the game
    game.players[hostSocketId] = {
      name: 'Host',
      tickets: [], // Host has no tickets
      status: {},
    };

    this.games.set(gameId, game);
    this.playerGameMap.set(hostSocketId, gameId);
    // Return empty players list and no tickets for host
    return { gameId, tickets: [], players: [] };
  }

  joinGame(gameId, socketId, playerName, numTickets = 1) {
    const game = this.games.get(gameId?.toUpperCase?.() || gameId);
    if (!game) throw new Error('Invalid game ID');
    
    // Check if this is a reconnection (player with same name exists)
    const existingPlayer = Object.values(game.players).find(p => p.name === playerName && p.disconnected);
    if (existingPlayer) {
      // This is a reconnection - restore the player
      const oldSocketId = Object.keys(game.players).find(id => game.players[id] === existingPlayer);
      if (oldSocketId) {
        // Move player data to new socket ID
        game.players[socketId] = { ...existingPlayer, disconnected: false, reconnectedAt: Date.now() };
        delete game.players[oldSocketId];
        this.playerGameMap.set(socketId, gameId);
        
        // If this was the host reconnecting, restore host status
        if (oldSocketId === game.host) {
          game.host = socketId;
          delete game.hostDisconnectedAt;
        }
        
        // Return existing tickets and players
        const players = Object.entries(game.players)
          .filter(([socketId, player]) => socketId !== game.host && !player.disconnected)
          .map(([_, player]) => ({
            name: player.name,
            ticketCount: player.tickets.length
          }));
        return { tickets: existingPlayer.tickets, players, reconnected: true, wasHost: oldSocketId === game.host };
      }
    }
    
    if (game.started) throw new Error('Game already started');

    const tickets = [];
    for (let i = 0; i < Math.min(numTickets, 6); i++) { // Max 6 tickets per player
      tickets.push(generateTicket());
    }
    
    game.players[socketId] = {
      name: playerName,
      tickets,
      status: {},
      disconnected: false,
    };
    this.playerGameMap.set(socketId, gameId);
    
    // Return players with ticket counts (exclude host and disconnected players)
    const players = Object.entries(game.players)
      .filter(([socketId, player]) => socketId !== game.host && !player.disconnected)
      .map(([_, player]) => ({
        name: player.name,
        ticketCount: player.tickets.length
      }));
    return { tickets, players };
  }

  startGame(gameId, socketId) {
    const game = this.games.get(gameId?.toUpperCase?.() || gameId);
    if (!game) throw new Error('Invalid game ID');
    if (socketId !== game.host) throw new Error('Only host can start the game');
    game.started = true;
  }

  cancelGame(gameId, socketId) {
    const game = this.games.get(gameId?.toUpperCase?.() || gameId);
    if (!game) throw new Error('Invalid game ID');
    if (socketId !== game.host) throw new Error('Only host can cancel the game');
    
    // Clean up the game immediately
    this.games.delete(gameId);
    // Remove all players from the game mapping
    Object.keys(game.players).forEach(playerId => {
      this.playerGameMap.delete(playerId);
    });
  }

  drawNumber(gameId, socketId, chosenNumber = null) {
    const game = this.games.get(gameId?.toUpperCase?.() || gameId);
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
    
    // Check if game is complete (all numbers drawn)
    if (game.remainingNumbers.length === 0) {
      this.endGame(gameId, 'All numbers have been drawn!');
    }
    
    return number;
  }

  endGame(gameId, reason = 'Game ended') {
    const game = this.games.get(gameId?.toUpperCase?.() || gameId);
    if (!game) return;
    
    // Notify all players that the game has ended
    this.io.to(gameId).emit('game_completed', { 
      reason,
      winners: game.winners,
      totalNumbers: game.drawnNumbers.length
    });
    
    // Clean up the game after a short delay to allow players to see the message
    setTimeout(() => {
      this.games.delete(gameId);
      // Remove all players from the game mapping
      Object.keys(game.players).forEach(socketId => {
        this.playerGameMap.delete(socketId);
      });
    }, 5000); // 5 second delay
  }

  validateClaim(gameId, socketId, claimType, lines) {
    const game = this.games.get(gameId?.toUpperCase?.() || gameId);
    if (!game) throw new Error('Invalid game ID');
    const player = game.players[socketId];
    if (!player) throw new Error('Player not in game');

    const { tickets } = player;
    if (!tickets || tickets.length === 0) {
      return { valid: false, reason: 'No tickets found' };
    }

    // Scan all tickets to find a valid claim
    for (let ticketIndex = 0; ticketIndex < tickets.length; ticketIndex++) {
      const ticket = tickets[ticketIndex];
    const flatTicketNumbers = ticket.flat().filter(Boolean);

    if (claimType === 'line') {
      const lineIndex = lines?.[0] ?? 0;
      const lineTypes = ['topLine', 'middleLine', 'bottomLine'];
      const lineType = lineTypes[lineIndex];
      
      if (game.winners[lineType]) {
          continue; // This prize already claimed, check next ticket
      }
      
      const lineNumbers = ticket[lineIndex].filter(Boolean);
      const allCalled = lineNumbers.every((n) => game.drawnNumbers.includes(n));
      if (allCalled) {
        game.winners[lineType] = player.name;
          return { valid: true, lineType, playerName: player.name, ticketIndex };
      }
    } else if (claimType === 'corners') {
      if (game.winners.corners) {
          continue; // Prize already claimed, check next ticket
      }
      
      // Corner positions: [0,0], [0,8], [2,0], [2,8]
      const cornerNumbers = [
        ticket[0][0], ticket[0][8], ticket[2][0], ticket[2][8]
      ].filter(Boolean);
      
      const allCalled = cornerNumbers.every((n) => game.drawnNumbers.includes(n));
      if (allCalled) {
        game.winners.corners = player.name;
          return { valid: true, playerName: player.name, ticketIndex };
      }
      } else if (claimType === 'house') {
        if (game.winners.house) {
          continue; // Prize already claimed, check next ticket
        }
        
        const allCalled = flatTicketNumbers.every((n) => game.drawnNumbers.includes(n));
        if (allCalled) {
          game.winners.house = player.name;
          return { valid: true, playerName: player.name, ticketIndex };
        }
      }
    }

    // No valid claim found in any ticket
    if (claimType === 'line') {
      const lineIndex = lines?.[0] ?? 0;
      const lineTypes = ['Top Line', 'Middle Line', 'Bottom Line'];
      const lineType = lineTypes[lineIndex];
      
      if (game.winners[['topLine', 'middleLine', 'bottomLine'][lineIndex]]) {
        return { valid: false, reason: `${lineType} already claimed` };
      }
      return { valid: false, reason: `${lineType} not complete on any ticket` };
    } else if (claimType === 'corners') {
      if (game.winners.corners) {
        return { valid: false, reason: 'Corners already claimed' };
      }
      return { valid: false, reason: 'Corners not complete on any ticket' };
    } else if (claimType === 'house') {
      if (game.winners.house) {
        return { valid: false, reason: 'House already claimed' };
      }
      return { valid: false, reason: 'House not complete on any ticket' };
    }
    
    return { valid: false, reason: 'Invalid claim type' };
  }

  removePlayer(socketId) {
    const gameId = this.playerGameMap.get(socketId);
    if (!gameId) return;
    const game = this.games.get(gameId);
    if (!game) return;
    
    // Don't immediately remove players - they might reconnect
    // Just mark them as disconnected
    if (game.players[socketId]) {
      game.players[socketId].disconnected = true;
      game.players[socketId].disconnectedAt = Date.now();
    }
    
    this.playerGameMap.delete(socketId);
    this.io.to(gameId).emit('player_left', { playerId: socketId });

    // Handle host disconnection
    if (socketId === game.host) {
      if (!game.started) {
        // Host left before game started - cancel immediately
        this.games.delete(gameId);
        this.io.to(gameId).emit('game_cancelled', { reason: 'Host left the game' });
        // Clean up all player mappings
        Object.keys(game.players).forEach(playerId => {
          this.playerGameMap.delete(playerId);
        });
      } else {
        // Host left during game - keep game running for 10 minutes
        game.hostDisconnectedAt = Date.now();
        
        // Set a timer to end the game if host doesn't reconnect
        setTimeout(() => {
          const currentGame = this.games.get(gameId);
          if (currentGame && currentGame.players[socketId]?.disconnected) {
      this.games.delete(gameId);
            this.io.to(gameId).emit('game_cancelled', { 
              reason: 'Host disconnected for too long (10 minutes)' 
            });
            // Clean up all player mappings
            Object.keys(currentGame.players).forEach(playerId => {
              this.playerGameMap.delete(playerId);
            });
          }
        }, 10 * 60 * 1000); // 10 minutes
      }
    }
    
    // Clean up completely disconnected games after 30 minutes
    setTimeout(() => {
      const currentGame = this.games.get(gameId);
      if (currentGame) {
        const allDisconnected = Object.values(currentGame.players).every(player => 
          player.disconnected && (Date.now() - player.disconnectedAt) > 5 * 60 * 1000
        );
        if (allDisconnected) {
          this.games.delete(gameId);
          Object.keys(currentGame.players).forEach(playerId => {
            this.playerGameMap.delete(playerId);
          });
        }
      }
    }, 30 * 60 * 1000); // 30 minutes
  }

  getGame(gameId) {
    return this.games.get(gameId?.toUpperCase?.() || gameId);
  }

  getGameDetails(gameId) {
    const game = this.games.get(gameId?.toUpperCase?.() || gameId);
    if (!game) throw new Error('Invalid game ID');
    if (game.started) throw new Error('Game already started');
    
    // Count players excluding the host and disconnected players
    const playerCount = Object.entries(game.players)
      .filter(([socketId, player]) => socketId !== game.host && !player.disconnected)
      .length;
    
    return {
      pricePerTicket: game.pricePerTicket,
      prizes: game.prizes,
      playerCount
    };
  }

  getPlayersForUser(gameId, socketId) {
    const game = this.games.get(gameId?.toUpperCase?.() || gameId);
    if (!game) return [];
    
    // Return all players with ticket counts (exclude host and disconnected players)
    return Object.entries(game.players)
      .filter(([socketId, player]) => socketId !== game.host && !player.disconnected)
      .map(([_, player]) => ({
        name: player.name,
        ticketCount: player.tickets.length
      }));
  }
}

module.exports = { GameManager }; 