import { useEffect, useRef, useState } from "react";
import shipKey from "../assets/battleship-key.png";

type Coordinate = [number, number];

type Puzzle = {
  shipCells: Coordinate[];
  answerCells: Coordinate[];
  blockedCells: Coordinate[];
};

const puzzleFiles = import.meta.glob("../puzzles/*.txt", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

type CellState =
  | "blank"
  | "crossed"
  | "filled"
  | "blocked"
  | "ship"
  | "maybe"
  | "maybe-cross";
type InputMode = "ship" | "cross" | "maybe" | "maybe-cross";

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
  answerCells: Coordinate[],
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
  const [inputMode, setInputMode] = useState<InputMode>("ship");
  const [imageError, setImageError] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Refs keep drag information up to date immediately, without waiting
  // for React to re-render.
  const isDraggingRef = useRef(false);
  const dragModeRef = useRef<InputMode | null>(null);
  const lastDraggedCell = useRef<string | null>(null);
  const dragButtonRef = useRef<number | null>(null);

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

  function crossOutCell(row: number, col: number) {
    setGrid((prevGrid) =>
      prevGrid.map((currentRow, r) =>
        currentRow.map((cell, c) => {
          if (r !== row || c !== col) return cell;

          if (cell === "blocked" || cell === "ship") return cell;

          return cell === "crossed" ? "blank" : "crossed";
        }),
      ),
    );

    setMessage("");
  }

  // Mark a cell according to the mode selected at the start of the drag.
  function markCell(row: number, col: number) {
    const mode = dragModeRef.current;
    const cellKey = `${row}-${col}`;

    if (!mode || lastDraggedCell.current === cellKey) return;

    lastDraggedCell.current = cellKey;

    if (dragModeRef.current === "cross") {
      crossOutCell(row, col);
    } else if (dragModeRef.current === "maybe") {
      toggleMaybeCell(row, col);
    } else if (dragModeRef.current === "maybe-cross") {
      toggleMaybeCrossCell(row, col);
    } else if (dragModeRef.current === "ship") {
      handleLeftClick(row, col);
    }
  }

  function handleGridPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!isDraggingRef.current) return;

    const element = document.elementFromPoint(event.clientX, event.clientY);

    const cell = element?.closest<HTMLButtonElement>("[data-row][data-col]");

    if (!cell) return;

    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);

    markCell(row, col);
  }

  function stopDragging() {
    isDraggingRef.current = false;
    dragModeRef.current = null;
    lastDraggedCell.current = null;
    dragButtonRef.current = null;
  }

  // Stop dragging even if the user releases their finger or mouse
  // outside the grid.
  useEffect(() => {
    window.addEventListener("pointerup", stopDragging);
    window.addEventListener("pointercancel", stopDragging);
    window.addEventListener("blur", stopDragging);

    return () => {
      window.removeEventListener("pointerup", stopDragging);
      window.removeEventListener("pointercancel", stopDragging);
      window.removeEventListener("blur", stopDragging);
    };
  }, []);

  function toggleMaybeCell(row: number, col: number) {
    setGrid((prev) =>
      prev.map((gridRow, r) =>
        gridRow.map((cell, c) => {
          if (r !== row || c !== col) return cell;
          if (cell === "blocked" || cell === "ship") return cell;

          return cell === "maybe" ? "blank" : "maybe";
        }),
      ),
    );
  }

  function toggleMaybeCrossCell(row: number, col: number) {
    setGrid((prev) =>
      prev.map((gridRow, r) =>
        gridRow.map((cell, c) => {
          if (r !== row || c !== col) return cell;
          if (cell === "blocked" || cell === "ship") return cell;

          return cell === "maybe-cross" ? "blank" : "maybe-cross";
        }),
      ),
    );
  }

  const loadPuzzleText = (text: string) => {
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

    const blockedSet = new Set(
      parsed.blockedCells.map(([r, c]) => `${r},${c}`),
    );

    const visibleIsValid = parsed.shipCells.every(([r, c]) =>
      answerSet.has(`${r},${c}`),
    );

    const overlapsBlocked = parsed.answerCells.some(([r, c]) =>
      blockedSet.has(`${r},${c}`),
    );

    if (!visibleIsValid || overlapsBlocked) {
      setMessage(
        "Invalid puzzle: revealed ships must be in the answer, and ships cannot overlap blocked cells.",
      );
      return;
    }

    stopDragging();
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
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const puzzleNumber = params.get("puzzle");

    if (!puzzleNumber) return;

    const entry = Object.entries(puzzleFiles).find(([path]) =>
      path.endsWith(`/puzzle${puzzleNumber}.txt`),
    );

    if (entry) {
      loadPuzzleText(entry[1]);
    } else {
      setMessage("Puzzle not found.");
    }
  }, []);

  const loadRandomPuzzle = () => {
    const entries = Object.entries(puzzleFiles);

    if (entries.length === 0) {
      setMessage("No preset puzzles found.");
      return;
    }

    const [path, text] = entries[Math.floor(Math.random() * entries.length)];

    loadPuzzleText(text);

    const match = path.match(/puzzle(\d+)\.txt$/);

    if (match) {
      const url = new URL(window.location.href);
      url.searchParams.set("puzzle", match[1]);
      window.history.replaceState({}, "", url);
    }
  };

  function submit() {
    if (!puzzle) return;

    const playerSet = new Set<string>();

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

  const handlePuzzleUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      loadPuzzleText(text);
    } catch {
      setMessage("Unable to read the puzzle file.");
    }

    event.target.value = "";
  };

  const resetPuzzle = () => {
    const isConfirmed = window.confirm(
      "Are you sure you want to reset? This will clear all your progress.",
    );

    if (!isConfirmed || !puzzle) return;

    stopDragging();

    setGrid(
      Array.from({ length: GRID_SIZE }, (_, row) =>
        Array.from({ length: GRID_SIZE }, (_, col) => {
          if (puzzle.blockedCells.some(([r, c]) => r === row && c === col)) {
            return "blocked";
          }

          if (puzzle.shipCells.some(([r, c]) => r === row && c === col)) {
            return "ship";
          }

          return "blank";
        }),
      ),
    );

    setMessage("");
  };

  return (
    <>
      <h1>Battleships</h1>

      <details className="how-to-play">
        <summary>How to Play</summary>

        <div className="how-to-play-content">
          <p>
            Fill in the grid to find all the hidden ships. The numbers along the
            sides and top of the grid show how many ship pieces belong in each
            row and column.
          </p>

          <p>
            <strong>The fleet consists of 10 ships:</strong>
          </p>

          <div>
            {imageError ? (
              <ul>
                <li>1 ship that is 4 squares long: ⬛⬛⬛⬛</li>
                <li>2 ships that are 3 squares long: ⬛⬛⬛, ⬛⬛⬛</li>
                <li>3 ships that are 2 squares long: ⬛⬛, ⬛⬛, ⬛⬛</li>
                <li>4 ships that are 1 square long: ⬛, ⬛, ⬛, ⬛</li>
              </ul>
            ) : (
              <img
                src={shipKey}
                alt="Ship key"
                className="battleship-image"
                onError={() => setImageError(true)}
              />
            )}
          </div>
          <p>
            Revealed ship pieces have white dots. Circles represent standalone
            ships. A square is a middle piece of a ship, while a rounded edge
            marks an end. Use the orientation to help you find connected pieces.
          </p>
          <p>
            <strong>
              Ships cannot touch each other, including diagonally.
            </strong>
          </p>
          <p>Grey squares are blocked and cannot be changed.</p>
          <p>
            Plan mode lets you mark possible ship or water locations you are
            unsure about. These marks don't count towards your answer when
            submitting.
          </p>
          <p>
            <em>Stuck? Try finding where the largest ship can fit.</em>
          </p>
        </div>
      </details>

      <div className="puzzle-controls">
        <button onClick={loadRandomPuzzle}>Random Puzzle</button>

        <button
          type="button"
          className="upload-button"
          onClick={() => fileInputRef.current?.click()}
        >
          Upload Puzzle
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,text/plain"
          onChange={handlePuzzleUpload}
          hidden
        />
      </div>

      {!puzzle ? (
        <p>Choose a puzzle file or select Random Puzzle to start playing.</p>
      ) : (
        <>
          <p className="desktop-instructions">
            Left-click to place ships, or right-click and drag to mark empty.
            Toggle Plan to mark possible ship or water locations.
          </p>

          <p className="mobile-instructions">
            Tap and drag to mark cells. Use the buttons to switch between the
            four modes below.
          </p>

          <div className="table" onContextMenu={(e) => e.preventDefault()}>
            <div className="grid" onPointerMove={handleGridPointerMove}>
              {grid.map((row, r) =>
                row.map((cell, c) => {
                  const shipShape =
                    cell === "ship"
                      ? getShipShape(r, c, puzzle.answerCells)
                      : "";

                  return (
                    <button
                      data-row={r}
                      data-col={c}
                      key={`${r}-${c}`}
                      type="button"
                      className={`cell ${cell} ${shipShape}`}
                      onPointerDown={(event) => {
                        if (event.pointerType === "mouse") {
                          if (event.button !== 0 && event.button !== 2) return;

                          // Lock the drag mode based on the selected input mode and mouse button.
                          if (event.button === 2 && inputMode === "maybe") {
                            dragModeRef.current = "maybe-cross";
                          } else if (event.button === 2) {
                            dragModeRef.current = "cross";
                          } else if (inputMode === "maybe") {
                            dragModeRef.current = "maybe";
                          } else {
                            dragModeRef.current = "ship";
                          }
                        } else {
                          // Touch uses the selected mobile mode.
                          dragModeRef.current = inputMode;
                        }

                        event.preventDefault();

                        isDraggingRef.current = true;
                        dragButtonRef.current =
                          event.pointerType === "mouse" ? event.button : null;
                        lastDraggedCell.current = null;

                        markCell(r, c);
                      }}
                      onPointerEnter={(event) => {
                        if (!isDraggingRef.current || !dragModeRef.current) {
                          return;
                        }

                        // Only continue mouse dragging while its original
                        // button is held. Touch uses pointer events directly.
                        if (
                          event.pointerType === "mouse" &&
                          event.buttons !==
                            (dragButtonRef.current === 2 ? 2 : 1)
                        ) {
                          return;
                        }

                        markCell(r, c);
                      }}
                      onContextMenu={(event) => event.preventDefault()}
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

          <div className="input-modes">
            <button
              type="button"
              className={
                inputMode === "ship" ? "mode-button active" : "mode-button"
              }
              onClick={() => setInputMode("ship")}
            >
              Place Ships
            </button>

            <button
              type="button"
              className={
                inputMode === "cross" ? "mode-button active" : "mode-button"
              }
              onClick={() => setInputMode("cross")}
            >
              Mark Empty
            </button>

            <button
              type="button"
              className={
                inputMode === "maybe" ? "mode-button active" : "mode-button"
              }
              onClick={() => setInputMode("maybe")}
            >
              Plan Ships
            </button>

            <button
              type="button"
              className={
                inputMode === "maybe-cross"
                  ? "mode-button active"
                  : "mode-button"
              }
              onClick={() => setInputMode("maybe-cross")}
            >
              Plan Empty
            </button>
          </div>

          {/* Desktop control: Plan only */}
          <div className="desktop-plan">
            <button
              type="button"
              className={
                inputMode === "maybe" ? "mode-button active" : "mode-button"
              }
              aria-pressed={inputMode === "maybe"}
              onClick={() =>
                setInputMode((current) =>
                  current === "maybe" ? "ship" : "maybe",
                )
              }
            >
              {inputMode === "maybe" ? "Plan mode on" : "Plan mode off"}
            </button>
          </div>

          <button type="button" className="reset-button" onClick={resetPuzzle}>
            Reset Puzzle
          </button>

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
