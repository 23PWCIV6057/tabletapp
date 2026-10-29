"use client";

import React, { useEffect, useRef, useState } from "react";
import { LeaderboardEntry } from "@/types";
import { GamepadIcon, RefreshCwIcon, SparklesIcon, TrophyIcon, XIcon } from "./Icons";

interface CafeArcadeModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantName: string;
  prizeText?: string;
  tableNumber?: number | null;
  leaderboard: LeaderboardEntry[];
  onSubmitScore: (entry: Omit<LeaderboardEntry, "id" | "createdAt">) => void;
}

type CellValue = "X" | "O" | null;

const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function checkWinner(board: CellValue[]): { winner: CellValue | "DRAW"; line?: number[] } {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line };
    }
  }
  if (board.every((cell) => cell !== null)) {
    return { winner: "DRAW" };
  }
  return { winner: null };
}

function chooseBotMove(board: CellValue[], difficulty: "easy" | "hard"): number {
  const emptyIndices = board
    .map((v, i) => (v === null ? i : -1))
    .filter((i) => i !== -1);
  if (emptyIndices.length === 0) return -1;

  if (difficulty === "easy" && Math.random() < 0.45) {
    return emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
  }

  // 1. Win if possible
  for (const idx of emptyIndices) {
    const copy = [...board];
    copy[idx] = "O";
    if (checkWinner(copy).winner === "O") return idx;
  }
  // 2. Block player win
  for (const idx of emptyIndices) {
    const copy = [...board];
    copy[idx] = "X";
    if (checkWinner(copy).winner === "X") return idx;
  }
  // 3. Take center
  if (board[4] === null) return 4;
  // 4. Take a corner
  const corners = [0, 2, 6, 8].filter((c) => board[c] === null);
  if (corners.length > 0) {
    return corners[Math.floor(Math.random() * corners.length)];
  }
  return emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
}

