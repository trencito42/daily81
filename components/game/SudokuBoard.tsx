"use client";

import React from "react";
import { CellState } from "@/lib/sudoku/types";

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
      {/* 3x3 Hand-drawn Divider Stroke Overlay */}
      <svg
        className="sudoku-dividers-overlay"
        viewBox="0 0 900 900"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {/* Vertical divider after Col 3 (x=300) */}
        <path
          d="M 300,2 Q 299.5,450 300.2,898"
          fill="none"
          stroke="var(--ink-primary)"
          strokeWidth="2.2"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {/* Vertical divider after Col 6 (x=600) */}
        <path
          d="M 600,2 Q 600.6,450 599.8,898"
          fill="none"
          stroke="var(--ink-primary)"
          strokeWidth="2.2"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {/* Horizontal divider after Row 3 (y=300) */}
        <path
          d="M 2,300 Q 450,299.4 898,300.3"
          fill="none"
          stroke="var(--ink-primary)"
          strokeWidth="2.2"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {/* Horizontal divider after Row 6 (y=600) */}
        <path
          d="M 2,600 Q 450,600.5 898,599.7"
          fill="none"
          stroke="var(--ink-primary)"
          strokeWidth="2.2"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* Underlying 9x9 Mathematical Grid */}
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

          const isEdgeRight = cell.col === 8;
          const isEdgeBottom = cell.row === 8;

          const classNames = [
            "sudoku-cell",
            isSelected ? "selected" : "",
            isPeer ? "peer-highlight" : "",
            isMatching ? "match-highlight" : "",
            cell.given ? "is-given" : "is-user",
            cell.isMistake ? "is-mistake" : "",
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
