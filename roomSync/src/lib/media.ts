import { supabase } from "@/integrations/supabase/client";

const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

export async function uploadRoomMedia(userId: string, file: File): Promise<{ url: string; path: string }> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("room-media").upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  const { data, error: signErr } = await supabase.storage.from("room-media").createSignedUrl(path, TEN_YEARS);
  if (signErr || !data) throw signErr ?? new Error("Failed to sign URL");
  return { url: data.signedUrl, path };
}

export function isVideo(file: File): boolean {
  return file.type.startsWith("video/");
}