const { generateTicket, generateTickets } = require('./ticket');

class GameManager {
  constructor(io) {
    this.io = io;
    this.games = new Map(); // gameId -> game object
    this.playerGameMap = new Map(); // socketId -> gameId
  }

  createGame(hostSocketId, hostName, pricePerTicket = 50, numTickets = 1, gameOptions = {}) {
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
      totalTicketsSold: 0, // Track total tickets sold
      prizes: {
        topLine: 0,
        middleLine: 0,
        bottomLine: 0,
        corners: 0,
        house: 0,
        early5: 0,
      },
      winners: {
        topLine: null,
        middleLine: null,
        bottomLine: null,
        corners: null,
        house: [], // Array to store multiple house winners
        early5: null,
      },
      options: {
        enableEarly5: gameOptions.enableEarly5 || false,
        enableMultipleHouses: gameOptions.enableMultipleHouses || false,
        maxHouseWinners: gameOptions.maxHouseWinners || 3,
        houseReductionPercent: gameOptions.houseReductionPercent || 50, // Each subsequent house gets 50% of previous
        autoDrawInterval: gameOptions.autoDrawInterval || 15, // Default 15 seconds
        enableBogey: gameOptions.enableBogey || false,
      },
      // Auto-draw settings
      autoDrawEnabled: false,
      autoDrawInterval: 10, // Default 10 seconds
      autoDrawTimer: null,
    };

    // Host now gets tickets like any other player
    const hostTickets = generateTickets(Math.min(numTickets, 6));
    game.players[hostSocketId] = {
      name: hostName,
      tickets: hostTickets,
      status: {},
      isHost: true, // Mark as host for special privileges
      disconnected: false,
    };

    // Update total tickets sold and calculate initial prizes
    game.totalTicketsSold = numTickets;
    this.calculatePrizes(game);

    this.games.set(gameId, game);
    this.playerGameMap.set(hostSocketId, gameId);
    
    // Return tickets and initial player list for host
    const players = [{
      name: hostName,
      ticketCount: hostTickets.length
    }];
    
    return { gameId, tickets: hostTickets, players };
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
        
        // If game is running and auto-draw is stopped, resume it
        if (game.started && !game.autoDrawEnabled && !game.autoDrawTimer && game.remainingNumbers.length > 0) {
          const interval = game.autoDrawInterval || game.options?.autoDrawInterval || 15;
          this.startAutoDraw(gameId, interval);
        }
        
