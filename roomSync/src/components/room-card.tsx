import { Link } from "@tanstack/react-router";
import { Heart, MapPin, Star } from "lucide-react";
import { formatCurrency, roomTypeLabel } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type RoomCardData = {
  id: string;
  title: string;
  city: string;
  rent: number;
  room_type: string;
  status: string;
  cover?: string | null;
  rating?: number;
  reviews?: number;
  favorited?: boolean;
};

export function RoomCard({ room, onToggleFavorite }: { room: RoomCardData; onToggleFavorite?: (id: string) => void }) {
  return (
    <Link to="/rooms/$id" params={{ id: room.id }} className="group block overflow-hidden rounded-2xl bg-card shadow-soft transition hover:shadow-lift">
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {room.cover ? (
          <img src={room.cover} alt={room.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">No photo</div>
        )}
        {onToggleFavorite && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); onToggleFavorite(room.id); }}
            className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-background/90 shadow-soft transition hover:scale-105"
            aria-label="Toggle favorite"
          >
            <Heart className={cn("h-5 w-5", room.favorited ? "fill-destructive text-destructive" : "text-foreground")} />
          </button>
        )}
        <Badge className={cn("absolute left-3 top-3", room.status === "available" ? "bg-primary text-primary-foreground" : "bg-muted-foreground text-background")}>
          {room.status === "available" ? "Available" : "Occupied"}
        </Badge>
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 font-display text-lg font-semibold">{room.title}</h3>
          {room.rating != null && room.reviews! > 0 && (
            <div className="flex shrink-0 items-center gap-1 text-sm">
              <Star className="h-4 w-4 fill-accent text-accent" />
              <span className="font-medium">{room.rating.toFixed(1)}</span>
              <span className="text-muted-foreground">({room.reviews})</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          <span className="line-clamp-1">{room.city}</span>
          <span className="mx-1">·</span>
          <span>{roomTypeLabel(room.room_type)}</span>
        </div>
        <div className="flex items-baseline gap-1 pt-1">
          <span className="font-display text-xl font-bold text-primary">{formatCurrency(room.rent)}</span>
          <span className="text-sm text-muted-foreground">/ month</span>
        </div>
      </div>
    </Link>
  );
}