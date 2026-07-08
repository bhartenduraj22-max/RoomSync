import { Link, useRouter } from "@tanstack/react-router";
import { Bell, Heart, Home, LogOut, Menu, Plus, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

export function SiteHeader() {
  const { user } = useSession();
  const router = useRouter();

  const { data: unread = 0 } = useQuery({
    queryKey: ["notifications-unread", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("read", false);
      return count ?? 0;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  async function signOut() {
    await supabase.auth.signOut();
    router.navigate({ to: "/" });
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg hero-gradient text-primary-foreground">
            <Home className="h-5 w-5" />
          </div>
          <span className="font-display text-xl font-semibold tracking-tight">RoomBridge</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Link to="/" className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">Browse</Link>
          {user && (
            <>
              <Link to="/owner" className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">Owner Dashboard</Link>
              <Link to="/bookings" className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">My Bookings</Link>
            </>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Button asChild variant="ghost" size="icon" className="relative">
                <Link to="/notifications" aria-label="Notifications">
                  <Bell className="h-5 w-5" />
                  {unread > 0 && (
                    <Badge className="absolute -right-1 -top-1 h-5 min-w-5 rounded-full bg-accent px-1 text-xs text-accent-foreground">
                      {unread}
                    </Badge>
                  )}
                </Link>
              </Button>
              <Button asChild variant="ghost" size="icon">
                <Link to="/favorites" aria-label="Favorites"><Heart className="h-5 w-5" /></Link>
              </Button>
              <Button asChild variant="default" size="sm" className="hidden sm:inline-flex">
                <Link to="/owner/new"><Plus className="mr-1 h-4 w-4" /> List a Room</Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Menu"><Menu className="h-5 w-5" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild><Link to="/owner"><User className="mr-2 h-4 w-4" />Owner Dashboard</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/bookings">My Bookings</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/favorites">Favorites</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/notifications">Notifications</Link></DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut}><LogOut className="mr-2 h-4 w-4" />Sign out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm"><Link to="/auth">Sign in</Link></Button>
              <Button asChild size="sm"><Link to="/auth">Get Started</Link></Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}