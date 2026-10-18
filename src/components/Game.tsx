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

type ShipShape =
  | "single"
  | "horizontal-left"
  | "horizontal-middle"
  | "horizontal-right"
  | "vertical-top"
  | "vertical-middle"
  | "vertical-bottom";

function getShipShape(
  row: number,
  col: number,
  answerCells: [number, number][],
): ShipShape {
  const hasShip = (r: number, c: number) =>
    answerCells.some(([sr, sc]) => sr === r && sc === c);

  const above = hasShip(row - 1, col);
  const below = hasShip(row + 1, col);
  const left = hasShip(row, col - 1);
  const right = hasShip(row, col + 1);

  if (!above && !below && !left && !right) return "single";

  if (left || right) {
    if (!left && right) return "horizontal-left";
    if (left && !right) return "horizontal-right";
    return "horizontal-middle";
  }

  if (!above && below) return "vertical-top";
  if (above && !below) return "vertical-bottom";

  return "vertical-middle";
}

function Game() {
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [grid, setGrid] = useState<CellState[][]>([]);
  const [message, setMessage] = useState("");
  const [isDragging, setIsDragging] = useState(false);

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

  function crossOutCell(row: number, col: number) {
    setGrid((prevGrid) =>
      prevGrid.map((currentRow, r) =>
        currentRow.map((cell, c) => {
          if (r !== row || c !== col) return cell;

          // Don't change blocked cells or revealed ships
          if (cell === "blocked" || cell === "ship") return cell;

          // Toggle between crossed out and blank
          if (cell === "crossed") return "blank";

          return "crossed";
        }),
      ),
    );
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

      {!puzzle ? (
        <p>Choose a puzzle.txt file to start playing.</p>
      ) : (
        <>
          <p>Left-click to fill a cell. Right-click to cross it out.</p>

          <div className="table" onContextMenu={(e) => e.preventDefault()}>
            <div
              className="grid"
              onMouseUp={() => setIsDragging(false)}
              onMouseLeave={() => setIsDragging(false)}
            >
              {grid.map((row, r) =>
                row.map((cell, c) => {
                  const shipShape =
                    cell === "ship" && puzzle
                      ? getShipShape(r, c, puzzle.answerCells)
                      : "";

                  return (
                    <button
                      key={`${r}-${c}`}
                      className={`cell ${cell} ${shipShape}`}
                      onClick={() => {
                        if (!isDragging) {
                          handleLeftClick(r, c);
                        }
                      }}
                      onMouseDown={(event) => {
                        if (event.button === 2) {
                          setIsDragging(true);
                          crossOutCell(r, c);
                        }
                      }}
                      onMouseEnter={() => {
                        if (isDragging) {
                          crossOutCell(r, c);
                        }
                      }}
                      onContextMenu={(event) => {
                        event.preventDefault();
                      }}
                      aria-label={`Row ${r + 1}, column ${c + 1}`}
                    />
                  );
                }),
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

          {message && <p>{message}</p>}
        </>
      )}
    </>
  );
}

export default Game;
