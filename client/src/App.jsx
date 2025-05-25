import React, { useState } from 'react';
import Lobby from './components/Lobby';
import GameBoard from './components/GameBoard';

function App() {
  const [phase, setPhase] = useState('lobby'); // lobby or game
  const [gameData, setGameData] = useState(null);

  const handleStartGame = (data) => {
    setGameData(data);
    setPhase('game');
  };

  return (
    <div className="max-w-3xl mx-auto p-4 font-sans">
      <h1 className="text-3xl font-bold text-center mb-4">Tambola Online</h1>
      {phase === 'lobby' && <Lobby onStart={handleStartGame} />}
      {phase === 'game' && <GameBoard {...gameData} />}
    </div>
  );
}

export default App; 