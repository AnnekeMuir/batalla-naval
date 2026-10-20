import { useState } from "react";
import "./index.css";
import Game from "./components/Game.tsx";
import PuzzleEditor from "./components/PuzzleEditor.tsx";

function App() {
  const [mode, setMode] = useState<"game" | "editor">("game");

  return (
    <main className="app">
      {mode === "game" ? (
        <>
          <button className="nav-button" onClick={() => setMode("editor")}>
            To puzzle editor
          </button>
          <Game />
        </>
      ) : (
        <>
          <button className="nav-button" onClick={() => setMode("game")}>
            To game
          </button>
          <PuzzleEditor />
        </>
      )}
    </main>
  );
}

export default App;
