import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/format";
import { CreditCard, ShieldCheck, Loader2 } from "lucide-react";

export function BookingDialog({ open, onOpenChange, room, userId, onDone }: {
  open: boolean; onOpenChange: (v: boolean) => void; room: any; userId: string; onDone: () => void;
}) {
  const [step, setStep] = useState<"details" | "pay" | "done">("details");
  const [message, setMessage] = useState("");
  const [card, setCard] = useState("4242 4242 4242 4242");
  const [processing, setProcessing] = useState(false);
  const [ref, setRef] = useState<string>("");

  async function pay() {
    setProcessing(true);
    await new Promise((r) => setTimeout(r, 1500));
    const payment_ref = "PAY_" + Math.random().toString(36).slice(2, 10).toUpperCase();
    const { error } = await supabase.from("bookings").insert({
      room_id: room.id,
      renter_id: userId,
      owner_id: room.owner_id,
      advance_paid: room.advance,
      payment_ref,
      message,
      status: "pending",
    });
    if (error) { toast.error(error.message); setProcessing(false); return; }
    await supabase.from("notifications").insert({
      user_id: room.owner_id,
      title: "New booking request",
      body: `Someone requested to book "${room.title}"`,
      link: `/owner`,
    });
    setRef(payment_ref);
    setProcessing(false);
    setStep("done");
    onDone();
  }

  function close() {
    onOpenChange(false);
    setTimeout(() => { setStep("details"); setMessage(""); setRef(""); }, 300);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) close(); }}>
      <DialogContent className="sm:max-w-md">
        {step === "details" && (
          <>
            <DialogHeader>
              <DialogTitle>Book this room</DialogTitle>
              <DialogDescription>You'll pay a refundable advance of <span className="font-medium text-foreground">{formatCurrency(room.advance)}</span> to confirm your request.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Label htmlFor="msg">Message to owner (optional)</Label>
              <Textarea id="msg" value={message} onChange={(e) => setMessage(e.target.value.slice(0, 500))} placeholder="Hi, I'd like to move in on..." rows={4} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={close}>Cancel</Button>
              <Button onClick={() => setStep("pay")}>Continue to payment</Button>
            </DialogFooter>
          </>
        )}
        {step === "pay" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" /> Secure payment (demo)</DialogTitle>
              <DialogDescription>This is a demo payment flow — no real money is charged.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-3 text-sm"><div className="flex justify-between"><span>Advance amount</span><span className="font-semibold">{formatCurrency(room.advance)}</span></div></div>
              <div className="space-y-2">
                <Label htmlFor="card">Card number</Label>
                <Input id="card" value={card} onChange={(e) => setCard(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label htmlFor="exp">Expiry</Label><Input id="exp" placeholder="12/28" defaultValue="12/28" /></div>
                <div className="space-y-2"><Label htmlFor="cvc">CVC</Label><Input id="cvc" placeholder="123" defaultValue="123" /></div>
              </div>
              <p className="flex items-center gap-1 text-xs text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5" /> Test mode — no real card required.</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("details")} disabled={processing}>Back</Button>
              <Button onClick={pay} disabled={processing}>{processing ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing…</>) : `Pay ${formatCurrency(room.advance)}`}</Button>
            </DialogFooter>
          </>
        )}
        {step === "done" && (
          <>
            <DialogHeader>
              <DialogTitle>Booking request sent 🎉</DialogTitle>
              <DialogDescription>Your advance is held. The owner has been notified and will confirm shortly.</DialogDescription>
            </DialogHeader>
            <div className="rounded-lg bg-muted p-4 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Payment reference</span><span className="font-mono font-medium">{ref}</span></div>
              <div className="mt-1 flex justify-between"><span className="text-muted-foreground">Amount paid</span><span className="font-medium">{formatCurrency(room.advance)}</span></div>
            </div>
            <DialogFooter><Button onClick={close}>Done</Button></DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}