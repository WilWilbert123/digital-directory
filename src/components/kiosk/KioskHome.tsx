"use client";

import { motion } from "framer-motion";
import { useKioskStore } from "@/store/useKioskStore";
import { CATEGORY_GROUPS, getCategoriesForGroup } from "@/lib/kioskCategories";
import type { CategoryOption } from "@/components/kiosk/CategorySelector";

// First 2 groups are tall (span 2 rows), next 3 are smaller
const TALL_COUNT = 2;

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: (i: number) => ({
    opacity: 1, scale: 1, y: 0,
    transition: { delay: i * 0.08, type: "spring", bounce: 0.25, duration: 0.5 },
  }),
};

export function KioskHome({ categories }: { categories: CategoryOption[] }) {
  const selectCategoryGroup = useKioskStore((s) => s.selectCategoryGroup);

  return (
    <div className="h-full w-full p-2 sm:p-6 pb-[72px] sm:pb-24 overflow-y-auto no-scrollbar">
      {/* 
        Mobile: 2-column grid (food/fashion tall on left, others on right)
        Desktop: 4-column bento grid
      */}
      {/* Mobile grid */}
      <div className="sm:hidden h-full grid gap-2"
        style={{
          gridTemplateColumns: "1fr 1fr",
          gridTemplateRows: "auto auto auto",
          gridTemplateAreas: `
            "food fashion"
            "electronics services"
            "essentials essentials"
          `,
        }}
      >
        {CATEGORY_GROUPS.map((group, i) => {
          const isTall = i < TALL_COUNT;
          // Find a matching DB category to get a real color
          const dbCats = getCategoriesForGroup(group.id, categories);
          const color = dbCats[0]?.colorHex ?? group.defaultColor;

          const areaMap: Record<string, string> = {
            food: "food",
            fashion: "fashion",
            electronics: "electronics",
            services: "services",
            essentials: "essentials",
          };

          return (
            <motion.button
              key={group.id}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              whileHover={{ scale: 1.02, filter: "brightness(1.08)" }}
              whileTap={{ scale: 0.97 }}
              onClick={() => selectCategoryGroup(group.id)}
              className="relative overflow-hidden rounded-2xl sm:rounded-3xl text-left shadow-xl focus:outline-none min-h-[90px]"
              style={{ gridArea: areaMap[group.id], backgroundColor: color }}
            >
              {/* Card content */}
              <div className="absolute inset-0 flex flex-col justify-between p-3 sm:p-6 z-10">
                {/* Title — top left */}
                <div>
                  <h2
                    className={`font-black text-black leading-tight drop-shadow-sm ${isTall ? "text-base sm:text-3xl" : "text-sm sm:text-xl"
                      }`}
                  >
                    {group.label}
                  </h2>
                  {/* Tenant count badge — hidden on mobile to save space */}
                  {dbCats.length > 0 && (
                    <span className="hidden sm:inline-block mt-1 rounded-full bg-black/10 px-2 py-0.5 text-[10px] sm:text-xs font-semibold text-black/60">
                      {dbCats.length} {dbCats.length === 1 ? "subcategory" : "subcategories"}
                    </span>
                  )}
                </div>

                {/* Bottom label strip */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] sm:text-xs font-bold text-black/50 uppercase tracking-widest">
                    Explore →
                  </span>
                </div>
              </div>

              {/* Decorative image — bottom right */}
              <img
                src={group.image}
                alt={group.label}
                className="absolute bottom-0 right-0 object-cover object-left-top pointer-events-none select-none"
                style={{
                  width: isTall ? "75%" : "65%",
                  height: isTall ? "65%" : "70%",
                  opacity: 0.92,
                  maskImage: "radial-gradient(ellipse at bottom right, black 40%, transparent 80%)",
                  WebkitMaskImage: "radial-gradient(ellipse at bottom right, black 40%, transparent 80%)",
                }}
                draggable={false}
              />

              {/* Subtle dot pattern overlay */}
              <div
                className="absolute inset-0 opacity-[0.07] pointer-events-none"
                style={{
                  backgroundImage: "radial-gradient(circle, black 1px, transparent 1px)",
                  backgroundSize: "20px 20px",
                }}
              />
            </motion.button>
          );
        })}
      </div>

      {/* Desktop bento grid — hidden on mobile */}
      <div className="hidden sm:grid h-full gap-4"
        style={{
          gridTemplateColumns: "1fr 1fr 1fr 1fr",
          gridTemplateRows: "1fr 1fr",
          gridTemplateAreas: `
            "food fashion electronics services"
            "food fashion essentials  essentials"
          `,
        }}
      >
        {CATEGORY_GROUPS.map((group, i) => {
          const isTall = i < TALL_COUNT;
          const dbCats = getCategoriesForGroup(group.id, categories);
          const color = dbCats[0]?.colorHex ?? group.defaultColor;
          const areaMap: Record<string, string> = {
            food: "food", fashion: "fashion", electronics: "electronics",
            services: "services", essentials: "essentials",
          };
          return (
            <motion.button
              key={group.id + "-desktop"}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              whileHover={{ scale: 1.02, filter: "brightness(1.08)" }}
              whileTap={{ scale: 0.97 }}
              onClick={() => selectCategoryGroup(group.id)}
              className="relative overflow-hidden rounded-3xl text-left shadow-xl focus:outline-none"
              style={{ gridArea: areaMap[group.id], backgroundColor: color }}
            >
              <div className="absolute inset-0 flex flex-col justify-between p-6 z-10">
                <div>
                  <h2 className={`font-black text-black leading-tight drop-shadow-sm ${isTall ? "text-3xl" : "text-xl"}`}>
                    {group.label}
                  </h2>
                  {dbCats.length > 0 && (
                    <span className="mt-1 inline-block rounded-full bg-black/10 px-2 py-0.5 text-xs font-semibold text-black/60">
                      {dbCats.length} {dbCats.length === 1 ? "subcategory" : "subcategories"}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-black/50 uppercase tracking-widest">Explore →</span>
                </div>
              </div>
              <img
                src={group.image}
                alt={group.label}
                className="absolute bottom-0 right-0 object-cover object-left-top pointer-events-none select-none"
                style={{
                  width: isTall ? "75%" : "65%",
                  height: isTall ? "65%" : "70%",
                  opacity: 0.92,
                  maskImage: "radial-gradient(ellipse at bottom right, black 40%, transparent 80%)",
                  WebkitMaskImage: "radial-gradient(ellipse at bottom right, black 40%, transparent 80%)",
                }}
                draggable={false}
              />

              <div
                className="absolute inset-0 opacity-[0.07] pointer-events-none"
                style={{ backgroundImage: "radial-gradient(circle, black 1px, transparent 1px)", backgroundSize: "20px 20px" }}
              />
            </motion.button>



          );
        })}
      </div>
    </div>
  );
}
