import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal, Wifi, Snowflake, Car, Sofa } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RoomCard, type RoomCardData } from "@/components/room-card";
import { formatCurrency, ROOM_TYPES, GENDERS, roomTypeLabel } from "@/lib/format";
import { useSession } from "@/lib/session";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  component: Home,
});

type Filters = {
  q: string;
  city: string;
  roomType: string;
  gender: string;
  maxPrice: number;
  ac: boolean;
  wifi: boolean;
  parking: boolean;
  furnished: boolean;
};

const DEFAULT_FILTERS: Filters = { q: "", city: "", roomType: "any", gender: "any", maxPrice: 50000, ac: false, wifi: false, parking: false, furnished: false };

function Home() {
  const { user } = useSession();
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [applied, setApplied] = useState<Filters>(DEFAULT_FILTERS);

  const roomsQuery = useQuery({
    queryKey: ["rooms", applied],
    queryFn: async () => {
      let q = supabase.from("rooms").select("*, room_media(url, type, sort_order), reviews(rating)").order("created_at", { ascending: false }).limit(60);
      if (applied.q) q = q.ilike("title", `%${applied.q}%`);
      if (applied.city) q = q.ilike("city", `%${applied.city}%`);
      if (applied.roomType !== "any") q = q.eq("room_type", applied.roomType as never);
      if (applied.gender !== "any") q = q.in("gender_preference", ["any", applied.gender as never]);
      q = q.lte("rent", applied.maxPrice);
      if (applied.ac) q = q.eq("ac", true);
      if (applied.wifi) q = q.eq("wifi", true);
      if (applied.parking) q = q.eq("parking", true);
      if (applied.furnished) q = q.eq("furnished", true);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const favoritesQuery = useQuery({
    queryKey: ["favorites", user?.id],
    queryFn: async () => {
      if (!user) return new Set<string>();
      const { data } = await supabase.from("favorites").select("room_id");
      return new Set((data ?? []).map((f) => f.room_id));
    },
    enabled: !!user,
  });

  const cards: RoomCardData[] = useMemo(() => {
    const favs = favoritesQuery.data ?? new Set<string>();
    return (roomsQuery.data ?? []).map((r: any) => {
      const media = (r.room_media ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order);
      const cover = media.find((m: any) => m.type === "image")?.url ?? media[0]?.url ?? null;
      const ratings: number[] = (r.reviews ?? []).map((rv: any) => rv.rating);
      const rating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : undefined;
      return { id: r.id, title: r.title, city: r.city, rent: Number(r.rent), room_type: r.room_type, status: r.status, cover, rating, reviews: ratings.length, favorited: favs.has(r.id) };
    });
  }, [roomsQuery.data, favoritesQuery.data]);

  async function toggleFavorite(id: string) {
    if (!user) { toast.error("Sign in to save favorites"); return; }
    const favs = favoritesQuery.data ?? new Set<string>();
    if (favs.has(id)) {
      await supabase.from("favorites").delete().eq("room_id", id).eq("user_id", user.id);
    } else {
      await supabase.from("favorites").insert({ room_id: id, user_id: user.id });
    }
    favoritesQuery.refetch();
  }

  return (
    <div>
      <section className="relative overflow-hidden hero-gradient text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:py-24">
          <div className="max-w-2xl">
            <h1 className="font-display text-4xl font-semibold leading-tight sm:text-6xl">Find your next room.<br /><span className="text-accent">Simply. Transparently.</span></h1>
            <p className="mt-4 text-lg text-primary-foreground/80">Verified listings, real photos, honest reviews. Book with a secure advance — no surprises.</p>

            <div className="mt-8 flex flex-col gap-2 rounded-2xl bg-background p-3 text-foreground shadow-lift sm:flex-row">
              <div className="flex flex-1 items-center gap-2 rounded-lg bg-muted px-3">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input value={filters.city} onChange={(e) => setFilters({ ...filters, city: e.target.value })} placeholder="City (e.g. Bengaluru)" className="border-0 bg-transparent focus-visible:ring-0" />
              </div>
              <div className="flex flex-1 items-center gap-2 rounded-lg bg-muted px-3">
                <Input value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} placeholder="Keywords (e.g. balcony, near metro)" className="border-0 bg-transparent focus-visible:ring-0" />
              </div>
              <Button size="lg" className="rounded-lg" onClick={() => setApplied(filters)}><Search className="mr-2 h-4 w-4" /> Search</Button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          <aside className="space-y-6 rounded-2xl border bg-card p-5 shadow-soft lg:sticky lg:top-20 lg:h-fit">
            <div className="flex items-center gap-2 font-medium"><SlidersHorizontal className="h-4 w-4" /> Filters</div>

            <div className="space-y-2">
              <Label>Room type</Label>
              <Select value={filters.roomType} onValueChange={(v) => setFilters({ ...filters, roomType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any type</SelectItem>
                  {ROOM_TYPES.map((t) => (<SelectItem key={t} value={t}>{roomTypeLabel(t)}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Gender preference</Label>
              <Select value={filters.gender} onValueChange={(v) => setFilters({ ...filters, gender: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GENDERS.map((g) => (<SelectItem key={g} value={g}>{g === "any" ? "Any" : g.charAt(0).toUpperCase() + g.slice(1)}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm"><Label>Max rent / month</Label><span className="font-medium text-primary">{formatCurrency(filters.maxPrice)}</span></div>
              <Slider min={2000} max={100000} step={1000} value={[filters.maxPrice]} onValueChange={([v]) => setFilters({ ...filters, maxPrice: v })} />
            </div>

            <div className="space-y-3">
              <Label>Amenities</Label>
              {[
                { key: "ac", label: "Air Conditioning", icon: Snowflake },
                { key: "wifi", label: "Wi-Fi", icon: Wifi },
                { key: "parking", label: "Parking", icon: Car },
                { key: "furnished", label: "Furnished", icon: Sofa },
              ].map(({ key, label, icon: Icon }) => (
                <label key={key} className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox checked={filters[key as keyof Filters] as boolean} onCheckedChange={(v) => setFilters({ ...filters, [key]: !!v })} />
                  <Icon className="h-4 w-4 text-muted-foreground" /> {label}
                </label>
              ))}
            </div>

            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => setApplied(filters)}>Apply</Button>
              <Button variant="outline" onClick={() => { setFilters(DEFAULT_FILTERS); setApplied(DEFAULT_FILTERS); }}>Reset</Button>
            </div>
          </aside>

          <div>
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="font-display text-2xl font-semibold">{cards.length} rooms available</h2>
            </div>
            {roomsQuery.isLoading ? (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (<div key={i} className="h-80 animate-pulse rounded-2xl bg-muted" />))}
              </div>
            ) : cards.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed p-12 text-center">
                <p className="text-lg font-medium">No rooms match your filters</p>
                <p className="mt-1 text-sm text-muted-foreground">Try widening your search — reset filters and start over.</p>
                <Button className="mt-4" variant="outline" onClick={() => { setFilters(DEFAULT_FILTERS); setApplied(DEFAULT_FILTERS); }}>Reset filters</Button>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {cards.map((r) => (<RoomCard key={r.id} room={r} onToggleFavorite={toggleFavorite} />))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
