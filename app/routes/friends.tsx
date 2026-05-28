import { Suspense, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { OtterIcon } from "~/components/icons/otter";
import { Copy, Check, UserPlus, Users } from "lucide-react";

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
// Friend code display
// ---------------------------------------------------------------------------

function FriendCodeDisplay() {
  const { data: friendCode } = useSuspenseQuery(
    convexQuery(api.friends.getMyFriendCode, {})
  );
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!friendCode) return;
    await navigator.clipboard.writeText(friendCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!friendCode) return null;

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 bg-white/60 backdrop-blur-sm border border-blush/50 rounded-xl px-4 py-2.5">
        <span className="text-xs font-medium text-mauve uppercase tracking-widest">
          Your code
        </span>
        <span className="text-lg font-mono font-bold text-plum tracking-widest">
          {friendCode}
        </span>
      </div>
      <button
        onClick={handleCopy}
        title="Copy friend code"
        className="p-2.5 rounded-xl border border-blush/50 bg-white/60 backdrop-blur-sm text-mauve hover:text-plum hover:bg-white/80 transition-colors"
      >
        {copied ? (
          <Check className="size-4 text-green-600" />
        ) : (
          <Copy className="size-4" />
        )}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Send request
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
      setSuccess(
        result === "accepted" ? "You're now friends!" : "Friend request sent!"
      );
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          placeholder="Enter a friend code"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setError(null);
            setSuccess(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          maxLength={8}
          className="font-mono tracking-wider"
        />
        <Button
          onClick={handleSend}
          disabled={!code.trim() || loading}
          className="shrink-0"
        >
          <UserPlus className="size-4" />
          Send request
        </Button>
      </div>
      {error && <p className="text-sm text-destructive px-1">{error}</p>}
      {success && <p className="text-sm text-green-600 px-1">{success}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Incoming requests
// ---------------------------------------------------------------------------

function IncomingRequestsList() {
  const { data: requests } = useSuspenseQuery(
    convexQuery(api.friends.getIncomingRequests, {})
  );
  const accept = useMutation(api.friends.acceptFriendRequest);
  const decline = useMutation(api.friends.declineFriendRequest);

  if (requests.length === 0) {
    return (
      <div className="bg-white/40 backdrop-blur-sm border border-blush/30 rounded-2xl py-8 flex items-center justify-center">
        <p className="text-mauve/60 text-sm">
          Incoming requests will show up here
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {requests.map((req) => (
        <li
          key={req.requestId}
          className="flex items-center justify-between gap-3 bg-white/60 backdrop-blur-sm border border-blush/40 rounded-xl px-4 py-3"
        >
          <div className="flex flex-col min-w-0">
            <span className="font-medium text-plum truncate">{req.fromName}</span>
            {req.fromFriendCode && (
              <span className="text-xs font-mono text-mauve tracking-wider">
                {req.fromFriendCode}
              </span>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              size="sm"
              onClick={() => accept({ requestId: req.requestId })}
            >
              Accept
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-mauve hover:text-plum"
              onClick={() => decline({ requestId: req.requestId })}
            >
              Decline
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Friends list
// ---------------------------------------------------------------------------

function FriendsList() {
  const { data: friends } = useSuspenseQuery(
    convexQuery(api.friends.getFriends, {})
  );

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
    <ul className="flex flex-col gap-2">
      {friends.map((friend) => (
        <li
          key={friend.friendshipId}
          className="flex items-center gap-3 bg-white/60 backdrop-blur-sm border border-blush/40 rounded-xl px-4 py-3"
        >
          <div className="size-9 rounded-full bg-plum/10 flex items-center justify-center shrink-0">
            <Users className="size-4 text-plum" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-medium text-plum truncate">{friend.name}</span>
            {friend.friendCode && (
              <span className="text-xs font-mono text-mauve tracking-wider">
                {friend.friendCode}
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
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
      <div className="bg-white/60 backdrop-blur-sm border border-blush/40 rounded-2xl p-5 flex flex-col gap-4">
        <Suspense fallback={<div className="h-10 animate-pulse rounded-xl bg-blush/20" />}>
          <FriendCodeDisplay />
        </Suspense>
        <SendRequestRow />
      </div>

      {/* Incoming requests */}
      <section>
        <h2 className="text-sm font-semibold text-mauve uppercase tracking-wider mb-3">
          Incoming Requests
        </h2>
        <Suspense fallback={<CardSkeleton rows={2} />}>
          <IncomingRequestsList />
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
