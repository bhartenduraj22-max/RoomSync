import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { Upload, X, Loader2, Video as VideoIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { uploadRoomMedia, isVideo } from "@/lib/media";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ROOM_TYPES, GENDERS, roomTypeLabel } from "@/lib/format";

const schema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(2000),
  room_type: z.enum(ROOM_TYPES),
  city: z.string().trim().min(2).max(80),
  address: z.string().trim().min(5).max(300),
  rent: z.number().min(0).max(10_000_000),
  deposit: z.number().min(0).max(10_000_000),
  advance: z.number().min(0).max(10_000_000),
  contact_name: z.string().trim().min(2).max(100),
  contact_phone: z.string().trim().min(6).max(20),
  contact_email: z.string().trim().email().max(255).optional().or(z.literal("")),
  ac: z.boolean(), wifi: z.boolean(), parking: z.boolean(), furnished: z.boolean(),
  gender_preference: z.enum(GENDERS),
});

type MediaItem = { id?: string; url: string; type: "image" | "video"; sort_order: number };

export function RoomForm({ initial }: { initial?: any }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [media, setMedia] = useState<MediaItem[]>(
    ((initial?.room_media ?? []) as any[]).sort((a, b) => a.sort_order - b.sort_order).map((m) => ({ id: m.id, url: m.url, type: m.type, sort_order: m.sort_order })),
  );
  const [f, setF] = useState({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    room_type: initial?.room_type ?? "single",
    city: initial?.city ?? "",
    address: initial?.address ?? "",
    rent: initial?.rent ? Number(initial.rent) : 0,
    deposit: initial?.deposit ? Number(initial.deposit) : 0,
    advance: initial?.advance ? Number(initial.advance) : 0,
    contact_name: initial?.contact_name ?? "",
    contact_phone: initial?.contact_phone ?? "",
    contact_email: initial?.contact_email ?? "",
    ac: initial?.ac ?? false,
    wifi: initial?.wifi ?? false,
    parking: initial?.parking ?? false,
    furnished: initial?.furnished ?? false,
    gender_preference: initial?.gender_preference ?? "any",
  });

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    setUploading(true);
    try {
      for (const file of files) {
        if (file.size > 25 * 1024 * 1024) { toast.error(`${file.name} is too large (max 25MB)`); continue; }
        const { url } = await uploadRoomMedia(u.user.id, file);
        setMedia((prev) => [...prev, { url, type: isVideo(file) ? "video" : "image", sort_order: prev.length }]);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally { setUploading(false); e.target.value = ""; }
  }

  function removeMedia(idx: number) {
    setMedia((prev) => prev.filter((_, i) => i !== idx).map((m, i) => ({ ...m, sort_order: i })));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(f);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const payload = { ...parsed.data, contact_email: parsed.data.contact_email || null, owner_id: u.user.id };
      let roomId = initial?.id as string | undefined;
      if (roomId) {
        const { error } = await supabase.from("rooms").update(payload).eq("id", roomId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("rooms").insert(payload).select("id").single();
        if (error) throw error;
        roomId = data.id;
      }
      // sync media: delete removed, insert new
      const existingIds = ((initial?.room_media ?? []) as any[]).map((m) => m.id);
      const keptIds = media.filter((m) => m.id).map((m) => m.id!);
      const removed = existingIds.filter((id) => !keptIds.includes(id));
      if (removed.length) await supabase.from("room_media").delete().in("id", removed);
      const newOnes = media.filter((m) => !m.id).map((m) => ({ room_id: roomId!, url: m.url, type: m.type, sort_order: m.sort_order }));
      if (newOnes.length) await supabase.from("room_media").insert(newOnes);
      // update sort_order for kept
      for (const m of media.filter((m) => m.id)) {
        await supabase.from("room_media").update({ sort_order: m.sort_order }).eq("id", m.id!);
      }
      toast.success(initial ? "Listing updated" : "Listing published!");
      router.navigate({ to: "/owner" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="space-y-4 rounded-2xl border bg-card p-6">
        <h2 className="font-display text-lg font-semibold">Media</h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {media.map((m, i) => (
            <div key={i} className="relative aspect-square overflow-hidden rounded-lg bg-muted">
              {m.type === "video" ? (
                <div className="grid h-full w-full place-items-center bg-black text-white"><VideoIcon className="h-6 w-6" /></div>
              ) : (
                <img src={m.url} alt="" className="h-full w-full object-cover" />
              )}
              <button type="button" onClick={() => removeMedia(i)} className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-background/90"><X className="h-3 w-3" /></button>
            </div>
          ))}
          <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-sm text-muted-foreground hover:border-primary hover:text-primary">
            {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <><Upload className="h-6 w-6" /><span>Add media</span></>}
            <input type="file" accept="image/*,video/*" multiple hidden onChange={onFiles} disabled={uploading} />
          </label>
        </div>
        <p className="text-xs text-muted-foreground">Photos and videos, up to 25 MB each. First image is used as the cover.</p>
      </div>

      <div className="grid gap-4 rounded-2xl border bg-card p-6 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2"><Label>Title</Label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required maxLength={120} placeholder="Sunny 1BHK near Indiranagar metro" /></div>
        <div className="space-y-2 sm:col-span-2"><Label>Description</Label><Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} rows={5} maxLength={2000} placeholder="Describe the room, neighbourhood, house rules…" /></div>
        <div className="space-y-2"><Label>Room type</Label>
          <Select value={f.room_type} onValueChange={(v) => setF({ ...f, room_type: v as any })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{ROOM_TYPES.map((t) => <SelectItem key={t} value={t}>{roomTypeLabel(t)}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2"><Label>Gender preference</Label>
          <Select value={f.gender_preference} onValueChange={(v) => setF({ ...f, gender_preference: v as any })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{GENDERS.map((g) => <SelectItem key={g} value={g}>{g === "any" ? "Any" : g.charAt(0).toUpperCase() + g.slice(1)}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2"><Label>City</Label><Input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} required /></div>
        <div className="space-y-2"><Label>Address</Label><Input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} required /></div>
      </div>

      <div className="grid gap-4 rounded-2xl border bg-card p-6 sm:grid-cols-3">
        <div className="space-y-2"><Label>Monthly rent (₹)</Label><Input type="number" min={0} value={f.rent} onChange={(e) => setF({ ...f, rent: Number(e.target.value) })} required /></div>
        <div className="space-y-2"><Label>Security deposit (₹)</Label><Input type="number" min={0} value={f.deposit} onChange={(e) => setF({ ...f, deposit: Number(e.target.value) })} /></div>
        <div className="space-y-2"><Label>Advance to book (₹)</Label><Input type="number" min={0} value={f.advance} onChange={(e) => setF({ ...f, advance: Number(e.target.value) })} /></div>
      </div>

      <div className="grid gap-4 rounded-2xl border bg-card p-6 sm:grid-cols-3">
        <div className="space-y-2"><Label>Contact name</Label><Input value={f.contact_name} onChange={(e) => setF({ ...f, contact_name: e.target.value })} required /></div>
        <div className="space-y-2"><Label>Phone</Label><Input value={f.contact_phone} onChange={(e) => setF({ ...f, contact_phone: e.target.value })} required /></div>
        <div className="space-y-2"><Label>Email (optional)</Label><Input type="email" value={f.contact_email} onChange={(e) => setF({ ...f, contact_email: e.target.value })} /></div>
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-2xl border bg-card p-6 sm:grid-cols-4">
        {[
          { key: "ac", label: "AC" }, { key: "wifi", label: "Wi-Fi" },
          { key: "parking", label: "Parking" }, { key: "furnished", label: "Furnished" },
        ].map(({ key, label }) => (
          <label key={key} className="flex items-center justify-between rounded-lg border p-3">
            <span className="text-sm font-medium">{label}</span>
            <Switch checked={(f as any)[key]} onCheckedChange={(v) => setF({ ...f, [key]: v })} />
          </label>
        ))}
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.navigate({ to: "/owner" })}>Cancel</Button>
        <Button type="submit" disabled={busy || uploading}>{busy ? "Saving…" : initial ? "Save changes" : "Publish listing"}</Button>
      </div>
    </form>
  );
}