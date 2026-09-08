"use client";

import { useState } from "react";
import { Film, Clock, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

type Movie = {
  id: number;
  title: string;
  genre: string;
  rating: string;
  stars: number;
  duration: string;
  showtimes: string[];
  color: string;
  emoji: string;
  isNew?: boolean;
};

const MOVIES: Movie[] = [
  {
    id: 1, emoji: "🦸", title: "Agimat: Rise of the Guardians",
    genre: "Action / Fantasy", rating: "PG-13", stars: 4.7,
    duration: "2h 15m", color: "#4f46e5",
    showtimes: ["10:00 AM", "12:30 PM", "3:00 PM", "6:30 PM", "9:00 PM"],
    isNew: true,
  },
  {
    id: 2, emoji: "😂", title: "Walang Forever 2",
    genre: "Romantic Comedy", rating: "PG", stars: 4.3,
    duration: "1h 55m", color: "#ec4899",
    showtimes: ["11:00 AM", "1:30 PM", "4:00 PM", "7:00 PM"],
  },
  {
    id: 3, emoji: "👻", title: "Haunted Heights",
    genre: "Horror", rating: "R-13", stars: 4.5,
    duration: "1h 48m", color: "#6b21a8",
    showtimes: ["12:00 PM", "2:30 PM", "5:30 PM", "8:30 PM", "11:00 PM"],
    isNew: true,
  },
  {
    id: 4, emoji: "🚀", title: "Orbita",
    genre: "Sci-Fi / Thriller", rating: "PG", stars: 4.2,
    duration: "2h 05m", color: "#0ea5e9",
    showtimes: ["9:30 AM", "12:00 PM", "3:30 PM", "7:00 PM", "10:00 PM"],
  },
  {
    id: 5, emoji: "🎭", title: "Alaala",
    genre: "Drama", rating: "G", stars: 4.8,
    duration: "2h 20m", color: "#d97706",
    showtimes: ["10:30 AM", "1:00 PM", "4:30 PM", "7:30 PM"],
  },
  {
    id: 6, emoji: "🐉", title: "Naga: Breath of Fire",
    genre: "Animation", rating: "G", stars: 4.6,
    duration: "1h 42m", color: "#16a34a",
    showtimes: ["9:00 AM", "11:00 AM", "1:00 PM", "3:00 PM", "5:00 PM"],
    isNew: true,
  },
];

function StarRating({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className="h-3 w-3"
          fill={s <= Math.round(value) ? "currentColor" : "none"}
        />
      ))}
      <span className="ml-1 text-[10px] font-bold opacity-70">{value}</span>
    </div>
  );
}

export function CinemaScreen() {
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(MOVIES[0]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const PER_PAGE = 3;
  const pages = Math.ceil(MOVIES.length / PER_PAGE);
  const visible = MOVIES.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);

  return (
    <div className="h-full w-full flex flex-col pb-20 sm:pb-24 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-6 sm:px-10 py-5 sm:py-7 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-400/20">
          <Film className="h-5 w-5 text-purple-400" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest opacity-40">Now Showing</p>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground">Cinema Guide</h1>
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs opacity-40">Today</p>
          <p className="text-sm font-bold">
            {new Date().toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric" })}
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col sm:flex-row gap-3 sm:gap-4 px-4 sm:px-8 overflow-hidden">
        {/* Movie List */}
        <div className="sm:w-56 shrink-0 overflow-y-auto no-scrollbar">
          <div className="flex flex-col gap-2">
            {visible.map((movie) => (
              <motion.button
                key={movie.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => { setSelectedMovie(movie); setSelectedTime(null); }}
                className="flex items-center gap-3 rounded-2xl border p-3 text-left transition-all"
                style={
                  selectedMovie?.id === movie.id
                    ? { borderColor: `${movie.color}80`, background: `${movie.color}18` }
                    : { borderColor: "rgba(255,255,255,0.08)", background: "transparent" }
                }
              >
                <span className="text-2xl">{movie.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-foreground leading-tight line-clamp-2">{movie.title}</p>
                  <p className="text-[9px] opacity-40 mt-0.5">{movie.genre}</p>
                  {movie.isNew && (
                    <span className="inline-block rounded px-1 py-0.5 text-[8px] font-black text-black mt-0.5" style={{ backgroundColor: movie.color }}>
                      NEW
                    </span>
                  )}
                </div>
              </motion.button>
            ))}
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-3">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="h-8 w-8 flex items-center justify-center rounded-full bg-white/5 border border-white/10 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs opacity-40">{page + 1}/{pages}</span>
              <button
                onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
                disabled={page === pages - 1}
                className="h-8 w-8 flex items-center justify-center rounded-full bg-white/5 border border-white/10 disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Movie Detail + Showtimes */}
        {selectedMovie && (
          <div className="flex-1 overflow-y-auto no-scrollbar">
            {/* Movie hero card */}
            <div
              className="rounded-2xl p-5 sm:p-6 mb-4"
              style={{ background: `linear-gradient(135deg, ${selectedMovie.color}40, ${selectedMovie.color}15)`, border: `1px solid ${selectedMovie.color}40` }}
            >
              <div className="flex items-start gap-4">
                <span className="text-5xl sm:text-6xl">{selectedMovie.emoji}</span>
                <div className="flex-1 min-w-0">
                  {selectedMovie.isNew && (
                    <span
                      className="inline-block rounded-full px-2 py-0.5 text-[10px] font-black text-black mb-2"
                      style={{ backgroundColor: selectedMovie.color }}
                    >
                      NOW SHOWING
                    </span>
                  )}
                  <h2 className="text-lg sm:text-2xl font-black text-foreground leading-tight">
                    {selectedMovie.title}
                  </h2>
                  <p className="text-sm opacity-50 mt-1">{selectedMovie.genre}</p>
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <StarRating value={selectedMovie.stars} />
                    <span className="rounded-full border border-white/20 px-2 py-0.5 text-[10px] font-bold opacity-70">
                      {selectedMovie.rating}
                    </span>
                    <span className="flex items-center gap-1 text-xs opacity-50">
                      <Clock className="h-3 w-3" /> {selectedMovie.duration}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Showtimes */}
            <p className="text-xs font-black uppercase tracking-widest opacity-40 mb-3">
              Select a showtime
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedMovie.showtimes.map((time) => (
                <button
                  key={time}
                  onClick={() => setSelectedTime(time)}
                  className="rounded-xl px-4 py-2.5 text-sm font-bold transition-all"
                  style={
                    selectedTime === time
                      ? { backgroundColor: selectedMovie.color, color: "#000" }
                      : { border: "1px solid rgba(255,255,255,0.15)", color: "inherit" }
                  }
                >
                  {time}
                </button>
              ))}
            </div>

            {selectedTime && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl p-4 border border-white/10 bg-white/5 text-center"
              >
                <p className="text-sm font-bold text-foreground">
                  🎬 {selectedMovie.title} at <span style={{ color: selectedMovie.color }}>{selectedTime}</span>
                </p>
                <p className="text-xs opacity-40 mt-1">
                  Purchase tickets at the cinema box office or the cinema app. Enjoy the show!
                </p>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
