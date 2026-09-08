"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tag, ChevronLeft, ChevronRight, X } from "lucide-react";

type Promo = {
  id: number;
  brand: string;
  title: string;
  subtitle: string;
  discount: string;
  validUntil: string;
  color: string;
  accent: string;
  emoji: string;
};

const PROMOS: Promo[] = [
  {
    id: 1, brand: "FOOD COURT", emoji: "🍔",
    title: "Mega Meal Deal",
    subtitle: "Any main + drink + side — one unbeatable price",
    discount: "20% OFF", validUntil: "Valid until Sep 30, 2026",
    color: "#c8e600", accent: "#1a1a00",
  },
  {
    id: 2, brand: "FASHION", emoji: "👗",
    title: "End of Season Sale",
    subtitle: "Selected styles from top brands. While stocks last.",
    discount: "UP TO 50% OFF", validUntil: "Valid until Sep 15, 2026",
    color: "#ff6b9d", accent: "#fff",
  },
  {
    id: 3, brand: "ELECTRONICS", emoji: "📱",
    title: "Tech Weekend",
    subtitle: "Laptops, gadgets & accessories. No interest installment available.",
    discount: "₱500–₱5,000 OFF", validUntil: "Sep 7–8, 2026 only",
    color: "#38bdf8", accent: "#001a33",
  },
  {
    id: 4, brand: "SPA & WELLNESS", emoji: "🌿",
    title: "Relax & Refresh",
    subtitle: "Book a 60-min session and get a complimentary foot soak.",
    discount: "FREE ADD-ON", validUntil: "Valid on weekdays",
    color: "#34d399", accent: "#001a0d",
  },
  {
    id: 5, brand: "CINEMA", emoji: "🎬",
    title: "Movie Monday",
    subtitle: "All seats, all screenings, every Monday.",
    discount: "₱100 TICKETS", validUntil: "Every Monday",
    color: "#a78bfa", accent: "#fff",
  },
  {
    id: 6, brand: "ESSENTIALS", emoji: "🛍️",
    title: "Back to School Bazaar",
    subtitle: "Notebooks, supplies & backpacks at unbeatable prices.",
    discount: "UP TO 30% OFF", validUntil: "Valid until Sep 30, 2026",
    color: "#fb923c", accent: "#fff",
  },
];

export function PromosScreen() {
  const [active, setActive] = useState<Promo | null>(null);
  const [page, setPage] = useState(0);
  const PER_PAGE = 4;
  const pages = Math.ceil(PROMOS.length / PER_PAGE);
  const visible = PROMOS.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);

  return (
    <div className="h-full w-full flex flex-col pb-20 sm:pb-24 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-6 sm:px-10 py-5 sm:py-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-400/20">
            <Tag className="h-5 w-5 text-orange-400" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest opacity-40">Today&apos;s</p>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground">Promos & Deals</h1>
          </div>
        </div>
      </div>

      {/* Promo Grid */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 sm:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {visible.map((promo, i) => (
            <motion.button
              key={promo.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0, transition: { delay: i * 0.08 } }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setActive(promo)}
              className="relative overflow-hidden rounded-2xl sm:rounded-3xl text-left h-44 sm:h-52 p-5 shadow-xl"
              style={{ backgroundColor: promo.color }}
            >
              {/* Brand + emoji */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: promo.accent, opacity: 0.6 }}>
                  {promo.brand}
                </span>
                <span className="text-3xl">{promo.emoji}</span>
              </div>

              {/* Discount badge */}
              <div
                className="inline-block rounded-full px-3 py-1 text-xs font-black mb-3"
                style={{ backgroundColor: `${promo.accent}20`, color: promo.accent }}
              >
                {promo.discount}
              </div>

              {/* Title */}
              <h3 className="text-lg sm:text-xl font-black leading-tight" style={{ color: promo.accent }}>
                {promo.title}
              </h3>

              {/* Validity */}
              <p className="mt-auto pt-3 text-[10px] font-semibold" style={{ color: promo.accent, opacity: 0.5 }}>
                {promo.validUntil}
              </p>

              {/* Dot pattern */}
              <div
                className="absolute inset-0 opacity-[0.06] pointer-events-none"
                style={{
                  backgroundImage: "radial-gradient(circle, black 1px, transparent 1px)",
                  backgroundSize: "18px 18px",
                }}
              />
            </motion.button>
          ))}
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-6 mb-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 border border-white/10 disabled:opacity-30 hover:bg-white/10 transition-all"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-sm font-bold opacity-40">{page + 1} / {pages}</span>
            <button
              onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
              disabled={page === pages - 1}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 border border-white/10 disabled:opacity-30 hover:bg-white/10 transition-all"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={(e) => { if (e.target === e.currentTarget) setActive(null); }}
          >
            <motion.div
              initial={{ scale: 0.85, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.85, y: 20 }}
              className="relative w-full max-w-md rounded-3xl p-8 shadow-2xl overflow-hidden"
              style={{ backgroundColor: active.color }}
            >
              <button
                onClick={() => setActive(null)}
                className="absolute top-4 right-4 h-8 w-8 flex items-center justify-center rounded-full"
                style={{ backgroundColor: `${active.accent}20` }}
              >
                <X className="h-4 w-4" style={{ color: active.accent }} />
              </button>

              <span className="text-5xl">{active.emoji}</span>
              <p className="mt-3 text-xs font-black uppercase tracking-widest" style={{ color: active.accent, opacity: 0.5 }}>
                {active.brand}
              </p>
              <div
                className="mt-2 inline-block rounded-full px-4 py-1.5 text-sm font-black"
                style={{ backgroundColor: `${active.accent}20`, color: active.accent }}
              >
                {active.discount}
              </div>
              <h2 className="mt-3 text-3xl font-black" style={{ color: active.accent }}>
                {active.title}
              </h2>
              <p className="mt-2 text-sm opacity-70" style={{ color: active.accent }}>
                {active.subtitle}
              </p>
              <p className="mt-4 text-xs font-semibold opacity-40" style={{ color: active.accent }}>
                {active.validUntil}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
