// Generates a 3x9 Tambola ticket according to basic rules
// For simplicity, this implementation ensures each column has at most 3 numbers and each row has exactly 5 numbers, totalling 15.

function generateTicket() {
  const columns = Array.from({ length: 9 }, () => []);
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

  // Fill columns with numbers respecting column ranges
  for (let col = 0; col < 9; col++) {
    const [min, max] = ranges[col];
    const count = Math.floor(Math.random() * 3) + 1; // 1 to 3 numbers per column
    const numbers = shuffle(range(min, max)).slice(0, count).sort((a, b) => a - b);
    columns[col] = numbers;
  }

  // Now build rows: 3 rows, each should have 5 numbers
  const rows = Array.from({ length: 3 }, () => Array(9).fill(null));
  // Place numbers column-wise top-down
  columns.forEach((colNumbers, colIndex) => {
    colNumbers.forEach((num, idx) => {
      rows[idx][colIndex] = num;
    });
  });

  // Ensure each row has 5 numbers: if less, move numbers from rows with >5
  rows.forEach((row, rowIndex) => {
    let numbersInRow = row.filter(Boolean).length;
    while (numbersInRow > 5) {
      // remove a random number from this row and push to another row with <5
      const numIndices = row.map((v, i) => (v ? i : -1)).filter((i) => i !== -1);
      const removeIdx = numIndices[Math.floor(Math.random() * numIndices.length)];
      const num = row[removeIdx];
      // find target row with <5
      const targetRowIndex = rows.findIndex((r) => r.filter(Boolean).length < 5);
      if (targetRowIndex === -1) break;
      row[removeIdx] = null;
      rows[targetRowIndex][removeIdx] = num;
      numbersInRow = row.filter(Boolean).length;
    }
  });

  // If some rows still less than 5, redistribute
  rows.forEach((row) => {
    while (row.filter(Boolean).length < 5) {
      // pick a column with an empty cell in this row and number in another row
      const colIndex = row.findIndex((cell, i) => cell === null && rows.some((r) => r[i] && r !== row));
      if (colIndex === -1) break;
      const donorRow = rows.find((r) => r[colIndex] && r.filter(Boolean).length > 5);
      if (!donorRow) break;
      row[colIndex] = donorRow[colIndex];
      donorRow[colIndex] = null;
    }
  });

  return rows;
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