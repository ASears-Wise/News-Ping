"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { notificationsApi, sourcesApi } from "@/lib/api";
import { NotificationCard } from "@/components/notification-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CATEGORIES = ["breaking", "opinion", "briefing", "sports", "politics", "general"];

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const { data: sourcesData } = useQuery({
    queryKey: ["sources"],
    queryFn: () => sourcesApi.list().then((r) => r.data.data),
    staleTime: Infinity,
  });

  const { data, isFetching, isError } = useQuery({
    queryKey: ["notifications-search", submittedQuery, sourceFilter, categoryFilter],
    queryFn: () =>
      notificationsApi
        .list({
          q: submittedQuery || undefined,
          source: sourceFilter !== "all" ? sourceFilter : undefined,
          category: categoryFilter !== "all" ? categoryFilter : undefined,
          limit: 100,
        })
        .then((r) => r.data),
    enabled: submittedQuery.length > 0,
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSubmittedQuery(query.trim());
  }

  const results = data?.data ?? [];

  return (
    <div className="max-w-3xl mx-auto">
      <div className="sticky top-0 bg-white border-b z-10 px-6 py-4">
        <h1 className="text-lg font-semibold mb-3">Search</h1>
        <form onSubmit={handleSearch} className="flex gap-2 mb-3">
          <Input
            type="search"
            placeholder="Search notifications..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1"
            autoFocus
          />
          <Button type="submit" disabled={!query.trim()}>Search</Button>
        </form>
        <div className="flex gap-2">
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue placeholder="All sources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              {sourcesData?.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!submittedQuery && (
        <div className="px-6 py-12 text-center text-sm text-gray-400">
          Enter a keyword to search all notifications
        </div>
      )}

      {isError && (
        <div className="px-6 py-12 text-center text-sm text-red-600">Search failed. Please try again.</div>
      )}

      {isFetching && (
        <div className="space-y-0">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="px-6 py-4 border-b">
              <Skeleton className="h-3 w-24 mb-2" />
              <Skeleton className="h-4 w-full mb-1.5" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      )}

      {!isFetching && submittedQuery && results.length === 0 && (
        <div className="px-6 py-12 text-center text-sm text-gray-500">
          No results for &ldquo;{submittedQuery}&rdquo;
        </div>
      )}

      {!isFetching && results.map((n) => (
        <NotificationCard key={n.id} notification={n} />
      ))}

      {!isFetching && results.length > 0 && (
        <p className="px-6 py-4 text-xs text-gray-400 text-right">{results.length} results</p>
      )}
    </div>
  );
}
