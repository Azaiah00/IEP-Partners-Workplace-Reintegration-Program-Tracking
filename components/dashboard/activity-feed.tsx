import { formatDistanceToNow, parseISO } from "date-fns";
import {
  GraduationCap,
  Briefcase,
  UserPlus,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";

export type FeedItem = {
  id: string;
  name: string;
  action: string;
  entity: string;
  date: string;
};

const ICON_FOR: { match: string; icon: LucideIcon; tint: string }[] = [
  { match: "enrolled", icon: UserPlus, tint: "text-[#5B9DFF]" },
  { match: "completed", icon: GraduationCap, tint: "text-primary" },
  { match: "placed", icon: Briefcase, tint: "text-[#5FE08A]" },
  { match: "achieved", icon: Trophy, tint: "text-[#F5B14C]" },
];

function iconFor(action: string) {
  return ICON_FOR.find((i) => action.includes(i.match)) ?? ICON_FOR[1];
}

export function ActivityFeed({ items }: { items: FeedItem[] }) {
  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No recent activity yet.
      </p>
    );
  }
  return (
    <ul className="space-y-1">
      {items.map((it) => {
        const { icon: Icon, tint } = iconFor(it.action);
        return (
          <li
            key={it.id}
            className="flex flex-col gap-1 rounded-xl px-2 py-2.5 transition-colors hover:bg-raised sm:flex-row sm:items-center sm:gap-3"
          >
            <div className="relative">
              <Avatar className="h-9 w-9">
                <AvatarFallback>{initials(it.name)}</AvatarFallback>
              </Avatar>
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-card">
                <Icon className={`h-3 w-3 ${tint}`} />
              </span>
            </div>
            <p className="min-w-0 flex-1 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{it.name}</span>{" "}
              {it.action}{" "}
              <span className="font-medium text-foreground">{it.entity}</span>
            </p>
            <time className="shrink-0 text-xs text-muted-foreground">
              {formatDistanceToNow(parseISO(it.date), { addSuffix: true })}
            </time>
          </li>
        );
      })}
    </ul>
  );
}
