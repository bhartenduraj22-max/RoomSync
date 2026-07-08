import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Heart, MapPin, Phone, Mail, Star, Snowflake, Wifi, Car, Sofa, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, roomTypeLabel, formatDate } from "@/lib/format";
import { useSession } from "@/lib/session";
import { BookingDialog } from "@/components/booking-dialog";
import { ReviewForm } from "@/components/review-form";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/rooms/$id")({
  component: RoomDetail,
});

function RoomDetail() {
  const { id } = useParams({ from: "/rooms/$id" });
  const { user } = useSession();
  const [activeMedia, setActiveMedia] = useState(0);
  const [bookingOpen, setBookingOpen] = useState(false);

  const roomQuery = useQuery({
    queryKey: ["room", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("rooms").select("*, room_media(*), reviews(*, profiles:renter_id(full_name, avatar_url)), profiles:owner_id(full_name, avatar_url, phone)").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const favQuery = useQuery({
    queryKey: ["fav", id, user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase.from("favorites").select("id").eq("room_id", id).eq("user_id", user.id).maybeSingle();
      return !!data;
    },
    enabled: !!user,
  });

  const canReviewQuery = useQuery({
    queryKey: ["can-review", id, user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase.from("bookings").select("id").eq("room_id", id).eq("renter_id", user.id).eq("status", "confirmed").limit(1);
      return (data ?? []).length > 0;
    },
    enabled: !!user,
  });

  async function toggleFav() {
    if (!user) { toast.error("Sign in to save favorites"); return; }
    if (favQuery.data) {
      await supabase.from("favorites").delete().eq("room_id", id).eq("user_id", user.id);
    } else {
      await supabase.from("favorites").insert({ room_id: id, user_id: user.id });
    }
    favQuery.refetch();
  }

  if (roomQuery.isLoading) return <div className="mx-auto max-w-6xl px-4 py-12"><div className="h-96 animate-pulse rounded-2xl bg-muted" /></div>;
  const r: any = roomQuery.data;
  if (!r) return <div className="mx-auto max-w-6xl px-4 py-12 text-center"><h2 className="text-2xl font-semibold">Room not found</h2><Link to="/" className="mt-4 inline-block text-primary underline">Back to browse</Link></div>;

  const media = (r.room_media ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order);
  const reviews = r.reviews ?? [];
  const avgRating = reviews.length ? reviews.reduce((s: number, rv: any) => s + rv.rating, 0) / reviews.length : 0;
  const active = media[activeMedia];

  const amenities = [
    { key: "ac", label: "Air Conditioning", icon: Snowflake, on: r.ac },
    { key: "wifi", label: "Wi-Fi", icon: Wifi, on: r.wifi },
    { key: "parking", label: "Parking", icon: Car, on: r.parking },
    { key: "furnished", label: "Furnished", icon: Sofa, on: r.furnished },
  ];

  const isOwner = user?.id === r.owner_id;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <div className="overflow-hidden rounded-2xl bg-muted shadow-soft">
            <div className="aspect-video">
              {active ? (
                active.type === "video" ? (
                  <video src={active.url} controls className="h-full w-full object-cover" />
                ) : (
                  <img src={active.url} alt={r.title} className="h-full w-full object-cover" />
                )
              ) : (
                <div className="grid h-full w-full place-items-center text-muted-foreground">No media uploaded</div>
              )}
            </div>
          </div>
          {media.length > 1 && (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {media.map((m: any, i: number) => (
                <button key={m.id} onClick={() => setActiveMedia(i)} className={cn("aspect-square overflow-hidden rounded-lg border-2", i === activeMedia ? "border-primary" : "border-transparent")}>
                  {m.type === "video" ? (
                    <div className="grid h-full w-full place-items-center bg-black text-xs text-white">▶ Video</div>
                  ) : (
                    <img src={m.url} alt="" className="h-full w-full object-cover" />
                  )}
                </button>
              ))}
            </div>
          )}

          <div className="mt-6 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Badge className={r.status === "available" ? "bg-primary" : "bg-muted-foreground"}>{r.status}</Badge>
                <Badge variant="outline">{roomTypeLabel(r.room_type)}</Badge>
                {r.gender_preference !== "any" && <Badge variant="outline"><Users className="mr-1 h-3 w-3" /> {r.gender_preference}</Badge>}
              </div>
              <h1 className="mt-3 font-display text-3xl font-semibold">{r.title}</h1>
              <p className="mt-1 flex items-center gap-1 text-muted-foreground"><MapPin className="h-4 w-4" /> {r.address}, {r.city}</p>
            </div>
            <Button variant="outline" size="icon" onClick={toggleFav} aria-label="Favorite">
              <Heart className={cn("h-5 w-5", favQuery.data && "fill-destructive text-destructive")} />
            </Button>
          </div>

          <Separator className="my-6" />

          <h2 className="font-display text-xl font-semibold">About this place</h2>
          <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{r.description || "No description provided."}</p>

          <h3 className="mt-6 font-display text-lg font-semibold">Amenities</h3>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {amenities.map(({ key, label, icon: Icon, on }) => (
              <div key={key} className={cn("flex items-center gap-2 rounded-lg border p-3 text-sm", on ? "border-primary/40 bg-primary/5" : "opacity-40")}>
                <Icon className="h-4 w-4" /> {label}
              </div>
            ))}
          </div>

          <Separator className="my-6" />

          <div className="flex items-center gap-3">
            <h2 className="font-display text-xl font-semibold">Reviews</h2>
            {reviews.length > 0 && (
              <div className="flex items-center gap-1"><Star className="h-4 w-4 fill-accent text-accent" /><span className="font-medium">{avgRating.toFixed(1)}</span><span className="text-muted-foreground">· {reviews.length} review{reviews.length !== 1 && "s"}</span></div>
            )}
          </div>
          {canReviewQuery.data && <div className="mt-4"><ReviewForm roomId={r.id} onDone={() => roomQuery.refetch()} /></div>}
          <div className="mt-4 space-y-4">
            {reviews.length === 0 && <p className="text-sm text-muted-foreground">No reviews yet.</p>}
            {reviews.map((rv: any) => (
              <div key={rv.id} className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{rv.profiles?.full_name || "Anonymous"}</div>
                  <div className="flex items-center gap-1 text-sm"><Star className="h-4 w-4 fill-accent text-accent" /> {rv.rating}</div>
                </div>
                <div className="text-xs text-muted-foreground">{formatDate(rv.created_at)}</div>
                {rv.comment && <p className="mt-2 text-sm">{rv.comment}</p>}
              </div>
            ))}
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:h-fit">
          <div className="rounded-2xl border bg-card p-6 shadow-lift">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-3xl font-bold text-primary">{formatCurrency(r.rent)}</span>
              <span className="text-muted-foreground">/ month</span>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Security deposit</span><span className="font-medium">{formatCurrency(r.deposit)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Advance to book</span><span className="font-medium text-accent-foreground">{formatCurrency(r.advance)}</span></div>
            </div>
            <Separator className="my-4" />
            {isOwner ? (
              <Button asChild className="w-full"><Link to="/owner/edit/$id" params={{ id: r.id }}>Edit listing</Link></Button>
            ) : r.status === "available" ? (
              <Button className="w-full" size="lg" onClick={() => user ? setBookingOpen(true) : toast.error("Sign in to book")}>Book with {formatCurrency(r.advance)} advance</Button>
            ) : (
              <Button className="w-full" size="lg" disabled>Currently occupied</Button>
            )}
          </div>

          <div className="rounded-2xl border bg-card p-6 shadow-soft">
            <h3 className="font-display text-lg font-semibold">Owner contact</h3>
            <p className="mt-2 text-sm font-medium">{r.contact_name}</p>
            <a href={`tel:${r.contact_phone}`} className="mt-2 flex items-center gap-2 text-sm text-primary"><Phone className="h-4 w-4" /> {r.contact_phone}</a>
            {r.contact_email && <a href={`mailto:${r.contact_email}`} className="mt-1 flex items-center gap-2 text-sm text-primary"><Mail className="h-4 w-4" /> {r.contact_email}</a>}
          </div>
        </aside>
      </div>

      {user && <BookingDialog open={bookingOpen} onOpenChange={setBookingOpen} room={r} userId={user.id} onDone={() => { roomQuery.refetch(); }} />}
    </div>
  );
}