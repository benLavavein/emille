import { Link } from "react-router";
import { Timer } from "lucide-react";

type SideCardProps = {
  sideId: string;
  name: string;
  cookTime?: number;
  alwaysInclude?: boolean;
};

function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${mins} min`;
}

export function SideCard({ sideId, name, cookTime, alwaysInclude }: SideCardProps) {
  return (
    <Link
      to={`/meals/${sideId}`}
      className="flex items-center gap-3 px-3 py-2.5 bg-white/60 border border-blush/50 rounded-lg hover:border-plum/30 hover:bg-white/80 transition-colors group"
    >
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-plum group-hover:text-plum truncate block">
          {name}
        </span>
        {cookTime && (
          <span className="inline-flex items-center gap-1 text-xs text-mauve/70 mt-0.5">
            <Timer className="size-3" />
            {formatDuration(cookTime)}
          </span>
        )}
      </div>
      {alwaysInclude && (
        <span className="shrink-0 text-xs px-1.5 py-0.5 rounded-full bg-plum/10 text-plum font-medium">
          Always
        </span>
      )}
    </Link>
  );
}
