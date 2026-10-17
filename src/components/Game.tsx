import { useState } from "react";

type Coordinate = [number, number];
type Puzzle = {
  shipCells: Coordinate[];
  answerCells: Coordinate[];
  blockedCells: Coordinate[];
};

type CellState = "blank" | "crossed" | "filled" | "blocked" | "ship";

const GRID_SIZE = 10;

function parseCoordinates(line: string | undefined): Coordinate[] {
  if (!line) return [];

  return Array.from(
    line.matchAll(/\((\d+),\s*(\d+)\)/g),
    (match) => [Number(match[1]) - 1, Number(match[2]) - 1] as Coordinate,
  );
}

function parsePuzzle(text: string): Puzzle {
  const lines = text.split(/\r?\n/);

  const getLine = (name: string) =>
    lines.find((line) => line.trim().startsWith(`${name}:`));

  return {
    shipCells: parseCoordinates(getLine("shipCells")),
    answerCells: parseCoordinates(getLine("answerCells")),
    blockedCells: parseCoordinates(getLine("blockedCells")),
  };
}

function Game() {
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [grid, setGrid] = useState<CellState[][]>([]);
  const [message, setMessage] = useState("");

  async function loadPuzzle(file: File) {
    const text = await file.text();
    const parsed = parsePuzzle(text);

    const validCoordinates = [
      ...parsed.shipCells,
      ...parsed.answerCells,
      ...parsed.blockedCells,
    ].every(([r, c]) => r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE);

    if (!validCoordinates) {
      setMessage("Puzzle contains coordinates outside the grid.");
      return;
    }

    const answerSet = new Set(parsed.answerCells.map(([r, c]) => `${r},${c}`));

    const visibleIsValid = parsed.shipCells.every(([r, c]) =>
      answerSet.has(`${r},${c}`),
    );

    const blockedSet = new Set(
      parsed.blockedCells.map(([r, c]) => `${r},${c}`),
    );

    const overlapsBlocked = parsed.answerCells.some(([r, c]) =>
      blockedSet.has(`${r},${c}`),
    );

    if (!visibleIsValid || overlapsBlocked) {
      setMessage(
        "Puzzle is invalid: revealed ships must be in the answer, and ships cannot overlap blocked cells.",
      );
      return;
    }

    setPuzzle(parsed);
    setGrid(
      Array.from({ length: GRID_SIZE }, (_, r) =>
        Array.from({ length: GRID_SIZE }, (_, c) => {
          if (blockedSet.has(`${r},${c}`)) return "blocked";
          if (parsed.shipCells.some(([sr, sc]) => sr === r && sc === c)) {
            return "ship";
          }
          return "blank";
        }),
      ),
    );
    setMessage("");
  }

  const rowCounts = Array(GRID_SIZE).fill(0);
  const colCounts = Array(GRID_SIZE).fill(0);

  puzzle?.answerCells.forEach(([r, c]) => {
    rowCounts[r]++;
    colCounts[c]++;
  });

  function handleLeftClick(row: number, col: number) {
    setGrid((prev) =>
      prev.map((currentRow, r) =>
        currentRow.map((cell, c) => {
          if (r !== row || c !== col || cell === "blocked" || cell === "ship") {
            return cell;
          }
          return cell === "filled" ? "blank" : "filled";
        }),
      ),
    );
    setMessage("");
  }

  function handleRightClick(row: number, col: number) {
    setGrid((prev) =>
      prev.map((currentRow, r) =>
        currentRow.map((cell, c) => {
          if (r !== row || c !== col || cell === "blocked" || cell === "ship") {
            return cell;
          }
          return cell === "crossed" ? "blank" : "crossed";
        }),
      ),
    );
    setMessage("");
  }

  function submit() {
    if (!puzzle) return;

    const playerSet = new Set<string>();

    // Include the ships already revealed to the player.
    grid.forEach((row, r) =>
      row.forEach((cell, c) => {
        if (cell === "ship" || cell === "filled") {
          playerSet.add(`${r},${c}`);
        }
      }),
    );

    const answerSet = new Set(puzzle.answerCells.map(([r, c]) => `${r},${c}`));

    const correct =
      playerSet.size === answerSet.size &&
      [...answerSet].every((coordinate) => playerSet.has(coordinate));

    setMessage(
      correct ? "Correct! You solved the puzzle!" : "Not quite. Keep trying!",
    );
  }

  return (
    <>
      <h1>Play Battleships</h1>

      <label>
        Load puzzle file:{" "}
        <input
          type="file"
          accept=".txt,text/plain"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void loadPuzzle(file);
          }}
        />
      </label>

      {message && <p>{message}</p>}

      {!puzzle ? (
        <p>Choose a puzzle.txt file to start playing.</p>
      ) : (
        <>
          <p>Left-click to fill a cell. Right-click to cross it out.</p>

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

            <div className="empty" />
          </div>

          <button className="submit-button" onClick={submit}>
            Submit
          </button>
        </>
      )}
    </>
  );
}

export default Game;
