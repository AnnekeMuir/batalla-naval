import { useState } from "react";
import "./App.css";
import Parser from "./Parser";

function App() {
  const { rowCounts, colCounts, grid, setGrid, GRID_SIZE } = Parser();

  function handleLeftClick(row: number, col: number): void {
    setGrid((prevGrid) =>
      prevGrid.map((currentRow, r) =>
        currentRow.map((cell, c) =>
          r === row && c === col && cell !== "blocked" && cell !== "ship"
            ? cell === "filled"
              ? "blank"
              : "filled"
            : cell,
        ),
      ),
    );
  }

  function handleRightClick(row: number, col: number): void {
    setGrid((prevGrid) =>
      prevGrid.map((currentRow, r) =>
        currentRow.map((cell, c) =>
          r === row && c === col && cell !== "blocked" && cell !== "ship"
            ? cell === "crossed"
              ? "blank"
              : "crossed"
            : cell,
        ),
      ),
    );
  }

  function submit(): void {
    var finalRowCounts = Array(GRID_SIZE).fill(0);
    var finalColCounts = Array(GRID_SIZE).fill(0);

    grid.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell === "filled") {
          finalRowCounts[r]++;
          finalColCounts[c]++;
        }
      });
    });

    // check against the original rowCounts and colCounts
  }

  return (
    <main className="app">
      <h1>Battleships</h1>
      <p>Click a cell to toggle it between black and white.</p>

      <div className="table">
        <div className="grid">
          {grid.map((row, r) =>
            row.map((cell, c) => (
              <button
                key={`${r}-${c}`}
                className={`cell ${cell}`}
                onClick={() => handleLeftClick(r, c)}
                onContextMenu={(event) => {
                  event.preventDefault();
                  handleRightClick(r, c);
                }}
                aria-label={`Row ${r + 1}, column ${c + 1}`}
              />
            )),
          )}
        </div>
        <div className="row-labels">
          {rowCounts.map((count, r) => (
            <div key={r}>{count}</div>
          ))}
        </div>
        <div className="col-labels">
          {colCounts.map((count, c) => (
            <div key={c}>{count}</div>
          ))}
        </div>
        <div className="empty"></div>
      </div>

      <button className="submit-button" onClick={submit}>
        Submit
      </button>
    </main>
  );
}

export default App;
