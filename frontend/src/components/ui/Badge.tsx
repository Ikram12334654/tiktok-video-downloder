import type { DownloadStatus } from "@/types";

interface Props {
  status: DownloadStatus;
}

const config: Record<DownloadStatus, { label: string; className: string }> = {
  idle:        { label: "Idle",        className: "bg-white/10 text-gray-500" },
  pending:     { label: "Queued",      className: "bg-white/10 text-gray-400" },
  downloading: { label: "Downloading", className: "bg-blue-500/15 text-blue-400" },
  done:        { label: "Saved",       className: "bg-green-500/15 text-green-400" },
  error:       { label: "Error",       className: "bg-red-500/15 text-red-400" },
};

export default function Badge({ status }: Props) {
  const { label, className } = config[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
