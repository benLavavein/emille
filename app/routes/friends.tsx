import { Suspense, useMemo, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Switch } from "~/components/ui/switch";
import { OtterIcon } from "~/components/icons/otter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Copy,
  Check,
  Send,
  Users,
  Heart,
  MoreVertical,
  UtensilsCrossed,
  Inbox,
  UserPlus,
  ShoppingCart,
} from "lucide-react";

export function meta() {
  return [
    { title: "Friends - Emille" },
    { name: "description", content: "Manage your friends on Emille" },
  ];
}

// ---------------------------------------------------------------------------
// Skeletons
// ---------------------------------------------------------------------------

function CardSkeleton({ rows = 1 }: { rows?: number }) {
  return (
    <div className="animate-pulse flex flex-col gap-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 rounded-xl bg-blush/20" />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sharing toggle (reusable)
// ---------------------------------------------------------------------------

function SharingToggle({
  icon,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="size-9 rounded-full bg-plum/10 flex items-center justify-center shrink-0 text-plum">
          {icon}
        </div>
        <div>
          <p className="font-medium text-plum text-sm">{label}</p>
          <p className="text-xs text-mauve/70">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Soulmate card
// ---------------------------------------------------------------------------

function SoulmateSection() {
  const soulmate = useQuery(api.soulmates.getMySoulmate);
  const outgoing = useQuery(api.soulmates.getOutgoingRequest);
  const updateSharing = useMutation(api.soulmates.updateSharing);
  const dissolve = useMutation(api.soulmates.dissolve);
  const cancelRequest = useMutation(api.soulmates.cancelOutgoingRequest);

  const [showDissolveConfirm, setShowDissolveConfirm] = useState(false);

  if (soulmate === undefined || outgoing === undefined) {
    return <div className="h-32 animate-pulse rounded-2xl bg-blush/20" />;
  }

  if (soulmate) {
    return (
      <section>
        <h2 className="text-sm font-semibold text-mauve uppercase tracking-wider mb-3 flex items-center gap-2">
          <Heart className="size-4 fill-current" />
          Soulmate
        </h2>
        <div className="bg-white/60 backdrop-blur-sm border border-blush/40 rounded-2xl p-5">
          {/* Partner header */}
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-blush/30">
            <div className="size-12 rounded-full bg-plum/10 flex items-center justify-center shrink-0">
              <Heart className="size-6 text-plum fill-plum/30" />
            </div>
            <div>
              <p className="font-semibold text-plum text-lg">
                {soulmate.partnerName}
              </p>
              <p className="text-xs text-mauve/60">Your soulmate</p>
            </div>
          </div>

          {/* Sharing toggles */}
          <div className="divide-y divide-blush/20">
            <SharingToggle
              icon={<UtensilsCrossed className="size-4" />}
              label="Meals"
              description="See each other's meals and recipes"
              checked={soulmate.sharing.meals}
              onCheckedChange={(meals) =>
                updateSharing({
                  sharing: { meals, shoppingList: soulmate.sharing.shoppingList },
                })
              }
            />
            <SharingToggle
              icon={<ShoppingCart className="size-4" />}
              label="Shopping List"
              description="Share a single shopping list"
              checked={soulmate.sharing.shoppingList}
              onCheckedChange={(shoppingList) =>
                updateSharing({
                  sharing: { meals: soulmate.sharing.meals, shoppingList },
                })
              }
            />
          </div>

          {/* Dissolve */}
          <div className="mt-4 pt-4 border-t border-blush/30">
            {showDissolveConfirm ? (
              <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3">
                <p className="text-sm text-destructive mb-3">
                  Are you sure? This will end your soulmate relationship.
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      dissolve();
                      setShowDissolveConfirm(false);
                    }}
                  >
                    Yes, dissolve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowDissolveConfirm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowDissolveConfirm(true)}
                className="text-xs text-mauve/60 hover:text-destructive transition-colors"
              >
                Dissolve soulmate relationship
              </button>
            )}
          </div>
        </div>
      </section>
    );
  }

  if (outgoing) {
    return (
      <section>
        <h2 className="text-sm font-semibold text-mauve uppercase tracking-wider mb-3 flex items-center gap-2">
          <Heart className="size-4 fill-current" />
          Soulmate
        </h2>
        <div className="bg-white/60 backdrop-blur-sm border border-blush/40 rounded-2xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Heart className="size-5 text-plum/40 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-plum truncate">
                Request pending with {outgoing.toName}
              </p>
              <p className="text-xs text-mauve/60">
                Waiting for them to accept
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="text-mauve shrink-0"
            onClick={() => cancelRequest()}
          >
            Cancel
          </Button>
        </div>
      </section>
    );
  }

  return null;
}

// ---------------------------------------------------------------------------
// Request Soulmate dialog
// ---------------------------------------------------------------------------

function RequestSoulmateDialog({
  friend,
  open,
  onOpenChange,
}: {
  friend: { friendId: Id<"users">; name: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const sendRequest = useMutation(api.soulmates.sendRequest);
  const [meals, setMeals] = useState(true);
  const [shoppingList, setShoppingList] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (sending) return;
    setSending(true);
    try {
      await sendRequest({
        toUserId: friend.friendId,
        proposedSharing: { meals, shoppingList },
      });
      setSent(true);
      setTimeout(() => {
        setSent(false);
        onOpenChange(false);
      }, 1200);
    } finally {
      setSending(false);
    }
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setSent(false);
      setMeals(true);
      setShoppingList(true);
    }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex flex-col gap-0 p-0 max-sm:top-0 max-sm:left-0 max-sm:translate-x-0 max-sm:translate-y-0 max-sm:h-dvh max-sm:w-screen max-sm:max-w-none max-sm:rounded-none sm:max-w-md">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-blush/30">
          <div className="flex items-center gap-2 mb-1">
            <Heart className="size-5 text-plum fill-plum/20" />
            <DialogTitle className="text-plum">Soulmate Request</DialogTitle>
          </div>
          <p className="text-sm text-mauve">
            Soulmates can share their meals and shopping list with each other.
            You and{" "}
            <span className="font-medium text-plum">{friend.name}</span> can
            toggle sharing on or off at any time.
          </p>
        </DialogHeader>

        <div className="flex-1 px-6 py-4">
          <p className="text-xs font-semibold text-mauve uppercase tracking-widest mb-3">
            Propose sharing
          </p>
          <div className="divide-y divide-blush/20">
            <SharingToggle
              icon={<UtensilsCrossed className="size-4" />}
              label="Meals"
              description="See each other's meals and recipes"
              checked={meals}
              onCheckedChange={setMeals}
            />
            <SharingToggle
              icon={<ShoppingCart className="size-4" />}
              label="Shopping List"
              description="Share a single shopping list"
              checked={shoppingList}
              onCheckedChange={setShoppingList}
            />
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-blush/30">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sending || sent}
          >
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending || sent}>
            {sent ? "Sent!" : sending ? "Sending…" : "Send Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Friend code display
// ---------------------------------------------------------------------------

function FriendCodeDisplay() {
  const { data: friendCode } = useSuspenseQuery(
    convexQuery(api.friends.getMyFriendCode, {}),
  );
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!friendCode) return;
    await navigator.clipboard.writeText(friendCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-mauve uppercase tracking-widest">
        Your code
      </span>
      <div className="flex items-center gap-2 h-10 bg-plum/10 justify-between rounded-lg px-4">
        <span className="text-2xl font-mono font-bold text-plum tracking-widest text-center grow">
          {friendCode}
        </span>
        <Button
          size="icon"
          onClick={handleCopy}
          title="Copy friend code"
          variant="ghost"
        >
          {copied ? (
            <Check className="size-5 text-green-600" />
          ) : (
            <Copy className="size-5" />
          )}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Send friend request
// ---------------------------------------------------------------------------

function SendRequestRow() {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const sendRequest = useMutation(api.friends.sendFriendRequest);

  const handleSend = async () => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const { result } = await sendRequest({ friendCode: trimmed });
      setCode("");
      if (result === "accepted") setSuccess("You're now friends!");
      else if (result === "already_friends") setSuccess("You're already friends!");
      else setSuccess("Friend request sent!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: unknown) {
      if (e instanceof ConvexError) {
        const { code } = e.data as { code: string };
        if (code === "NOT_FOUND") {
          setCode("");
          setSuccess("Friend request sent!");
          setTimeout(() => setSuccess(null), 3000);
          return;
        }
        if (code === "SELF_ADD") {
          setCode("");
          setError("That's your friend code!");
          return;
        }
      }
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const isValidCode = useMemo(
    () => code.trim().length === 8 && /^[A-Z0-9]+$/.test(code.trim()),
    [code],
  );

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-mauve uppercase tracking-widest">
        Send request
      </span>
      <div className="flex gap-2 items-center">
        <Input
          placeholder="Enter friend code"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.replace(/[^A-Z0-9]/gi, "").toUpperCase());
            setError(null);
            setSuccess(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          maxLength={8}
          className="font-mono tracking-wider"
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!isValidCode || loading}
          className="shrink-0"
        >
          <Send className="size-5" />
        </Button>
      </div>
      {error && <p className="text-sm text-destructive px-1">{error}</p>}
      {success && <p className="text-sm text-green-600 px-1">{success}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inbox — friend requests + soulmate requests + meal shares
// ---------------------------------------------------------------------------

function InboxList() {
  const { data: friendRequests } = useSuspenseQuery(
    convexQuery(api.friends.getIncomingRequests, {}),
  );
  const { data: mealShares } = useSuspenseQuery(
    convexQuery(api.mealShares.getIncoming, {}),
  );
  const { data: soulmateRequests } = useSuspenseQuery(
    convexQuery(api.soulmates.getIncomingRequests, {}),
  );

  const acceptFriend = useMutation(api.friends.acceptFriendRequest);
  const declineFriend = useMutation(api.friends.declineFriendRequest);
  const acceptShare = useMutation(api.mealShares.accept);
  const declineShare = useMutation(api.mealShares.decline);
  const acceptSoulmate = useMutation(api.soulmates.acceptRequest);
  const declineSoulmate = useMutation(api.soulmates.declineRequest);

  const [shareErrors, setShareErrors] = useState<Record<string, string>>({});

  const handleAcceptShare = async (shareId: string) => {
    try {
      await acceptShare({ shareId: shareId as Id<"mealShares"> });
    } catch (e: unknown) {
      setShareErrors((prev) => ({
        ...prev,
        [shareId]: e instanceof Error ? e.message : "Something went wrong",
      }));
    }
  };

  const isEmpty =
    friendRequests.length === 0 &&
    mealShares.length === 0 &&
    soulmateRequests.length === 0;

  if (isEmpty) {
    return (
      <div className="bg-white/40 backdrop-blur-sm border border-blush/30 rounded-2xl py-8 flex items-center justify-center">
        <p className="text-mauve/60 text-sm">Your inbox is empty</p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {/* Soulmate requests */}
      {soulmateRequests.map((req) => {
        const parts = [
          req.proposedSharing.meals && "Meals",
          req.proposedSharing.shoppingList && "Shopping List",
        ].filter(Boolean);
        return (
          <li
            key={req.requestId}
            className="flex items-center justify-between gap-3 bg-white/60 backdrop-blur-sm border border-blush/40 rounded-xl px-4 py-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="size-8 rounded-full bg-plum/10 flex items-center justify-center shrink-0">
                <Heart className="size-4 text-plum fill-plum/20" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-medium text-plum truncate">
                  {req.fromName}
                </span>
                <span className="text-xs text-mauve/60">
                  Soulmate request
                  {parts.length > 0 ? ` · ${parts.join(" + ")}` : ""}
                </span>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                size="sm"
                onClick={() =>
                  acceptSoulmate({ requestId: req.requestId as Id<"soulmateRequests"> })
                }
              >
                Accept
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-mauve hover:text-plum"
                onClick={() =>
                  declineSoulmate({ requestId: req.requestId as Id<"soulmateRequests"> })
                }
              >
                Decline
              </Button>
            </div>
          </li>
        );
      })}

      {/* Friend requests */}
      {friendRequests.map((req) => (
        <li
          key={req.requestId}
          className="flex items-center justify-between gap-3 bg-white/60 backdrop-blur-sm border border-blush/40 rounded-xl px-4 py-3"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-8 rounded-full bg-plum/10 flex items-center justify-center shrink-0">
              <UserPlus className="size-4 text-plum" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-medium text-plum truncate">
                {req.fromName}
              </span>
              <span className="text-xs text-mauve/60">Friend request</span>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              size="sm"
              onClick={() =>
                acceptFriend({ requestId: req.requestId as Id<"friendRequests"> })
              }
            >
              Accept
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-mauve hover:text-plum"
              onClick={() =>
                declineFriend({ requestId: req.requestId as Id<"friendRequests"> })
              }
            >
              Decline
            </Button>
          </div>
        </li>
      ))}

      {/* Meal shares */}
      {mealShares.map((share) => (
        <li key={share.shareId} className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-3 bg-white/60 backdrop-blur-sm border border-blush/40 rounded-xl px-4 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="size-8 rounded-full bg-peach/50 flex items-center justify-center shrink-0">
                <UtensilsCrossed className="size-4 text-plum" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-medium text-plum truncate">
                  {share.mealName}
                </span>
                <span className="text-xs text-mauve/60">
                  From {share.fromName}
                </span>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                size="sm"
                disabled={share.mealDeleted}
                onClick={() => handleAcceptShare(share.shareId)}
              >
                Accept
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-mauve hover:text-plum"
                onClick={() =>
                  declineShare({ shareId: share.shareId as Id<"mealShares"> })
                }
              >
                Decline
              </Button>
            </div>
          </div>
          {share.mealDeleted && (
            <p className="text-xs text-destructive px-2">
              This recipe was deleted by the sender.
            </p>
          )}
          {shareErrors[share.shareId] && (
            <p className="text-xs text-destructive px-2">
              {shareErrors[share.shareId]}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Friends list with ellipsis menus
// ---------------------------------------------------------------------------

type FriendWithStatus = {
  friendshipId: Id<"friendships">;
  friendId: Id<"users">;
  name: string;
  friendCode?: string;
  isAlreadySoulmates: boolean;
  hasPendingRequestBetweenUs: boolean;
  canRequestSoulmate: boolean;
};

function FriendsList() {
  const { data: friends } = useSuspenseQuery(
    convexQuery(api.soulmates.getFriendsWithSoulmateStatus, {}),
  );

  const unfriend = useMutation(api.friends.unfriend);
  const [unfriendConfirm, setUnfriendConfirm] = useState<Id<"users"> | null>(null);
  const [soulmateDialogFriend, setSoulmateDialogFriend] =
    useState<FriendWithStatus | null>(null);

  if (friends.length === 0) {
    return (
      <div className="bg-white/40 backdrop-blur-sm border border-blush/30 rounded-2xl py-16 flex flex-col items-center justify-center gap-4">
        <OtterIcon className="w-24 h-24 text-plum/40" />
        <p className="text-mauve/60 text-sm text-center">
          Looks like no one&apos;s here.
          <br />
          I&apos;ll be your friend!
        </p>
      </div>
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-2">
        {friends.map((friend) => (
          <li key={friend.friendshipId} className="flex flex-col">
            <div className="flex items-center gap-3 bg-white/60 backdrop-blur-sm border border-blush/40 rounded-xl px-4 py-3">
              <div className="size-9 rounded-full bg-plum/10 flex items-center justify-center shrink-0">
                {friend.isAlreadySoulmates ? (
                  <Heart className="size-4 text-plum fill-plum/30" />
                ) : (
                  <Users className="size-4 text-plum" />
                )}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="font-medium text-plum truncate">
                  {friend.name}
                </span>
                {friend.friendCode && (
                  <span className="text-xs font-mono text-mauve tracking-wider">
                    {friend.friendCode}
                  </span>
                )}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="shrink-0 text-mauve">
                    <MoreVertical className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    disabled={!friend.canRequestSoulmate}
                    onClick={() => setSoulmateDialogFriend(friend)}
                  >
                    <Heart className="size-4 mr-2" />
                    {friend.isAlreadySoulmates
                      ? "Already soulmates"
                      : friend.hasPendingRequestBetweenUs
                        ? "Request pending"
                        : "Request Soulmate"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setUnfriendConfirm(friend.friendId)}
                  >
                    <Users className="size-4 mr-2" />
                    Unfriend
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Unfriend confirmation */}
            {unfriendConfirm === friend.friendId && (
              <div className="mt-1 p-3 bg-destructive/10 border border-destructive/30 rounded-xl">
                <p className="text-sm text-destructive mb-2">
                  Are you sure you want to unfriend{" "}
                  <span className="font-medium">{friend.name}</span>?
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      unfriend({ friendId: friend.friendId });
                      setUnfriendConfirm(null);
                    }}
                  >
                    Yes, unfriend
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setUnfriendConfirm(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      {soulmateDialogFriend && (
        <RequestSoulmateDialog
          friend={soulmateDialogFriend}
          open={!!soulmateDialogFriend}
          onOpenChange={(open) => {
            if (!open) setSoulmateDialogFriend(null);
          }}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function FriendsPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-plum">Friends</h1>
        <p className="text-mauve text-sm">
          Share your code or enter a friend&apos;s code to connect.
        </p>
      </div>

      {/* Friend code + send request */}
      <div className="bg-white/60 backdrop-blur-sm border border-blush/40 rounded-2xl p-5 flex flex-col sm:flex-row gap-4 sm:justify-between sm:items-center">
        <Suspense fallback={<div className="h-10 animate-pulse rounded-xl bg-blush/20" />}>
          <FriendCodeDisplay />
        </Suspense>
        <SendRequestRow />
      </div>

      {/* Soulmate card */}
      <SoulmateSection />

      {/* Inbox */}
      <section>
        <h2 className="text-sm font-semibold text-mauve uppercase tracking-wider mb-3 flex items-center gap-2">
          <Inbox className="size-4" />
          Inbox
        </h2>
        <Suspense fallback={<CardSkeleton rows={2} />}>
          <InboxList />
        </Suspense>
      </section>

      {/* Friends list */}
      <section>
        <h2 className="text-sm font-semibold text-mauve uppercase tracking-wider mb-3">
          Friends
        </h2>
        <Suspense fallback={<CardSkeleton rows={3} />}>
          <FriendsList />
        </Suspense>
      </section>
    </div>
  );
}
