"use client";

import { CheckCircle, Circle } from "lucide-react";

interface StatusLog {
  id: string;
  from_status: string | null;
  to_status: string;
  note: string;
  created_at: string;
}

interface StatusTimelineProps {
  logs: StatusLog[];
  currentStatus: string;
}

const STATUS_LABELS: Record<string, string> = {
  confirmed: "Booking Confirmed",
  visited: "Patient Visited",
  sample_collected: "Sample Collected",
  report_generated: "Report Generated",
  done: "Completed",
};

const STATUS_COLORS: Record<string, string> = {
  confirmed: "text-blue-600 bg-blue-100",
  visited: "text-yellow-600 bg-yellow-100",
  sample_collected: "text-orange-600 bg-orange-100",
  report_generated: "text-purple-600 bg-purple-100",
  done: "text-green-600 bg-green-100",
};

export default function StatusTimeline({
  logs,
  currentStatus,
}: StatusTimelineProps) {
  const allStatuses = [
    "confirmed",
    "visited",
    "sample_collected",
    "report_generated",
    "done",
  ];

  const currentIndex = allStatuses.indexOf(currentStatus);

  return (
    <div className="space-y-0">
      {allStatuses.map((status, idx) => {
        const isCompleted = idx <= currentIndex;
        const log = logs.find((l) => l.to_status === status);
        const colorClass =
          STATUS_COLORS[status] || "text-gray-500 bg-gray-100";

        return (
          <div key={status} className="flex gap-3">
            {/* Line + dot */}
            <div className="flex flex-col items-center">
              {isCompleted ? (
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${colorClass}`}
                >
                  <CheckCircle size={14} />
                </div>
              ) : (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100">
                  <Circle size={14} className="text-gray-300" />
                </div>
              )}
              {idx < allStatuses.length - 1 && (
                <div
                  className={`h-8 w-0.5 ${
                    idx < currentIndex ? "bg-primary/30" : "bg-gray-200"
                  }`}
                />
              )}
            </div>

            {/* Content */}
            <div className="-mt-0.5 pb-4">
              <p
                className={`text-sm font-semibold ${
                  isCompleted ? "text-gray-900" : "text-gray-400"
                }`}
              >
                {STATUS_LABELS[status]}
              </p>
              {log && (
                <p className="text-xs text-gray-400">
                  {new Date(log.created_at).toLocaleString("en-IN", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {log.note && ` — ${log.note}`}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
