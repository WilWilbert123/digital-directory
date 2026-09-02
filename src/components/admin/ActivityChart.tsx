"use client";

import { useTheme } from "next-themes";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useEffect, useState } from "react";

const DUMMY_DATA = [
  { name: "Mon", queries: 400 },
  { name: "Tue", queries: 300 },
  { name: "Wed", queries: 550 },
  { name: "Thu", queries: 450 },
  { name: "Fri", queries: 700 },
  { name: "Sat", queries: 900 },
  { name: "Sun", queries: 850 },
];

export function ActivityChart() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="h-[300px] w-full animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800/50" />;
  }

  const isDark = theme === "dark";
  const textColor = isDark ? "#a1a1aa" : "#71717a"; // zinc-400 : zinc-500
  const gridColor = isDark ? "#27272a" : "#f4f4f5"; // zinc-800 : zinc-100
  const lineColor = isDark ? "#38bdf8" : "#0284c7"; // sky-400 : sky-600

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={DUMMY_DATA} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
          <XAxis 
            dataKey="name" 
            stroke={textColor} 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
            dy={10} 
          />
          <YAxis 
            stroke={textColor} 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
            tickFormatter={(value) => `${value}`} 
          />
          <Tooltip
            contentStyle={{
              backgroundColor: isDark ? "#18181b" : "#ffffff", // zinc-900 : white
              borderColor: isDark ? "#27272a" : "#e4e4e7", // zinc-800 : zinc-200
              borderRadius: "0.5rem",
              color: isDark ? "#f4f4f5" : "#18181b", // zinc-100 : zinc-900
              boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
            }}
            itemStyle={{ color: lineColor, fontWeight: 600 }}
          />
          <Line 
            type="monotone" 
            dataKey="queries" 
            name="Kiosk Queries" 
            stroke={lineColor} 
            strokeWidth={3} 
            dot={{ r: 4, strokeWidth: 2, fill: isDark ? "#18181b" : "#ffffff" }} 
            activeDot={{ r: 6, strokeWidth: 0, fill: lineColor }} 
            animationDuration={1500}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
