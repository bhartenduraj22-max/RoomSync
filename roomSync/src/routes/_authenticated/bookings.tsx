import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/bookings")({
  head: () => ({ meta: [{ title: "My Bookings — RoomBridge" }] }),
  component: MyBookings,
});

function MyBookings() {
  const q = useQuery({
    queryKey: ["my-bookings"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data, error } = await supabase.from("bookings").select("*, rooms(id, title, city, room_media(url, type, sort_order))").eq("renter_id", u.user.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const bookings = q.data ?? [];
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="font-display text-3xl font-semibold">My Bookings</h1>
      <p className="text-muted-foreground">Track your booking requests and confirmations.</p>
      <div className="mt-6 grid gap-4">
        {bookings.length === 0 && <div className="rounded-2xl border-2 border-dashed p-12 text-center text-muted-foreground">You haven't booked any rooms yet.</div>}
        {bookings.map((b: any) => {
          const cover = (b.rooms?.room_media ?? []).sort((a: any, x: any) => a.sort_order - x.sort_order)[0]?.url;
          return (
            <Card key={b.id}>
              <CardContent className="flex gap-4 p-4">
                <div className="h-28 w-40 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {cover ? <img src={cover} alt="" className="h-full w-full object-cover" /> : null}
                </div>
                <div className="flex flex-1 flex-col">
                  <div className="flex items-start justify-between">
                    <div>
                      <Link to="/rooms/$id" params={{ id: b.rooms?.id }} className="font-display text-lg font-semibold hover:underline">{b.rooms?.title}</Link>
                      <p className="text-sm text-muted-foreground">{b.rooms?.city}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Booked {formatDate(b.created_at)} · Ref {b.payment_ref}</p>
                    </div>
                    <Badge variant={b.status === "confirmed" ? "default" : b.status === "rejected" ? "destructive" : "outline"}>{b.status}</Badge>
                  </div>
                  <div className="mt-auto pt-2 text-sm">Advance paid: <span className="font-semibold">{formatCurrency(b.advance_paid)}</span></div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}