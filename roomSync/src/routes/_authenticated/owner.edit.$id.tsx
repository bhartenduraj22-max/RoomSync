import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RoomForm } from "@/components/room-form";

export const Route = createFileRoute("/_authenticated/owner/edit/$id")({
  head: () => ({ meta: [{ title: "Edit Listing — RoomBridge" }] }),
  component: EditRoom,
});

function EditRoom() {
  const { id } = useParams({ from: "/_authenticated/owner/edit/$id" });
  const q = useQuery({
    queryKey: ["edit-room", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("rooms").select("*, room_media(*)").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  if (q.isLoading) return <div className="mx-auto max-w-3xl px-4 py-12">Loading…</div>;
  if (!q.data) return <div className="mx-auto max-w-3xl px-4 py-12">Not found.</div>;
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display text-3xl font-semibold">Edit listing</h1>
      <div className="mt-6"><RoomForm initial={q.data as any} /></div>
    </div>
  );
}