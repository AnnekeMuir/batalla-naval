import { useState } from "react";

type Coordinate = [number, number];
type EditorCell = "blank" | "blocked" | "filled";
type EditorMode = "answer" | "visible" | "blocked";

const GRID_SIZE = 10;

function createEmptyGrid(): boolean[][] {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(false));
}

function PuzzleEditor() {
  // All correct ship positions
  const [answerCells, setAnswerCells] = useState<boolean[][]>(createEmptyGrid);

  // Which answer cells are shown to the player
  const [visibleCells, setVisibleCells] =
    useState<boolean[][]>(createEmptyGrid);

  // Cells unavailable to the player
  const [blockedCells, setBlockedCells] =
    useState<boolean[][]>(createEmptyGrid);

  const [mode, setMode] = useState<EditorMode>("answer");

  function handleCellClick(row: number, col: number) {
    if (mode === "answer") {
      const addingShip = !answerCells[row][col];

      setAnswerCells((prev) =>
        prev.map((currentRow, r) =>
          currentRow.map((cell, c) => (r === row && c === col ? !cell : cell)),
        ),
      );

      // A cell removed from the answer cannot remain visible.
      if (!addingShip) {
        setVisibleCells((prev) =>
          prev.map((currentRow, r) =>
            currentRow.map((cell, c) =>
              r === row && c === col ? false : cell,
            ),
          ),
        );
      }

      // Ship cells and blocked cells cannot overlap.
      if (addingShip) {
        setBlockedCells((prev) =>
          prev.map((currentRow, r) =>
            currentRow.map((cell, c) =>
              r === row && c === col ? false : cell,
            ),
          ),
        );
      }
    } else if (mode === "visible") {
      // Only answer cells can be revealed.
      if (!answerCells[row][col]) return;

      setVisibleCells((prev) =>
        prev.map((currentRow, r) =>
          currentRow.map((cell, c) => (r === row && c === col ? !cell : cell)),
        ),
      );
    } else {
      // Blocked cells cannot overlap ships.
      if (answerCells[row][col]) return;

      setBlockedCells((prev) =>
        prev.map((currentRow, r) =>
          currentRow.map((cell, c) => (r === row && c === col ? !cell : cell)),
        ),
      );
    }
  }

  function exportPuzzle() {
    const toCoordinates = (cells: boolean[][]): Coordinate[] => {
      const coordinates: Coordinate[] = [];

      cells.forEach((row, r) => {
        row.forEach((cell, c) => {
          if (cell) coordinates.push([r + 1, c + 1]);
        });
      });

      return coordinates;
    };

    const formatCoordinates = (cells: boolean[][]) =>
      toCoordinates(cells)
        .map(([r, c]) => `(${r},${c})`)
        .join(" ");

    const text = [
      `shipCells: ${formatCoordinates(visibleCells)}`,
      `answerCells: ${formatCoordinates(answerCells)}`,
      `blockedCells: ${formatCoordinates(blockedCells)}`,
    ].join("\n");

    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "puzzle.txt";
    link.click();

    URL.revokeObjectURL(url);
  }

  function clearGrid() {
    setAnswerCells(createEmptyGrid());
    setVisibleCells(createEmptyGrid());
    setBlockedCells(createEmptyGrid());
  }

  function getCellState(row: number, col: number): EditorCell {
    if (visibleCells[row][col]) return "filled";
    if (answerCells[row][col]) return "filled";
    if (blockedCells[row][col]) return "blocked";
    return "blank";
  }

  return (
    <>
      <h1>Puzzle Editor</h1>
      <p>Create the answer key, then choose which ships to reveal.</p>

      <div className="editor-buttons">
        <button
          onClick={() => setMode("answer")}
          aria-pressed={mode === "answer"}
        >
          Place Answer Ships
        </button>

        <button
          onClick={() => setMode("visible")}
          aria-pressed={mode === "visible"}
        >
          Reveal Ships
        </button>

        <button
          onClick={() => setMode("blocked")}
          aria-pressed={mode === "blocked"}
        >
          Place Blocked Cells
        </button>
      </div>

      <p>
        {mode === "answer" &&
          "Click cells to add or remove ships from the answer key."}
        {mode === "visible" &&
          "Click black ship cells to show or hide them in the puzzle."}
        {mode === "blocked" &&
          "Click cells to add or remove grey blocked cells."}
      </p>

      <div className="grid">
        {answerCells.map((row, r) =>
          row.map((_, c) => {
            const state = getCellState(r, c);

            return (
              <button
                key={`${r}-${c}`}
                className={`cell ${state}`}
                onClick={() => handleCellClick(r, c)}
                aria-label={`Row ${r + 1}, column ${c + 1}`}
              />
            );
          }),
        )}
      </div>

      <p>
        Answer ships: {answerCells.flat().filter(Boolean).length} | Revealed:{" "}
        {visibleCells.flat().filter(Boolean).length} | Blocked:{" "}
        {blockedCells.flat().filter(Boolean).length}
      </p>

      <div className="editor-buttons">
        <button onClick={clearGrid}>Clear Grid</button>
        <button onClick={exportPuzzle}>Export Puzzle</button>
      </div>
    </>
  );
}

export default PuzzleEditor;
