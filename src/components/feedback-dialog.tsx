import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { sendFeedback } from "@/lib/feedback.functions";

export const FEEDBACK_EVENT = "open-feedback";

export function openFeedbackDialog() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(FEEDBACK_EVENT));
  }
}

const TYPES = [
  { id: "bug", label: "Bug report" },
  { id: "feature", label: "Feature request" },
  { id: "general", label: "General feedback" },
] as const;

type FeedbackType = (typeof TYPES)[number]["id"];

export function FeedbackDialog() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>("general");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const send = useServerFn(sendFeedback);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener(FEEDBACK_EVENT, handler);
    return () => window.removeEventListener(FEEDBACK_EVENT, handler);
  }, []);

  const submit = async () => {
    const trimmed = message.trim();
    if (!trimmed) {
      toast.error("Please write a message first.");
      return;
    }
    setSending(true);
    try {
      await send({ data: { type, message: trimmed } });
      toast.success("Thanks! We'll read every message. ✨");
      setMessage("");
      setType("general");
      setOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Couldn't send feedback. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !sending && setOpen(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send feedback ✨</DialogTitle>
          <DialogDescription>
            What's on your mind? Report a bug, suggest a feature, or just say hello.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-foreground/50">
              Type (optional)
            </span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as FeedbackType)}
              disabled={sending}
              className="w-full rounded-2xl border border-hairline bg-background/60 px-4 py-2.5 text-sm text-foreground outline-none focus:border-lavender/60"
            >
              {TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-foreground/50">
              Message
            </span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={sending}
              rows={5}
              maxLength={4000}
              placeholder="Tell us anything…"
              className="w-full resize-none rounded-2xl border border-hairline bg-background/60 px-4 py-3 text-sm text-foreground outline-none focus:border-lavender/60"
            />
          </label>
        </div>

        <DialogFooter>
          <button
            onClick={() => setOpen(false)}
            disabled={sending}
            className="rounded-full border border-hairline px-4 py-2 text-sm font-medium text-foreground/70 hover:text-foreground"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={sending || !message.trim()}
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {sending ? "Sending…" : "Send"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
