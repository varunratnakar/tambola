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
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-6xl font-bold text-white mb-4 bounce-in" style={{ fontFamily: 'Fredoka One' }}>
            🎉 Tambola Fun! 🎊
          </h1>
          <p className="text-xl text-yellow-200 font-bold">
            The most exciting number game for kids! 🌟
          </p>
        </div>
        
        <div className="fun-card">
          {phase === 'lobby' && <Lobby onStart={handleStartGame} />}
          {phase === 'game' && <GameBoard {...gameData} />}
        </div>
      </div>
    </div>
  );
}

export default App; 