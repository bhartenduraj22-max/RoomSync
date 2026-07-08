import { useState } from "react";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function ReviewForm({ roomId, onDone }: { roomId: string; onDone: () => void }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setBusy(false); return; }
    const { error } = await supabase.from("reviews").upsert({ room_id: roomId, renter_id: u.user.id, rating, comment }, { onConflict: "room_id,renter_id" });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Review posted");
    setComment("");
    onDone();
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-sm font-medium">Leave a review</div>
      <div className="mt-2 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => setRating(n)}>
            <Star className={cn("h-6 w-6", n <= rating ? "fill-accent text-accent" : "text-muted-foreground")} />
          </button>
        ))}
      </div>
      <Textarea className="mt-3" rows={3} value={comment} onChange={(e) => setComment(e.target.value.slice(0, 500))} placeholder="Share your experience…" />
      <Button className="mt-3" onClick={submit} disabled={busy}>Post review</Button>
    </div>
  );
}