export default function CafeArcadeModal({
  isOpen,
  onClose,
  restaurantName,
  prizeText,
  tableNumber,
  leaderboard,
  onSubmitScore,
}: CafeArcadeModalProps) {
  const [activeGame, setActiveGame] = useState<"reflex" | "bot_streak">("reflex");
  const [playerName, setPlayerName] = useState("");
  const [scoreSubmitted, setScoreSubmitted] = useState(false);

  // Game 1: Reflex Rush state
  const [reflexRunning, setReflexRunning] = useState(false);
  const [reflexTimeLeft, setReflexTimeLeft] = useState(30);
  const [reflexScore, setReflexScore] = useState(0);
  const [activeCell, setActiveCell] = useState<number>(4);
  const [isGoldenTarget, setIsGoldenTarget] = useState(false);
  const reflexFinished = !reflexRunning && reflexTimeLeft === 0;
  const moveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Game 2: Guest vs. Chef Bot Tic-Tac-Toe
  const [tttBoard, setTttBoard] = useState<CellValue[]>(Array(9).fill(null));
  const [tttMode, setTttMode] = useState<"bot_hard" | "bot_easy" | "two_player">("bot_hard");
  const [xIsNext, setXIsNext] = useState(true);
  const [botStreak, setBotStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  const tttResult = checkWinner(tttBoard);

  // Reflex Rush countdown timer
  useEffect(() => {
    if (!reflexRunning) return;
    const interval = setInterval(() => {
      setReflexTimeLeft((prev) => {
        if (prev <= 1) {
          setReflexRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [reflexRunning]);

  // Reflex target auto-hop timer so players must be fast
  useEffect(() => {
    if (!reflexRunning) {
      if (moveTimerRef.current) clearInterval(moveTimerRef.current);
      return;
    }
    const speedMs = Math.max(480, 950 - Math.floor(reflexScore / 60) * 65);
    moveTimerRef.current = setInterval(() => {
      setActiveCell((prev) => {
        let next = Math.floor(Math.random() * 9);
        if (next === prev) next = (prev + 1) % 9;
        return next;
      });
      setIsGoldenTarget(Math.random() < 0.22);
    }, speedMs);

    return () => {
      if (moveTimerRef.current) clearInterval(moveTimerRef.current);
    };
  }, [reflexRunning, reflexScore]);

  // Bot turn in Tic-Tac-Toe
  useEffect(() => {
    if (tttMode === "two_player" || xIsNext || tttResult.winner) return;
    const timer = setTimeout(() => {
      const move = chooseBotMove(tttBoard, tttMode === "bot_hard" ? "hard" : "easy");
      if (move !== -1) {
        setTttBoard((prev) => {
          const next = [...prev];
          next[move] = "O";
          const outcome = checkWinner(next);
          if (outcome.winner === "O") {
            setBotStreak(0);
          }
          return next;
        });
        setXIsNext(true);
      }
    }, 320);
    return () => clearTimeout(timer);
  }, [tttBoard, tttMode, xIsNext, tttResult.winner]);

  if (!isOpen) return null;

  const startReflexGame = () => {
    setReflexScore(0);
    setReflexTimeLeft(30);
    setScoreSubmitted(false);
    setActiveCell(Math.floor(Math.random() * 9));
    setIsGoldenTarget(false);
    setReflexRunning(true);
  };

  const handleTapReflexCell = (idx: number) => {
    if (!reflexRunning) return;
    if (idx === activeCell) {
      const points = isGoldenTarget ? 25 : 10;
      setReflexScore((s) => s + points);
      let next = Math.floor(Math.random() * 9);
      if (next === idx) next = (idx + 2) % 9;
      setActiveCell(next);
      setIsGoldenTarget(Math.random() < 0.25);
    } else {
      setReflexScore((s) => Math.max(0, s - 5));
    }
  };

  const handleTttClick = (idx: number) => {
    if (tttBoard[idx] || tttResult.winner) return;
    if (tttMode !== "two_player" && !xIsNext) return;

    const next = [...tttBoard];
    next[idx] = xIsNext ? "X" : "O";
    setTttBoard(next);

    const outcome = checkWinner(next);
    if (outcome.winner === "X" && tttMode !== "two_player") {
      const nextStreak = botStreak + 1;
      setBotStreak(nextStreak);
      if (nextStreak > bestStreak) {
        setBestStreak(nextStreak);
        setScoreSubmitted(false);
      }
    } else if (outcome.winner === "O" && tttMode !== "two_player") {
      setBotStreak(0);
    }

    setXIsNext(!xIsNext);
  };

  const resetTttBoard = () => {
    setTttBoard(Array(9).fill(null));
    setXIsNext(true);
  };

  const handleSaveLeaderboardScore = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = playerName.trim();
    if (!cleanName) return;

    const scoreValue = activeGame === "reflex" ? reflexScore : bestStreak;
    if (scoreValue <= 0) return;

    onSubmitScore({
      playerName: cleanName,
      tableNumber: tableNumber ?? null,
      game: activeGame,
      score: scoreValue,
    });
    setScoreSubmitted(true);
  };

  const filteredLeaderboard = leaderboard
    .filter((entry) => entry.game === activeGame)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cafe-arcade-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-3 sm:p-5 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-[32px] border border-slate-800 bg-slate-950 p-5 sm:p-7 text-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-slate-950 shadow-lg">
              <GamepadIcon size={24} />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-amber-400">
                {restaurantName} • Live Waiting Lounge
              </p>
              <h2 id="cafe-arcade-title" className="font-display text-xl sm:text-2xl font-bold text-white">
                Café Arcade &amp; Restaurant Leaderboard
              </h2>
            </div>
          </div>

          <button
            type="button"
            aria-label="Close arcade"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
          >
            <XIcon size={18} />
          </button>
        </div>

        {/* Daily High-Score Reward Banner */}
        {prizeText && (
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent p-3.5 text-xs">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-slate-950">
              <TrophyIcon size={18} />
            </span>
            <div>
              <span className="font-black uppercase tracking-wider text-amber-400">
                Today&apos;s Champion Challenge:{" "}
              </span>
              <span className="font-semibold text-amber-100">{prizeText}</span>
            </div>
          </div>
        )}

        {/* Game Switcher Tabs */}
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveGame("reflex");
              setScoreSubmitted(false);
            }}
            className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-xs font-black transition ${
              activeGame === "reflex"
                ? "bg-amber-500 text-slate-950 shadow-md"
                : "bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800"
            }`}
          >
            <SparklesIcon size={15} />
            <span>1. Reflex Rush (Vs. Whole Café)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveGame("bot_streak");
              setScoreSubmitted(false);
            }}
            className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-xs font-black transition ${
              activeGame === "bot_streak"
                ? "bg-amber-500 text-slate-950 shadow-md"
                : "bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800"
            }`}
          >
            <GamepadIcon size={15} />
            <span>2. Guest vs. Chef Bot (Tic-Tac-Toe)</span>
          </button>
        </div>

        {/* Main Arena + Live Leaderboard Grid */}
        <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          {/* Left Column: Active Mini-Game */}
          <div className="min-w-0 rounded-[28px] border border-slate-800 bg-slate-900/90 p-5 flex flex-col justify-between">
            {activeGame === "reflex" ? (
              <div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="font-display text-lg font-bold text-white">
                      Reflex Rush
                    </h3>
                    <p className="text-xs text-slate-400">
                      Tap lit dishes before they hop! Gold Chef Stars = +25 pts.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-black text-amber-400">
                      {reflexTimeLeft}s
                    </span>
                    <span className="tabular-nums rounded-xl bg-amber-500 px-3 py-1.5 text-sm font-black text-slate-950">
                      {reflexScore} pts
                    </span>
                  </div>
                </div>

                {/* 3x3 Reflex Grid */}
                <div className="my-5 grid grid-cols-3 gap-3 max-w-xs mx-auto">
                  {Array.from({ length: 9 }).map((_, idx) => {
                    const isLit = reflexRunning && activeCell === idx;
                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={!reflexRunning}
                        onClick={() => handleTapReflexCell(idx)}
                        aria-label={`Arcade target pad ${idx + 1}`}
                        className={`h-22 sm:h-24 rounded-2xl border-2 font-black text-xs transition flex flex-col items-center justify-center gap-1 select-none ${
                          isLit
                            ? isGoldenTarget
                              ? "border-amber-300 bg-amber-400 text-slate-950 scale-105 shadow-lg shadow-amber-500/40"
                              : "border-emerald-400 bg-emerald-500 text-slate-950 scale-105 shadow-lg shadow-emerald-500/30"
                            : "border-slate-800 bg-slate-950/80 text-slate-600 hover:border-slate-700"
                        }`}
                      >
                        {isLit ? (
                          <>
                            <SparklesIcon size={22} />
                            <span>{isGoldenTarget ? "+25 GOLD" : "+10 TAP!"}</span>
                          </>
                        ) : (
                          <span>•</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Start / Post Score Controls */}
                <div className="space-y-3 border-t border-slate-800 pt-4">
                  {!reflexRunning && (
                    <button
                      type="button"
                      onClick={startReflexGame}
                      className="min-h-12 w-full rounded-full bg-emerald-500 py-3 text-sm font-black text-slate-950 shadow-lg hover:bg-emerald-400 transition"
                    >
                      {reflexFinished
                        ? `Play Again (Last Score: ${reflexScore} pts)`
                        : "Start 30-Second Reflex Rush"}
                    </button>
                  )}

                  {reflexFinished && reflexScore > 0 && !scoreSubmitted && (
                    <form
                      onSubmit={handleSaveLeaderboardScore}
                      className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3.5 space-y-2.5"
                    >
                      <p className="text-xs font-black text-amber-300">
                        You scored {reflexScore} pts! Post your name to the Café Leaderboard:
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          required
                          maxLength={22}
                          value={playerName}
                          onChange={(e) => setPlayerName(e.target.value)}
                          placeholder="Your Name (e.g. Hamza)"
                          className="min-h-11 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 text-xs font-bold text-white focus:border-amber-500"
                        />
                        <button
                          type="submit"
                          className="min-h-11 rounded-xl bg-amber-500 px-4 text-xs font-black text-slate-950 hover:bg-amber-400 transition"
                        >
                          Post Score
                        </button>
                      </div>
                    </form>
                  )}

                  {scoreSubmitted && (
                    <p className="text-center text-xs font-bold text-emerald-400">
                      Score posted to the live {restaurantName} leaderboard!
                    </p>
                  )}
                </div>
              </div>
            ) : (
              /* Game 2: Guest vs. Chef Bot Tic-Tac-Toe */
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="font-display text-lg font-bold text-white">
                      Guest vs. Chef Bot
                    </h3>
                    <p className="text-xs text-slate-400">
                      Beat the AI Chef or play 2-Player across your table
                    </p>
                  </div>

                  <div className="flex gap-1.5">
                    {[
                      { id: "bot_hard", label: "vs. Chef AI (Hard)" },
                      { id: "bot_easy", label: "vs. Chef AI (Easy)" },
                      { id: "two_player", label: "2-Player Table" },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setTttMode(m.id as typeof tttMode);
                          resetTttBoard();
                        }}
                        className={`min-h-9 rounded-xl px-2.5 py-1 text-xs font-bold transition ${
                          tttMode === m.id
                            ? "bg-amber-500 text-slate-950"
                            : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Streak Status */}
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300">
                    {tttResult.winner === "X"
                      ? "You Won This Round!"
                      : tttResult.winner === "O"
                        ? tttMode === "two_player"
                          ? "Player O Won!"
                          : "Chef Bot Won!"
                        : tttResult.winner === "DRAW"
                          ? "Round Tied!"
                          : xIsNext
                            ? "Your Turn (X)"
                            : tttMode === "two_player"
                              ? "Player O's Turn"
                              : "Chef Bot is thinking..."}
                  </span>
                  {tttMode !== "two_player" && (
                    <span className="tabular-nums rounded-full bg-slate-800 px-3 py-1 font-black text-amber-400">
                      Win Streak: {botStreak} (Best: {bestStreak})
                    </span>
                  )}
                </div>

                {/* 3x3 Board */}
                <div className="my-4 grid grid-cols-3 gap-3 max-w-xs mx-auto">
                  {tttBoard.map((cell, idx) => {
                    const isWinCell = tttResult.line?.includes(idx);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleTttClick(idx)}
                        aria-label={`Tic Tac Toe cell ${idx + 1}: ${cell || "empty"}`}
                        className={`h-22 sm:h-24 rounded-2xl border-2 text-2xl font-black transition flex items-center justify-center ${
                          isWinCell
                            ? "border-emerald-400 bg-emerald-500/20 text-emerald-300"
                            : cell === "X"
                              ? "border-amber-500/50 bg-slate-950 text-amber-400"
                              : cell === "O"
                                ? "border-sky-500/50 bg-slate-950 text-sky-400"
                                : "border-slate-800 bg-slate-950/70 text-slate-500 hover:border-slate-700"
                        }`}
                      >
                        {cell}
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-3 border-t border-slate-800 pt-4">
                  <button
                    type="button"
                    onClick={resetTttBoard}
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-slate-800 py-2.5 text-xs font-black text-white hover:bg-slate-700 transition"
                  >
                    <RefreshCwIcon size={14} />
                    <span>Next Round / Reset Board</span>
                  </button>

                  {bestStreak > 0 && !scoreSubmitted && tttMode !== "two_player" && (
                    <form
                      onSubmit={handleSaveLeaderboardScore}
                      className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3.5 space-y-2.5"
                    >
                      <p className="text-xs font-black text-amber-300">
                        Post your {bestStreak}-Win Streak vs. Chef Bot to the Leaderboard:
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          required
                          maxLength={22}
                          value={playerName}
                          onChange={(e) => setPlayerName(e.target.value)}
                          placeholder="Your Name (e.g. Bilal)"
                          className="min-h-11 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 text-xs font-bold text-white focus:border-amber-500"
                        />
                        <button
                          type="submit"
                          className="min-h-11 rounded-xl bg-amber-500 px-4 text-xs font-black text-slate-950 hover:bg-amber-400 transition"
                        >
                          Post Streak
                        </button>
                      </div>
                    </form>
                  )}

                  {scoreSubmitted && (
                    <p className="text-center text-xs font-bold text-emerald-400">
                      Win streak posted to the live {restaurantName} leaderboard!
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Live All-Restaurant Leaderboard */}
          <div className="min-w-0 rounded-[28px] border border-slate-800 bg-slate-900/90 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <TrophyIcon size={18} className="text-amber-400" />
                  <h3 className="font-display text-lg font-bold text-white">
                    All-Café Hall of Fame
                  </h3>
                </div>
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400">
                  Live Across Tables
                </span>
              </div>

              <p className="mt-2 text-xs text-slate-400">
                {activeGame === "reflex"
                  ? "Top scores in Reflex Rush (30s)"
                  : "Longest win streaks against Chef AI Bot"}
              </p>

              <div className="mt-4 space-y-2.5">
                {filteredLeaderboard.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center text-xs text-slate-400">
                    No scores recorded yet today. Be the first to claim #1!
                  </div>
                ) : (
                  filteredLeaderboard.map((entry, idx) => (
                    <div
                      key={entry.id}
                      className={`flex items-center justify-between rounded-2xl border px-3.5 py-2.5 text-xs ${
                        idx === 0
                          ? "border-amber-500/50 bg-amber-500/15 text-white"
                          : idx === 1
                            ? "border-slate-700 bg-slate-800/70 text-slate-200"
                            : "border-slate-800 bg-slate-950/60 text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`tabular-nums flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-black ${
                            idx === 0
                              ? "bg-amber-500 text-slate-950"
                              : idx === 1
                                ? "bg-slate-300 text-slate-950"
                                : idx === 2
                                  ? "bg-amber-700 text-white"
                                  : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          #{idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="font-black text-white truncate">{entry.playerName}</p>
                          <p className="text-[11px] text-slate-400">
                            {entry.tableNumber ? `Table ${entry.tableNumber}` : "Café Lounge"}
                          </p>
                        </div>
                      </div>

                      <span className="tabular-nums shrink-0 rounded-xl bg-slate-950 px-3 py-1 font-black text-amber-400">
                        {entry.score} {entry.game === "reflex" ? "pts" : "wins"}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <p className="mt-4 border-t border-slate-800 pt-3 text-center text-[11px] text-slate-500">
              Scores sync live across all tables at {restaurantName}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
