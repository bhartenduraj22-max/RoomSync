import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bell } from "lucide-react";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — RoomBridge" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const q = useQuery({
    queryKey: ["notifications-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    // mark all as read on open
    supabase.from("notifications").update({ read: true }).eq("read", false).then(() => q.refetch());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const items = q.data ?? [];
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display text-3xl font-semibold">Notifications</h1>
      <div className="mt-6 space-y-2">
        {items.length === 0 && <div className="rounded-2xl border-2 border-dashed p-10 text-center text-muted-foreground">You're all caught up.</div>}
        {items.map((n: any) => (
          <div key={n.id} className={cn("flex gap-3 rounded-xl border bg-card p-4", !n.read && "border-primary/40 bg-primary/5")}>
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><Bell className="h-4 w-4" /></div>
            <div className="flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <div className="font-medium">{n.title}</div>
                <div className="text-xs text-muted-foreground">{formatDate(n.created_at)}</div>
              </div>
              {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
              {n.link && <a href={n.link} className="mt-1 inline-block text-sm text-primary hover:underline">View →</a>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}