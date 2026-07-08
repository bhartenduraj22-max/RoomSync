export function formatCurrency(amount: number | string | null | undefined): string {
  const n = typeof amount === "string" ? Number(amount) : (amount ?? 0);
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export const ROOM_TYPES = ["single", "double", "shared", "studio", "pg", "flat"] as const;
export const GENDERS = ["any", "male", "female"] as const;

export function roomTypeLabel(t: string): string {
  const map: Record<string, string> = { single: "Single Room", double: "Double Room", shared: "Shared Room", studio: "Studio", pg: "PG / Hostel", flat: "Full Flat" };
  return map[t] ?? t;
}