import { useState } from "react";
import "./App.css";
import Game from "./components/Game.tsx";
import PuzzleEditor from "./components/PuzzleEditor.tsx";

function App() {
  const [mode, setMode] = useState<"menu" | "game" | "editor">(() => {
    const params = new URLSearchParams(window.location.search);
    return params.has("puzzle") ? "game" : "menu";
  });

  return (
    <main className="app">
      {mode === "menu" ? (
        <>
          <h1>Battleships</h1>
          <p>Choose what you want to do.</p>

          <button onClick={() => setMode("game")}>Play Game</button>

          <button onClick={() => setMode("editor")}>Puzzle Editor</button>
        </>
      ) : (
        <>
          <button onClick={() => setMode("menu")}>Back to Menu</button>

          {mode === "game" && <Game />}
          {mode === "editor" && <PuzzleEditor />}
        </>
      )}
    </main>
  );
}

export default App;
