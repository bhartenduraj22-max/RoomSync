import { createFileRoute } from "@tanstack/react-router";
import { RoomForm } from "@/components/room-form";

export const Route = createFileRoute("/_authenticated/owner/new")({
  head: () => ({ meta: [{ title: "New Listing — RoomBridge" }] }),
  component: () => <div className="mx-auto max-w-3xl px-4 py-8"><h1 className="font-display text-3xl font-semibold">List a new room</h1><p className="text-muted-foreground">Add photos, details and pricing.</p><div className="mt-6"><RoomForm /></div></div>,
});