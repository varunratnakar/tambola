// Generates a 3x9 Tambola ticket according to official rules
// Rules:
// - 3 rows × 9 columns grid
// - Exactly 15 numbers (unique, ranging from 1-90)
// - No row has more than 5 numbers
// - No column is empty
// - Numbers in every column are in ascending order from top to bottom
// - Column ranges: 1-9, 10-19, 20-29, 30-39, 40-49, 50-59, 60-69, 70-79, 80-90

function generateTicket() {
  const ranges = [
    [1, 9],
    [10, 19],
    [20, 29],
    [30, 39],
    [40, 49],
    [50, 59],
    [60, 69],
    [70, 79],
    [80, 90],
  ];

  // Initialize empty 3x9 grid
  const ticket = Array.from({ length: 3 }, () => Array(9).fill(null));
  
  // Step 1: Determine which columns will have numbers for each row
  // We need exactly 5 numbers per row (15 total) and no column can be empty
  
  // Create a distribution pattern: each row gets 5 columns, ensuring all 9 columns are used
  const rowColumnAssignments = [[], [], []]; // Which columns each row will use
  
  // Start by ensuring each column appears at least once
  const availableColumns = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  shuffle(availableColumns);
  
  // Assign one column to each row first (9 columns, 3 rows, so 3 columns per row minimum)
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 3; i++) {
      rowColumnAssignments[row].push(availableColumns[row * 3 + i]);
    }
  }
  
  // Now we need to assign 6 more column slots (2 per row) to reach 5 per row
  // Randomly distribute the remaining slots
  const remainingSlots = [];
  for (let col = 0; col < 9; col++) {
    remainingSlots.push(col, col); // Each column can appear in up to 2 additional rows
  }
  shuffle(remainingSlots);
  
  // Assign 2 more columns to each row
  for (let row = 0; row < 3; row++) {
    let assigned = 0;
    for (let i = 0; i < remainingSlots.length && assigned < 2; i++) {
      const col = remainingSlots[i];
      if (!rowColumnAssignments[row].includes(col)) {
        rowColumnAssignments[row].push(col);
        assigned++;
        remainingSlots.splice(i, 1); // Remove this slot
        i--; // Adjust index after removal
      }
    }
  }
  
  // Step 2: Generate numbers for each column and place them
  for (let col = 0; col < 9; col++) {
    const [min, max] = ranges[col];
    const availableNumbers = shuffle(range(min, max));
    
    // Find which rows will have numbers in this column
    const rowsForThisColumn = [];
    for (let row = 0; row < 3; row++) {
      if (rowColumnAssignments[row].includes(col)) {
        rowsForThisColumn.push(row);
      }
    }
    
    // Assign numbers to these rows in ascending order
    const numbersForColumn = availableNumbers.slice(0, rowsForThisColumn.length).sort((a, b) => a - b);
    
    rowsForThisColumn.forEach((row, index) => {
      ticket[row][col] = numbersForColumn[index];
    });
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

module.exports = { generateTicket }; 