        // Return existing tickets and players (no need to recalculate prizes for reconnection)
        const players = Object.entries(game.players)
          .filter(([socketId, player]) => !player.disconnected)
          .map(([_, player]) => ({
            name: player.name,
            ticketCount: player.tickets.length,
            isHost: player.isHost || false
          }));
        return { tickets: existingPlayer.tickets, players, reconnected: true, wasHost: oldSocketId === game.host };
      }
    }
    
    if (game.started) throw new Error('Game already started');

    // Use the new strip-based generator for better ticket distribution
    const tickets = generateTickets(Math.min(numTickets, 6)); // Max 6 tickets per player
    
    game.players[socketId] = {
      name: playerName,
      tickets,
      status: {},
      disconnected: false,
    };
    this.playerGameMap.set(socketId, gameId);
    
    // Update total tickets sold and recalculate prizes
    game.totalTicketsSold += numTickets;
    this.calculatePrizes(game);
    
    // Return players with ticket counts (exclude disconnected players)
    const players = Object.entries(game.players)
      .filter(([socketId, player]) => !player.disconnected)
      .map(([_, player]) => ({
        name: player.name,
        ticketCount: player.tickets.length,
        isHost: player.isHost || false
      }));
    return { tickets, players };
  }

  startGame(gameId, socketId) {
    const game = this.games.get(gameId?.toUpperCase?.() || gameId);
    if (!game) throw new Error('Invalid game ID');
    if (socketId !== game.host) throw new Error('Only host can start the game');
    game.started = true;
    
    // Auto-start number drawing after 5 seconds using host's chosen interval
    setTimeout(() => {
      const game = this.games.get(gameId);
      const interval = game?.options?.autoDrawInterval || 15;
      this.startAutoDraw(gameId, interval);
    }, 5000);
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

  drawNumber(gameId, socketId = null, chosenNumber = null) {
    const game = this.games.get(gameId?.toUpperCase?.() || gameId);
    if (!game) throw new Error('Invalid game ID');
    // Remove host-only restriction - anyone can draw (but this will mainly be server-called)
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

  endGame(gameId, reason = 'Game ended') {
    const game = this.games.get(gameId?.toUpperCase?.() || gameId);
    if (!game) return;
    
    // Clear any pending grace timer so it doesn't fire again
    if (game.lastNumberGraceTimer) {
      clearTimeout(game.lastNumberGraceTimer);
      game.lastNumberGraceTimer = null;
    }

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

  validateClaim(gameId, socketId, claimType, lines = [], markedNumbersMap = {}) {
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
      const markedNumbersForTicket = markedNumbersMap?.[ticketIndex] || [];

      if (claimType === 'line') {
        const lineIndex = lines?.[0] ?? 0;
        const lineTypes = ['topLine', 'middleLine', 'bottomLine'];
        const lineType = lineTypes[lineIndex];
        
        if (game.winners[lineType]) {
            continue; // This prize already claimed, check next ticket
        }
        
        const lineNumbers = ticket[lineIndex].filter(Boolean);
        const allCalled = lineNumbers.every((n) => game.drawnNumbers.includes(n) && markedNumbersForTicket.includes(n));
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
        
        const allCalled = cornerNumbers.every((n) => game.drawnNumbers.includes(n) && markedNumbersForTicket.includes(n));
        if (allCalled) {
          game.winners.corners = player.name;
            return { valid: true, playerName: player.name, ticketIndex };
        }
      } else if (claimType === 'early5') {
        if (!game.options.enableEarly5 || game.winners.early5) {
          continue; // Early 5 not enabled or already claimed
        }
        
        const calledNumbers = flatTicketNumbers.filter(n => game.drawnNumbers.includes(n) && markedNumbersForTicket.includes(n));
        if (calledNumbers.length >= 5) {
          game.winners.early5 = player.name;
          return { valid: true, playerName: player.name, ticketIndex };
        }
      } else if (claimType === 'house') {
        // Check if multiple houses are allowed and if limit is reached
        if (!game.options.enableMultipleHouses && game.winners.house.length > 0) {
          continue; // Multiple houses not enabled and one already claimed
        }
        if (game.winners.house.length >= game.options.maxHouseWinners) {
          continue; // Maximum house winners reached
        }
        
        // Check if this player already won a house
        const playerAlreadyWonHouse = game.winners.house.some(winner => winner.playerName === player.name);
        if (playerAlreadyWonHouse) {
          continue; // Player already won a house
        }
        
        const allCalled = flatTicketNumbers.every((n) => game.drawnNumbers.includes(n) && markedNumbersForTicket.includes(n));
        if (allCalled) {
          const housePosition = game.winners.house.length + 1;
          let prizeAmount = game.prizes.house;
          
          // Calculate reduced prize for subsequent houses
          for (let i = 1; i < housePosition; i++) {
            prizeAmount = Math.floor(prizeAmount * (game.options.houseReductionPercent / 100));
          }
          
          game.winners.house.push({
            playerName: player.name,
            position: housePosition,
            prizeAmount: prizeAmount
          });
          
          return { valid: true, playerName: player.name, ticketIndex, housePosition, prizeAmount };
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
    } else if (claimType === 'early5') {
      if (!game.options.enableEarly5) {
        return { valid: false, reason: 'Early 5 not enabled for this game' };
      }
      if (game.winners.early5) {
        return { valid: false, reason: 'Early 5 already claimed' };
      }
      return { valid: false, reason: 'Need at least 5 numbers called on any ticket' };
    } else if (claimType === 'house') {
      if (!game.options.enableMultipleHouses && game.winners.house.length > 0) {
        return { valid: false, reason: 'Full House already claimed' };
      }
      if (game.winners.house.length >= game.options.maxHouseWinners) {
        return { valid: false, reason: 'Maximum Full House winners reached' };
      }
      const playerAlreadyWonHouse = game.winners.house.some(winner => winner.playerName === player.name);
      if (playerAlreadyWonHouse) {
        return { valid: false, reason: 'You already won a Full House' };
      }
      return { valid: false, reason: 'Full House not complete on any ticket' };
    }
    
    return { valid: false, reason: 'Invalid claim type' };
  }

  calculatePrizes(game) {
    const totalRevenue = game.totalTicketsSold * game.pricePerTicket;
    
    // Prize distribution percentages
    const distribution = {
      topLine: 0.15,      // 15%
      middleLine: 0.15,   // 15%
      bottomLine: 0.15,   // 15%
      corners: 0.10,      // 10%
      house: 0.35,        // 35%
      early5: 0.05,       // 5%
      // Remaining 5% goes to host as commission
    };
    
    // Calculate base prizes
    game.prizes.topLine = Math.floor(totalRevenue * distribution.topLine);
    game.prizes.middleLine = Math.floor(totalRevenue * distribution.middleLine);
    game.prizes.bottomLine = Math.floor(totalRevenue * distribution.bottomLine);
    game.prizes.corners = Math.floor(totalRevenue * distribution.corners);
    game.prizes.house = Math.floor(totalRevenue * distribution.house);
    
    // Only set Early 5 prize if enabled
    if (game.options.enableEarly5) {
      game.prizes.early5 = Math.floor(totalRevenue * distribution.early5);
    } else {
      game.prizes.early5 = 0;
      // Add Early 5 percentage to house if not enabled
      game.prizes.house += Math.floor(totalRevenue * distribution.early5);
    }
  }

  checkGameCompletion(gameId) {
    const game = this.games.get(gameId?.toUpperCase?.() || gameId);
    if (!game) return false;

    // Check 1: No more active players left
    const activePlayers = Object.values(game.players).filter(player => !player.disconnected);
    if (activePlayers.length === 0) {
      console.log(`Game ${gameId} ending: No players remaining`);
      this.stopAutoDraw(gameId);
      this.endGame(gameId, 'Game ended - no players remaining');
      return true;
    }

    // Check 2: No more numbers left to draw
    if (game.remainingNumbers.length === 0) {
      // All numbers have been drawn, but give players some time to make their final claims
      const gracePeriodMs = (game.options?.postLastNumberGraceSeconds || 10) * 1000; // default 10 s

      // Stop auto-draw so the timer isn't needlessly firing
      this.stopAutoDraw(gameId);

      // If a grace timer is not already running, start one
      if (!game.lastNumberGraceTimer) {
        console.log(`Game ${gameId}: all numbers drawn. Starting ${gracePeriodMs / 1000}s grace period before ending.`);
        game.lastNumberGraceTimer = setTimeout(() => {
          // End the game if it hasn't ended for some other reason
          if (this.games.has(gameId)) {
            console.log(`Game ${gameId}: grace period elapsed – ending game.`);
            this.endGame(gameId, 'Game completed – all numbers were drawn and grace period elapsed');
          }
        }, gracePeriodMs);
      }

      // Don't end the game immediately – allow claims during grace period
      return false;
    }

    // Check 3: All prizes are claimed
    const allPrizesClaimed = 
      game.winners.topLine && 
      game.winners.middleLine && 
      game.winners.bottomLine && 
      game.winners.corners && 
      (!game.options.enableEarly5 || game.winners.early5) &&
      (game.options.enableMultipleHouses ? 
        game.winners.house.length >= game.options.maxHouseWinners : 
        game.winners.house.length > 0);

    if (allPrizesClaimed) {
      console.log(`Game ${gameId} ending: All prizes claimed`);
      this.stopAutoDraw(gameId);
      this.endGame(gameId, 'Game completed - all prizes have been claimed!');
      return true;
    }
    
    return false;
  }

  // Auto-draw functionality - now server-managed
  startAutoDraw(gameId, interval = 15) {
    const game = this.games.get(gameId?.toUpperCase?.() || gameId);
    if (!game || !game.started) return false;

    // Clear any existing timer
    this.stopAutoDraw(gameId);

    game.autoDrawEnabled = true;
    game.autoDrawInterval = interval;
    
    console.log(`Starting auto-draw for game ${gameId} with ${interval}s interval`);
    
    // Start the auto-draw timer
    game.autoDrawTimer = setInterval(() => {
      const drawnNumber = this.drawNextNumber(gameId);
      if (drawnNumber) {
        // console.log(`Auto-drew number ${drawnNumber} for game ${gameId}`);
        this.io.to(gameId).emit('number_drawn', { 
          number: drawnNumber, 
          drawnNumbers: game.drawnNumbers,
          remainingCount: game.remainingNumbers.length,
          autoDrawn: true
        });
      }
    }, interval * 1000);

    // Notify players that auto-draw started
    this.io.to(gameId).emit('auto_draw_started', { interval });
    return true;
  }

  stopAutoDraw(gameId) {
    const game = this.games.get(gameId?.toUpperCase?.() || gameId);
    if (!game) return false;

    game.autoDrawEnabled = false;
    if (game.autoDrawTimer) {
      clearInterval(game.autoDrawTimer);
      game.autoDrawTimer = null;
    }
    // Emit event so clients can update UI
    this.io.to(gameId).emit('auto_draw_stopped');
    return true;
  }

  drawNextNumber(gameId) {
    const game = this.games.get(gameId?.toUpperCase?.() || gameId);
    if (!game || !game.started) {
      this.stopAutoDraw(gameId);
      return null;
    }

    // Check if game should end before drawing
    if (this.checkGameCompletion(gameId)) {
      return null;
    }

    // If no numbers left, game completion check above will handle it
    if (game.remainingNumbers.length === 0) {
      return null;
    }

    // Draw a random number
    const randomIndex = Math.floor(Math.random() * game.remainingNumbers.length);
    const drawnNumber = game.remainingNumbers.splice(randomIndex, 1)[0];
    game.drawnNumbers.push(drawnNumber);

    // Check if game should end after drawing (e.g., if this was the last number)
    setTimeout(() => {
      this.checkGameCompletion(gameId);
    }, 100); // Small delay to allow the number to be processed

    return drawnNumber;
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
    const playerName = game.players[socketId]?.name || 'Unknown';
    this.io.to(gameId).emit('player_left', { playerId: socketId, playerName });

    // Check if game should end due to no remaining players
    if (game.started) {
      this.checkGameCompletion(gameId);
    }

    // Handle host disconnection - game continues without host
    if (socketId === game.host) {
      if (!game.started) {
        // Host left before game started - cancel immediately
      this.games.delete(gameId);
        this.io.to(gameId).emit('game_cancelled', { reason: 'Host left before game started' });
        // Clean up all player mappings
        Object.keys(game.players).forEach(playerId => {
          this.playerGameMap.delete(playerId);
        });
      } else {
        // Host left during game - game continues automatically
        console.log(`Host left game ${gameId}, but game continues with server management`);
        this.io.to(gameId).emit('host_left', { 
          message: 'Host has left the game, but the game continues automatically!' 
        });
        // No need to set timers - game runs independently now
      }
    }
    
    // Clean up completely disconnected games after 10 minutes
    setTimeout(() => {
      const currentGame = this.games.get(gameId);
      if (currentGame) {
        const allDisconnected = Object.values(currentGame.players).every(player => 
          player.disconnected && (Date.now() - player.disconnectedAt) > 2 * 60 * 1000 // 2 minutes
        );
        if (allDisconnected) {
          console.log(`Cleaning up abandoned game ${gameId} - all players disconnected`);
          this.stopAutoDraw(gameId);
          this.games.delete(gameId);
          Object.keys(currentGame.players).forEach(playerId => {
            this.playerGameMap.delete(playerId);
          });
        }
      }
    }, 10 * 60 * 1000); // 10 minutes
  }

  getGame(gameId) {
    return this.games.get(gameId?.toUpperCase?.() || gameId);
  }

  getGameDetails(gameId) {
    const game = this.games.get(gameId?.toUpperCase?.() || gameId);
    if (!game) throw new Error('Invalid game ID');
    if (game.started) throw new Error('Game already started');
    
    // Count all connected players (including host since host is now also a player)
    const playerCount = Object.entries(game.players)
      .filter(([socketId, player]) => !player.disconnected)
      .length;
    
    return {
      pricePerTicket: game.pricePerTicket,
      prizes: game.prizes,
      playerCount,
      totalTicketsSold: game.totalTicketsSold,
      totalRevenue: game.totalTicketsSold * game.pricePerTicket,
      options: game.options
    };
  }

  getPlayersForUser(gameId, socketId) {
    const game = this.games.get(gameId?.toUpperCase?.() || gameId);
    if (!game) return [];
    
    // Return all connected players with ticket counts (including host since host is now also a player)
    return Object.entries(game.players)
      .filter(([socketId, player]) => !player.disconnected)
      .map(([playerId, player]) => ({
        name: player.name,
        ticketCount: player.tickets.length,
        isHost: playerId === game.host
      }));
  }

  // Pause auto-draw for a specified number of seconds and then resume automatically
  pauseAutoDraw(gameId, pauseSeconds = 8) {
    const game = this.games.get(gameId?.toUpperCase?.() || gameId);
    if (!game || !game.started) return false;

    // Stop current auto draw (also emits auto_draw_stopped)
    this.stopAutoDraw(gameId);

    // Clear any existing resume timer
    if (game.autoDrawResumeTimer) {
      clearTimeout(game.autoDrawResumeTimer);
      game.autoDrawResumeTimer = null;
    }

    // Schedule auto draw to resume
    game.autoDrawResumeTimer = setTimeout(() => {
      // Ensure game still exists and not completed/cancelled
      const currentGame = this.games.get(gameId);
      if (currentGame && !this.checkGameCompletion(gameId)) {
        const interval = currentGame.autoDrawInterval || currentGame?.options?.autoDrawInterval || 15;
        this.startAutoDraw(gameId, interval);
      }
    }, pauseSeconds * 1000);

    return true;
  }
}

module.exports = { GameManager }; 