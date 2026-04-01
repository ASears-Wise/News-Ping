"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { billingApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function BillingPage() {
  const searchParams = useSearchParams();
  const success = searchParams.get("success");

  const { data: sub, isLoading } = useQuery({
    queryKey: ["subscription"],
    queryFn: () => billingApi.getSubscription().then((r) => r.data.data),
  });

  async function handleManageBilling() {
    const res = await billingApi.createPortal();
    window.location.href = res.data.url;
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-6 space-y-6">
      <h1 className="text-lg font-semibold">Billing</h1>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-md px-4 py-3">
          Subscription activated successfully. Welcome to PushPulse Pro!
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current plan</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          ) : sub ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="font-medium capitalize">
                  {sub.stripe_price_id.includes("team") ? "Team" : "Pro"}
                </span>
                <Badge variant={sub.status === "active" ? "default" : "secondary"}>
                  {sub.status}
                </Badge>
                {sub.cancel_at_period_end ? (
                  <span className="text-xs text-orange-600">Cancels at period end</span>
                ) : null}
              </div>
              {sub.current_period_end && (
                <p className="text-sm text-gray-500">
                  {sub.cancel_at_period_end ? "Access until" : "Renews"}{" "}
                  {format(new Date(sub.current_period_end), "MMMM d, yyyy")}
                </p>
              )}
              <Button variant="outline" size="sm" onClick={handleManageBilling}>
                Manage billing
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">You don&apos;t have an active subscription.</p>
              <Button size="sm" onClick={() => (window.location.href = "/pricing")}>
                View plans
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
