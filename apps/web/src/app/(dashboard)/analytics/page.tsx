"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, PieChart, Pie, Cell, Legend,
} from "recharts";

const PIE_COLORS = ["#ef4444", "#8b5cf6", "#3b82f6", "#22c55e", "#f97316", "#6b7280"];
const CATEGORY_LABELS: Record<string, string> = {
  breaking: "Breaking",
  opinion: "Opinion",
  briefing: "Briefing",
  sports: "Sports",
  politics: "Politics",
  general: "General",
};

type DaysOption = 7 | 30 | 90;

export default function AnalyticsPage() {
  const [days, setDays] = useState<DaysOption>(30);

  const { data: freqData, isLoading: freqLoading } = useQuery({
    queryKey: ["analytics-frequency", days],
    queryFn: () => analyticsApi.frequency({ days }).then((r) => r.data.data),
    staleTime: 5 * 60_000,
  });

  const { data: catData, isLoading: catLoading } = useQuery({
    queryKey: ["analytics-categories", days],
    queryFn: () => analyticsApi.categories({ days }).then((r) => r.data.data),
    staleTime: 5 * 60_000,
  });

  const { data: sourcesData, isLoading: sourcesLoading } = useQuery({
    queryKey: ["analytics-sources", days],
    queryFn: () => analyticsApi.sources({ days }).then((r) => r.data.data),
    staleTime: 5 * 60_000,
  });

  // Reshape frequency data: group by date, with a key per source
  const freqByDate: Record<string, Record<string, number | string>> = {};
  const sourceNames = new Set<string>();
  for (const row of freqData ?? []) {
    if (!freqByDate[row.date]) freqByDate[row.date] = { date: row.date };
    freqByDate[row.date][row.source_id] = row.count;
    sourceNames.add(row.source_id);
  }
  const freqChartData = Object.values(freqByDate).sort((a, b) =>
    (a.date as string).localeCompare(b.date as string)
  );

  const SOURCE_COLORS = ["#1a1a1a", "#cc0000", "#bb1919", "#0274b6", "#ed1c24", "#ff8000", "#231f20", "#003366", "#052962", "#1a1a2e"];

  return (
    <div className="px-6 py-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Analytics</h1>
        <Tabs value={String(days)} onValueChange={(v) => setDays(Number(v) as DaysOption)}>
          <TabsList>
            <TabsTrigger value="7">7d</TabsTrigger>
            <TabsTrigger value="30">30d</TabsTrigger>
            <TabsTrigger value="90">90d</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Source totals bar */}
      <Card>
        <CardHeader><CardTitle className="text-sm font-medium text-gray-600">Notifications by source</CardTitle></CardHeader>
        <CardContent>
          {sourcesLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={sourcesData} layout="vertical" margin={{ left: 16 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="source_name" tick={{ fontSize: 11 }} width={110} />
                <Tooltip
                  formatter={(value, name) => [value, name === "total" ? "Total" : name === "breaking_count" ? "Breaking" : name]}
                />
                <Bar dataKey="total" fill="#1a1a1a" radius={[0, 3, 3, 0]} />
                <Bar dataKey="breaking_count" fill="#ef4444" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Frequency over time */}
      <Card>
        <CardHeader><CardTitle className="text-sm font-medium text-gray-600">Notification volume over time</CardTitle></CardHeader>
        <CardContent>
          {freqLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={freqChartData} margin={{ top: 4, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {Array.from(sourceNames).map((sid, i) => (
                  <Line
                    key={sid}
                    type="monotone"
                    dataKey={sid}
                    stroke={SOURCE_COLORS[i % SOURCE_COLORS.length]}
                    dot={false}
                    strokeWidth={1.5}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Category breakdown */}
      <Card>
        <CardHeader><CardTitle className="text-sm font-medium text-gray-600">Category breakdown</CardTitle></CardHeader>
        <CardContent className="flex justify-center">
          {catLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={catData}
                  dataKey="count"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ category, percent }: { category?: string; percent?: number }) =>
                    !category || percent === undefined ? "" :
                    `${CATEGORY_LABELS[category] ?? category} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {catData?.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, name) => [v, CATEGORY_LABELS[name as string] ?? name]} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
