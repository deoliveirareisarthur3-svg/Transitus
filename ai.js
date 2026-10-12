/*
 * TRANSITUS AI ENGINE
 * Strategic search with minimax and alpha-beta pruning.
 *
 * Board: 64 squares, row-major order.
 * "W" = White, "B" = Black, null = empty.
 *
 * Movement:
 * White moves up; Black moves down.
 * Both may move one square sideways.
 * No backward moves, diagonals, jumping, or capturing.
 */

(function () {
  "use strict";

  const SIZE = 8;
  const EMPTY = null;

  function opponent(color) {
    return color === "W" ? "B" : "W";
  }

  function goalRow(color) {
    return color === "W" ? 0 : 7;
  }

  function legalMoves(board, from) {
    const piece = board[from];
    if (piece !== "W" && piece !== "B") return [];

    const row = Math.floor(from / SIZE);
    const col = from % SIZE;
    const forward = piece === "W" ? -1 : 1;

    const candidates = [
      [row + forward, col],
      [row, col - 1],
      [row, col + 1]
    ];

    return candidates
      .filter(([r, c]) =>
        r >= 0 && r < SIZE &&
        c >= 0 && c < SIZE
      )
      .map(([r, c]) => r * SIZE + c)
      .filter(to => board[to] === EMPTY)
      .map(to => ({ from, to }));
  }

  function allLegalMoves(board, color) {
    const moves = [];

    for (let from = 0; from < SIZE * SIZE; from++) {
      if (board[from] !== color) continue;
      moves.push(...legalMoves(board, from));
    }

    return moves;
  }

  function applyMove(board, move) {
    const next = board.slice();
    next[move.to] = next[move.from];
    next[move.from] = EMPTY;
    return next;
  }

  function hasReachedGoal(board, color) {
    const row = goalRow(color);
    const start = row * SIZE;

    for (let col = 0; col < SIZE; col++) {
      if (board[start + col] === color) return true;
    }

    return false;
  }

  function evaluate(board, perspective) {
    const enemy = opponent(perspective);

    // A reached goal is the most important outcome.
    if (hasReachedGoal(board, perspective)) return 100000;
    if (hasReachedGoal(board, enemy)) return -100000;

    const myMoves = allLegalMoves(board, perspective);
    const enemyMoves = allLegalMoves(board, enemy);

    // A player with no legal move loses under Transitus rules.
    if (myMoves.length === 0) return -90000;
    if (enemyMoves.length === 0) return 90000;

    let score = 0;

    for (let i = 0; i < SIZE * SIZE; i++) {
      const piece = board[i];
      if (!piece) continue;

      const row = Math.floor(i / SIZE);
      const col = i % SIZE;

      const progress = piece === "W" ? 7 - row : row;
      const centerBonus = 3.5 - Math.abs(3.5 - col);

      let value = progress * 12 + centerBonus * 2;

      // Reward pieces that have room to advance.
      const forward = piece === "W" ? -1 : 1;
      const nextRow = row + forward;

      if (
        nextRow >= 0 && nextRow < SIZE &&
        board[nextRow * SIZE + col] === EMPTY
      ) {
        value += 5;
      }

      // Encourage mobility without letting it dominate progress.
      const mobility = legalMoves(board, i).length;
      value += mobility * 2;

      score += piece === perspective ? value : -value;
    }

    score += myMoves.length * 2;
    score -= enemyMoves.length * 2;

    return score;
  }

  function minimax(
    board,
    depth,
    alpha,
    beta,
    maximizing,
    perspective
  ) {
    const enemy = opponent(perspective);

    if (
      depth === 0 ||
      hasReachedGoal(board, "W") ||
      hasReachedGoal(board, "B")
    ) {
      return evaluate(board, perspective);
    }

    const color = maximizing ? perspective : enemy;
    const moves = allLegalMoves(board, color);

    if (moves.length === 0) {
      // The player to move loses.
      return maximizing ? -90000 - depth : 90000 + depth;
    }

    if (maximizing) {
      let best = -Infinity;

      for (const move of moves) {
        const value = minimax(
          applyMove(board, move),
          depth - 1,
          alpha,
          beta,
          false,
          perspective
        );

        best = Math.max(best, value);
        alpha = Math.max(alpha, best);

        if (beta <= alpha) break;
      }

      return best;
    }

    let best = Infinity;

    for (const move of moves) {
      const value = minimax(
        applyMove(board, move),
        depth - 1,
        alpha,
        beta,
        true,
        perspective
      );

      best = Math.min(best, value);
      beta = Math.min(beta, best);

      if (beta <= alpha) break;
    }

    return best;
  }

  function chooseMove(board, color, options = {}) {
    if (!Array.isArray(board) || board.length !== 64) {
      throw new Error("Transitus board must contain exactly 64 squares.");
    }

    if (color !== "W" && color !== "B") {
      throw new Error('Color must be "W" or "B".');
    }

    const depth = Math.max(
      1,
      Math.min(5, Number(options.depth) || 3)
    );

    const moves = allLegalMoves(board, color);
    if (moves.length === 0) return null;

    // Try promising moves first to improve alpha-beta pruning.
    moves.sort((a, b) => {
      const scoreA = evaluate(applyMove(board, a), color);
      const scoreB = evaluate(applyMove(board, b), color);
      return scoreB - scoreA;
    });

    let bestMove = moves[0];
    let bestScore = -Infinity;
    let alpha = -Infinity;
    const beta = Infinity;

    for (const move of moves) {
      const score = minimax(
        applyMove(board, move),
        depth - 1,
        alpha,
        beta,
        false,
        color
      );

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }

      alpha = Math.max(alpha, bestScore);
    }

    return {
      from: bestMove.from,
      to: bestMove.to,
      score: bestScore,
      depth
    };
  }

  // Expose a small public API for bots.html and game.html.
  window.TransitusAI = Object.freeze({
    legalMoves,
    allLegalMoves,
    evaluate,
    chooseMove
  });
})();
