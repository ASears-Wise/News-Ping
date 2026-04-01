import { Badge } from "@/components/ui/badge";
import { type Notification } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";

const CATEGORY_COLORS: Record<string, string> = {
  breaking: "bg-red-100 text-red-700 border-red-200",
  opinion: "bg-purple-100 text-purple-700 border-purple-200",
  briefing: "bg-blue-100 text-blue-700 border-blue-200",
  sports: "bg-green-100 text-green-700 border-green-200",
  politics: "bg-orange-100 text-orange-700 border-orange-200",
  general: "bg-gray-100 text-gray-600 border-gray-200",
};

type Props = {
  notification: Notification;
};

export function NotificationCard({ notification: n }: Props) {
  const categoryClass = CATEGORY_COLORS[n.category] ?? CATEGORY_COLORS.general;
  const timeAgo = formatDistanceToNow(new Date(n.received_at), { addSuffix: true });

  return (
    <div className="px-6 py-4 border-b hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {n.source_color && (
              <span
                className="inline-block w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: n.source_color }}
              />
            )}
            <span className="text-xs font-medium text-gray-500">{n.source_name}</span>
            <span className="text-xs text-gray-400">·</span>
            <span className="text-xs text-gray-400">{timeAgo}</span>
          </div>
          <p className="text-sm font-semibold text-gray-900 leading-snug">{n.title}</p>
          {n.body && <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">{n.body}</p>}
        </div>
        <Badge
          variant="outline"
          className={`text-xs shrink-0 capitalize ${categoryClass}`}
        >
          {n.category}
        </Badge>
      </div>
    </div>
  );
}
