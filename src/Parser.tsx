import { useState } from "react";
import puzzleText from "./assets/puzzle.txt?raw";

type Puzzle = {
  rowCounts: number[];
  colCounts: number[];
  shipCells: [number, number][];
  blockedCells: [number, number][];
};

function parsePuzzle(text: string): Puzzle {
  const lines = text.trim().split(/\r?\n/);

  const rowCounts = lines[0].split(": ")[1].split(" ").map(Number);

  const colCounts = lines[1].split(": ")[1].split(" ").map(Number);

  const shipLine = text
    .split("\n")
    .find((line) => line.startsWith("shipCells:"));
  const blockedLine = text
    .split("\n")
    .find((line) => line.startsWith("blockedCells:"));

  const parseCoordinates = (line: string | undefined): [number, number][] => {
    if (!line) return [];

    const matches = line.matchAll(/\((\d+),\s*(\d+)\)/g);

    return Array.from(matches, (match) => [
      Number(match[1]) - 1,
      Number(match[2]) - 1,
    ]);
  };

  return {
    rowCounts,
    colCounts,
    shipCells: parseCoordinates(shipLine),
    blockedCells: parseCoordinates(blockedLine),
  };
}

function Parser() {
  const { rowCounts, colCounts, blockedCells, shipCells } =
    parsePuzzle(puzzleText);
  const GRID_SIZE = 10;

  type CellState = "blank" | "crossed" | "filled" | "blocked" | "ship"; // Define the possible states for each cell
  type Grid = CellState[][]; // grid is a 2d array

  // Create an empty grid with all cells set to false (white)
  function createEmptyGrid(): Grid {
    const grid = Array.from({ length: GRID_SIZE }, () =>
      Array<CellState>(GRID_SIZE).fill("blank"),
    );

    blockedCells.forEach(([row, col]) => {
      grid[row][col] = "blocked";
    });

    shipCells.forEach(([row, col]) => {
      grid[row][col] = "ship";
    });

    return grid;
  }

  const [grid, setGrid] = useState<Grid>(createEmptyGrid);

  return { rowCounts, colCounts, grid, setGrid, GRID_SIZE };
}

export default Parser;
