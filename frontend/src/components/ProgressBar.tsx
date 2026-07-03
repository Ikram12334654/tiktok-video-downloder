import type { DownloadStatus } from "@/types";

interface Props {
  status: DownloadStatus;
}

const fillColor: Record<DownloadStatus, string> = {
  idle:        "bg-white/10",
  pending:     "bg-white/20",
  downloading: "bg-blue-500 animate-pulse",
  done:        "bg-green-500",
  error:       "bg-red-500",
};

export default function ProgressBar({ status }: Props) {
  const isIndeterminate = status === "downloading" || status === "pending";
  const pct = status === "done" || status === "error" ? "100%" : isIndeterminate ? "60%" : "0%";

  return (
    <div className="bg-white/10 rounded-full overflow-hidden h-1">
      <div
        className={`h-full rounded-full transition-all duration-500 ${fillColor[status]}`}
        style={{ width: pct }}
      />
    </div>
  );
}
