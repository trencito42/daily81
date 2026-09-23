"use client";

import React from "react";
import { CellState } from "@/lib/sudoku/types";
import { getRow, getCol, getBlock } from "@/lib/sudoku/validate";

interface SudokuBoardProps {
  cells: CellState[];
  selectedIndex: number | null;
  onSelectCell: (index: number) => void;
  highlightMatching?: boolean;
  highlightRelated?: boolean;
}

export function SudokuBoard({
  cells,
  selectedIndex,
  onSelectCell,
  highlightMatching = true,
  highlightRelated = true,
}: SudokuBoardProps) {
  const selectedCell = selectedIndex !== null ? cells[selectedIndex] : null;
  const selectedValue = selectedCell && selectedCell.value !== 0 ? selectedCell.value : null;
  const selectedRow = selectedCell ? selectedCell.row : null;
  const selectedCol = selectedCell ? selectedCell.col : null;
  const selectedBlock = selectedCell ? selectedCell.block : null;

  return (
    <div className="sudoku-container" role="grid" aria-label="Sudoku Board 9x9">
      <div className="sudoku-grid">
        {cells.map((cell) => {
          const isSelected = selectedIndex === cell.index;
          const isPeer =
            highlightRelated &&
            !isSelected &&
            (cell.row === selectedRow || cell.col === selectedCol || cell.block === selectedBlock);

          const isMatching =
            highlightMatching &&
            !isSelected &&
            selectedValue !== null &&
            cell.value === selectedValue;

          const isBlockRight = cell.col === 2 || cell.col === 5;
          const isBlockBottom = cell.row === 2 || cell.row === 5;
          const isEdgeRight = cell.col === 8;
          const isEdgeBottom = cell.row === 8;

          const classNames = [
            "sudoku-cell",
            isSelected ? "selected" : "",
            isPeer ? "peer-highlight" : "",
            isMatching ? "match-highlight" : "",
            cell.given ? "is-given" : "is-user",
            cell.isMistake ? "is-mistake" : "",
            isBlockRight ? "block-right" : "",
            isBlockBottom ? "block-bottom" : "",
            isEdgeRight ? "edge-right" : "",
            isEdgeBottom ? "edge-bottom" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <div
              key={cell.index}
              role="gridcell"
              aria-selected={isSelected}
              aria-label={`Row ${cell.row + 1}, Column ${cell.col + 1}${
                cell.value !== 0 ? `, value ${cell.value}` : ", empty"
              }`}
              tabIndex={isSelected ? 0 : -1}
              className={classNames}
              onClick={() => onSelectCell(cell.index)}
            >
              {cell.value !== 0 ? (
                <span className={cell.isMistake ? "animate-pop" : ""}>{cell.value}</span>
              ) : cell.notes && cell.notes.length > 0 ? (
                <div className="cell-notes-grid">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <div key={num} className="cell-note">
                      {cell.notes.includes(num) ? num : ""}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
