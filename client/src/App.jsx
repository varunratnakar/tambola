import React, { useState } from 'react';
import Lobby from './components/Lobby';
import GameBoard from './components/GameBoard';

function App() {
  const [phase, setPhase] = useState('lobby');
  const [gameData, setGameData] = useState(null);

  const startGame = (data) => {
    setGameData(data);
    setPhase('game');
  };

  const goToLobby = () => {
    setPhase('lobby');
    setGameData(null);
  };

  return (
    <div className="flex flex-col min-h-screen bg-purple-50">
      <header className="bg-gradient-to-r from-purple-700 to-pink-700 text-white py-3 text-center shadow-md">
        <h1 className="text-2xl font-extrabold tracking-wide" style={{ fontFamily: 'Fredoka One' }}>
          🎉 Tambola Fun! 🎊
        </h1>
      </header>
      <main className="flex-1">
        {phase === 'lobby' ? <Lobby onStart={startGame} /> : <GameBoard {...gameData} onBackToLobby={goToLobby} />}
      </main>
    </div>
  );
}

export default App; 