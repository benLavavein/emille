import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Search, Users, Check } from "lucide-react";

interface Props {
  mealId: Id<"meals">;
  mealName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareMealDialog({ mealId, mealName, open, onOpenChange }: Props) {
  const friends = useQuery(api.friends.getFriends);
  const sendShare = useMutation(api.mealShares.send);

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<Id<"users">>>(new Set());
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const filtered = useMemo(() => {
    if (!friends) return [];
    const q = search.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.friendCode ?? "").toLowerCase().includes(q),
    );
  }, [friends, search]);

  const toggle = (friendId: Id<"users">) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(friendId)) next.delete(friendId);
      else next.add(friendId);
      return next;
    });
  };

  const handleSend = async () => {
    if (selected.size === 0 || sending) return;
    setSending(true);
    try {
      await sendShare({ mealId, toUserIds: Array.from(selected) });
      setSent(true);
      setTimeout(() => {
        setSent(false);
        setSelected(new Set());
        setSearch("");
        onOpenChange(false);
      }, 1200);
    } finally {
      setSending(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSearch("");
      setSelected(new Set());
      setSent(false);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex flex-col p-0 gap-0 max-sm:top-0 max-sm:left-0 max-sm:translate-x-0 max-sm:translate-y-0 max-sm:h-dvh max-sm:w-screen max-sm:max-w-none max-sm:rounded-none sm:max-w-md">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-blush/30">
          <DialogTitle className="text-plum">Share Recipe</DialogTitle>
          <p className="text-sm text-mauve mt-1 truncate">{mealName}</p>
        </DialogHeader>

        <div className="px-4 pt-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-mauve/50 pointer-events-none" />
            <Input
              placeholder="Search friends…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2 min-h-0">
          {friends === undefined ? (
            <div className="flex flex-col gap-2 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 rounded-xl bg-blush/20" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 flex flex-col items-center gap-3 text-center">
              <Users className="size-10 text-mauve/30" />
              <p className="text-sm text-mauve/60">
                {friends.length === 0
                  ? "You don't have any friends yet."
                  : "No friends match your search."}
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {filtered.map((friend) => {
                const isSelected = selected.has(friend.friendId);
                return (
                  <li key={friend.friendshipId}>
                    <button
                      type="button"
                      onClick={() => toggle(friend.friendId)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors text-left ${
                        isSelected
                          ? "bg-plum/10 border-plum/40"
                          : "bg-white/60 border-blush/40 hover:bg-blush/20"
                      }`}
                    >
                      <div
                        className={`size-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? "bg-plum border-plum"
                            : "border-mauve/40"
                        }`}
                      >
                        {isSelected && (
                          <Check className="size-3 text-white" strokeWidth={3} />
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-plum truncate">
                          {friend.name}
                        </span>
                        {friend.friendCode && (
                          <span className="text-xs font-mono text-mauve/60 tracking-wider">
                            {friend.friendCode}
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-blush/30">
          <Button
            onClick={handleSend}
            disabled={selected.size === 0 || sending || sent}
            className="w-full sm:w-auto"
          >
            {sent
              ? "Sent!"
              : sending
                ? "Sending…"
                : selected.size > 0
                  ? `Share with ${selected.size} friend${selected.size > 1 ? "s" : ""}`
                  : "Select friends to share"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
