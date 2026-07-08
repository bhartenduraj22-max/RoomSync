import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RoomCard, type RoomCardData } from "@/components/room-card";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/favorites")({
  head: () => ({ meta: [{ title: "Favorites — RoomBridge" }] }),
  component: Favorites,
});

function Favorites() {
  const q = useQuery({
    queryKey: ["favorites-list"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data, error } = await supabase.from("favorites").select("room_id, rooms(*, room_media(url, type, sort_order), reviews(rating))").eq("user_id", u.user.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  async function unfav(id: string) {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    await supabase.from("favorites").delete().eq("room_id", id).eq("user_id", u.user.id);
    toast.success("Removed from favorites");
    q.refetch();
  }

  const cards: RoomCardData[] = (q.data ?? []).filter((f: any) => f.rooms).map((f: any) => {
    const r = f.rooms;
    const media = (r.room_media ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order);
    const ratings: number[] = (r.reviews ?? []).map((x: any) => x.rating);
    return { id: r.id, title: r.title, city: r.city, rent: Number(r.rent), room_type: r.room_type, status: r.status, cover: media[0]?.url ?? null, rating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : undefined, reviews: ratings.length, favorited: true };
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-display text-3xl font-semibold">Your favorites</h1>
      <p className="text-muted-foreground">Rooms you've saved for later.</p>
      <div className="mt-6">
        {cards.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed p-12 text-center text-muted-foreground">No favorites yet. Browse rooms and tap the heart to save.</div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((r) => <RoomCard key={r.id} room={r} onToggleFavorite={unfav} />)}
          </div>
        )}
      </div>
    </div>
  );
}