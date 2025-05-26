// Generates a 3x9 Tambola ticket according to official rules
// Rules:
// - 3 rows × 9 columns grid
// - Exactly 15 numbers (unique, ranging from 1-90)
// - No row has more than 5 numbers
// - No column is empty
// - Numbers in every column are in ascending order from top to bottom
// - Column ranges: 1-9, 10-19, 20-29, 30-39, 40-49, 50-59, 60-69, 70-79, 80-90

function generateTicket() {
  // Step 1 & 2: create 3×9 matrix filled with nulls and randomly choose 15 spots (max 5 per row)
  const ticket = Array.from({ length: 3 }, () => Array(9).fill(null));
  const rowCounts = [0, 0, 0];
  const chosenPositions = new Set();

  while (chosenPositions.size < 15) {
    const row = Math.floor(Math.random() * 3);
    const col = Math.floor(Math.random() * 9);

    if (rowCounts[row] >= 5) continue; // obey max 5 numbers per row

    const key = `${row}-${col}`;
    if (!chosenPositions.has(key)) {
      chosenPositions.add(key);
      rowCounts[row] += 1;
    }
  }

  // Step 3: fill the chosen indices with unique random numbers (1-90)
  const availableNumbers = shuffle(range(1, 90));
  let numIdx = 0;
  for (const pos of chosenPositions) {
    const [r, c] = pos.split('-').map(Number);
    ticket[r][c] = availableNumbers[numIdx++];
  }

  // Step 4: sort each column in ascending order (keeping empties on top)
  for (let col = 0; col < 9; col++) {
    const numbers = [];
    for (let row = 0; row < 3; row++) {
      if (ticket[row][col] !== null) numbers.push(ticket[row][col]);
    }
    numbers.sort((a, b) => a - b);

    // clear column
    for (let row = 0; row < 3; row++) ticket[row][col] = null;

    // place back starting from the top
    for (let row = 0; row < numbers.length; row++) {
      ticket[row][col] = numbers[row];
    }
  }

  return ticket;
}

function range(start, end) {
  const arr = [];
  for (let i = start; i <= end; i++) arr.push(i);
  return arr;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateTickets(numTickets = 1) {
  numTickets = Math.min(Math.max(numTickets, 1), 6); // Clamp between 1 and 6

  const tickets = [];
  const usedNumbers = new Set();
  const MAX_ATTEMPTS_PER_TICKET = 2000;

  for (let i = 0; i < numTickets; i++) {
    let attempts = 0;
    let ticket;

    while (attempts < MAX_ATTEMPTS_PER_TICKET) {
      ticket = generateTicket();
      const numbers = ticket.flat().filter(Boolean);
      const hasDuplicate = numbers.some((n) => usedNumbers.has(n));

      if (!hasDuplicate) {
        // Accept this ticket and mark its numbers as used
        numbers.forEach((n) => usedNumbers.add(n));
        tickets.push(ticket);
        break;
      }

      attempts++;
    }

    // If we could not generate a valid ticket after many attempts, restart the whole process
    if (attempts === MAX_ATTEMPTS_PER_TICKET) {
      return generateTickets(numTickets); // Recursive retry (very unlikely for ≤6 tickets)
    }
  }

  return tickets;
}

module.exports = { generateTicket, generateTickets }; 