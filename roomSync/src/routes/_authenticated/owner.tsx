import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, Edit, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate, roomTypeLabel } from "@/lib/format";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/owner")({
  head: () => ({ meta: [{ title: "Owner Dashboard — RoomBridge" }] }),
  component: OwnerDashboard,
});

function OwnerDashboard() {
  const roomsQuery = useQuery({
    queryKey: ["owner-rooms"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data, error } = await supabase.from("rooms").select("*, room_media(url, type, sort_order)").eq("owner_id", u.user.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const bookingsQuery = useQuery({
    queryKey: ["owner-bookings"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data, error } = await supabase.from("bookings").select("*, rooms(title, city), profiles:renter_id(full_name, phone)").eq("owner_id", u.user.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function deleteRoom(id: string) {
    if (!confirm("Delete this listing?")) return;
    const { error } = await supabase.from("rooms").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Listing deleted");
    roomsQuery.refetch();
  }

  async function setStatus(id: string, status: "available" | "occupied") {
    const { error } = await supabase.from("rooms").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    roomsQuery.refetch();
  }

  async function updateBooking(b: any, status: "confirmed" | "rejected") {
    const { error } = await supabase.from("bookings").update({ status }).eq("id", b.id);
    if (error) return toast.error(error.message);
    await supabase.from("notifications").insert({
      user_id: b.renter_id,
      title: status === "confirmed" ? "Booking confirmed!" : "Booking declined",
      body: `Your request for "${b.rooms?.title}" was ${status}.`,
      link: "/bookings",
    });
    if (status === "confirmed") await supabase.from("rooms").update({ status: "occupied" }).eq("id", b.room_id);
    toast.success(`Booking ${status}`);
    bookingsQuery.refetch();
    roomsQuery.refetch();
  }

  const rooms = roomsQuery.data ?? [];
  const bookings = bookingsQuery.data ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Owner Dashboard</h1>
          <p className="text-muted-foreground">Manage your listings and booking requests.</p>
        </div>
        <Button asChild><Link to="/owner/new"><Plus className="mr-2 h-4 w-4" /> New listing</Link></Button>
      </div>

      <Tabs defaultValue="listings" className="mt-8">
        <TabsList>
          <TabsTrigger value="listings">Listings ({rooms.length})</TabsTrigger>
          <TabsTrigger value="bookings">Booking Requests ({bookings.filter((b: any) => b.status === "pending").length})</TabsTrigger>
        </TabsList>

        <TabsContent value="listings" className="mt-6">
          {rooms.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed p-12 text-center">
              <p className="font-medium">No listings yet</p>
              <Button asChild className="mt-4"><Link to="/owner/new"><Plus className="mr-2 h-4 w-4" /> Create your first listing</Link></Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {rooms.map((r: any) => {
                const media = (r.room_media ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order);
                const cover = media[0]?.url;
                return (
                  <Card key={r.id}>
                    <CardContent className="flex gap-4 p-4">
                      <div className="h-28 w-40 shrink-0 overflow-hidden rounded-lg bg-muted">
                        {cover ? <img src={cover} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center text-xs text-muted-foreground">No photo</div>}
                      </div>
                      <div className="flex flex-1 flex-col">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <Link to="/rooms/$id" params={{ id: r.id }} className="font-display text-lg font-semibold hover:underline">{r.title}</Link>
                            <p className="text-sm text-muted-foreground">{roomTypeLabel(r.room_type)} · {r.city} · {formatCurrency(r.rent)}/mo</p>
                          </div>
                          <Badge className={r.status === "available" ? "bg-primary" : "bg-muted-foreground"}>{r.status}</Badge>
                        </div>
                        <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
                          <Select value={r.status} onValueChange={(v) => setStatus(r.id, v as any)}>
                            <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="available">Available</SelectItem>
                              <SelectItem value="occupied">Occupied</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button asChild variant="outline" size="sm"><Link to="/owner/edit/$id" params={{ id: r.id }}><Edit className="mr-1 h-3.5 w-3.5" /> Edit</Link></Button>
                          <Button variant="outline" size="sm" onClick={() => deleteRoom(r.id)}><Trash2 className="mr-1 h-3.5 w-3.5" /> Delete</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="bookings" className="mt-6">
          {bookings.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed p-12 text-center text-muted-foreground">No booking requests yet.</div>
          ) : (
            <div className="grid gap-3">
              {bookings.map((b: any) => (
                <Card key={b.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{b.rooms?.title}</CardTitle>
                        <p className="text-sm text-muted-foreground">From {b.profiles?.full_name || "Guest"} {b.profiles?.phone && `· ${b.profiles.phone}`}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(b.created_at)} · Advance paid {formatCurrency(b.advance_paid)}</p>
                      </div>
                      <Badge variant={b.status === "confirmed" ? "default" : b.status === "rejected" ? "destructive" : "outline"}>{b.status}</Badge>
                    </div>
                  </CardHeader>
                  {(b.message || b.status === "pending") && (
                    <CardContent>
                      {b.message && <p className="mb-3 rounded-lg bg-muted p-3 text-sm">{b.message}</p>}
                      {b.status === "pending" && (
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => updateBooking(b, "confirmed")}><CheckCircle2 className="mr-1 h-4 w-4" /> Confirm</Button>
                          <Button size="sm" variant="outline" onClick={() => updateBooking(b, "rejected")}><XCircle className="mr-1 h-4 w-4" /> Decline</Button>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}