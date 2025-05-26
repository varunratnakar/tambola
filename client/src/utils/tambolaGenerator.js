// tambola_generator.js
// Generates a strip of 6 Tambola tickets (3×9) using numbers 1–90 under standard rules.

/**
 * Generate a full strip of 6 tickets.
 * @returns {Array<Array<Array<number|null>>>} Array of 6 tickets, each ticket is 3 rows × 9 columns.
 */
function generateTambolaStrip() {
  // Define ranges for each of the 9 columns.
  const columnRanges = [
    { min: 1, max: 9 },
    { min: 10, max: 19 },
    { min: 20, max: 29 },
    { min: 30, max: 39 },
    { min: 40, max: 49 },
    { min: 50, max: 59 },
    { min: 60, max: 69 },
    { min: 70, max: 79 },
    { min: 80, max: 90 },
  ];

  // 1. Prepare and shuffle numbers in each column.
  const columnNumbers = columnRanges.map(({ min, max }) => {
    const arr = [];
    for (let n = min; n <= max; n++) arr.push(n);
    return shuffle(arr);
  });

  // 2. Determine how many numbers go into each column for each of the 6 tickets.
  let assignCounts;
  do {
    assignCounts = columnNumbers.map(nums => {
      const total = nums.length;
      // Start by giving each ticket 1 number (or 0 if fewer numbers than tickets)
      const base = Math.min(1, Math.floor(total / 6));
      const counts = Array(6).fill(base);
      let remaining = total - base * 6;
      // Distribute remaining randomly, capping at 3 per ticket
      const idxs = [...Array(6).keys()];
      while (remaining > 0) {
        shuffle(idxs);
        for (const i of idxs) {
          if (remaining === 0) break;
          if (counts[i] < 3) {
            counts[i]++;
            remaining--;
          }
        }
      }
      return counts;
    });
    // Check each ticket ends up with exactly 15 numbers
    const ticketTotals = Array(6).fill(0);
    assignCounts.forEach(col => col.forEach((c, t) => ticketTotals[t] += c));
    if (ticketTotals.every(sum => sum === 15)) break;
  } while (true);

  // 3. Build each ticket grid, assigning numbers to rows.
  const strip = [];
  for (let t = 0; t < 6; t++) {
    const counts = assignCounts.map(col => col[t]);
    const placement = assignRowsForTicket(counts);

    // Fill the ticket matrix
    const ticket = Array.from({ length: 3 }, () => Array(9).fill(null));
    for (let col = 0; col < 9; col++) {
      const nums = columnNumbers[col].splice(0, counts[col]).sort((a, b) => a - b);
      let idx = 0;
      for (let row = 0; row < 3; row++) {
        if (placement[row][col]) {
          ticket[row][col] = nums[idx++];
        }
      }
    }
    strip.push(ticket);
  }

  return strip;
}

/**
 * Shuffle an array in-place using Fisher–Yates.
 */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--; ) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Assigns positions in a 3×9 grid for one ticket,
 * given the number of entries needed in each column,
 * ensuring each row has exactly 5 entries.
 */
function assignRowsForTicket(colCounts) {
  const rows = 3, cols = 9;
  const placement = Array.from({ length: rows }, () => Array(cols).fill(0));
  const rowSums = Array(rows).fill(0);

  function backtrack(col) {
    if (col === cols) {
      return rowSums.every(sum => sum === 5);
    }
    const need = colCounts[col];
    for (const combo of getRowCombos(need)) {
      // Check feasibility
      let valid = combo.every((bit, r) => !bit || rowSums[r] < 5);
      if (!valid) continue;
      // Place
      combo.forEach((bit, r) => { if (bit) { placement[r][col] = 1; rowSums[r]++; } });
      if (backtrack(col + 1)) return true;
      // Unplace
      combo.forEach((bit, r) => { if (bit) { placement[r][col] = 0; rowSums[r]--; } });
    }
    return false;
  }

  if (!backtrack(0)) throw new Error('Failed to assign rows');
  return placement;
}

// Precomputed row combinations for 0–3 entries in a column
const rowCombosMap = {
  0: [[0,0,0]],
  1: [[1,0,0],[0,1,0],[0,0,1]],
  2: [[1,1,0],[1,0,1],[0,1,1]],
  3: [[1,1,1]],
};
function getRowCombos(n) { return rowCombosMap[n] || []; }

/**
 * Generate the specified number of tickets by slicing from a full strip
 * @param {number} numTickets - Number of tickets to generate (1-6)
 * @returns {Array<Array<Array<number|null>>>} Array of tickets
 */
export function generateTickets(numTickets = 1) {
  if (numTickets < 1 || numTickets > 6) {
    throw new Error('Number of tickets must be between 1 and 6');
  }
  
  const fullStrip = generateTambolaStrip();
  return fullStrip.slice(0, numTickets);
}

// Export the main function as well
export { generateTambolaStrip }; 