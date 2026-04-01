"use client";

import { useState, useEffect, useRef } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { notificationsApi, sourcesApi, type NotificationsResponse } from "@/lib/api";
import { NotificationCard } from "@/components/notification-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CATEGORIES = ["breaking", "opinion", "briefing", "sports", "politics", "general"];

export default function FeedPage() {
  const [sourceFilter, setSourceFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: sourcesData } = useQuery({
    queryKey: ["sources"],
    queryFn: () => sourcesApi.list().then((r) => r.data.data),
    staleTime: Infinity,
  });

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    isError,
  } = useInfiniteQuery({
    queryKey: ["notifications", sourceFilter, categoryFilter],
    queryFn: ({ pageParam }) =>
      notificationsApi
        .list({
          source: sourceFilter !== "all" ? sourceFilter : undefined,
          category: categoryFilter !== "all" ? categoryFilter : undefined,
          cursor: pageParam as string | undefined,
          limit: 50,
        })
        .then((r) => r.data),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: NotificationsResponse) => lastPage.next_cursor ?? undefined,
  });

  // 30-second polling for new notifications
  useEffect(() => {
    const interval = setInterval(() => {
      // Refetch only the first page to pick up new items
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  const notifications = data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b z-10 px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-lg font-semibold">Feed</h1>
          <div className="flex gap-2">
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue placeholder="All sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                {sourcesData?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
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
                  <SelectItem key={c} value={c} className="capitalize">
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Notification list */}
      {isError && (
        <div className="px-6 py-12 text-center text-sm text-red-600">
          Failed to load notifications. Make sure you have an active subscription.
        </div>
      )}

      {!isError && notifications.length === 0 && !isFetching && (
        <div className="px-6 py-12 text-center text-sm text-gray-500">
          No notifications found.
        </div>
      )}

      {notifications.map((n) => (
        <NotificationCard key={n.id} notification={n} />
      ))}

      {/* Loading skeletons */}
      {(isFetching && !isFetchingNextPage) && (
        <div className="space-y-0">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="px-6 py-4 border-b">
              <div className="flex gap-2 mb-2">
                <Skeleton className="h-3 w-3 rounded-full" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-4 w-full mb-1.5" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          ))}
        </div>
      )}

      {/* Load more */}
      {hasNextPage && (
        <div className="px-6 py-6 text-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
