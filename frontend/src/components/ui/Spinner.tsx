interface Props {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = { sm: "w-4 h-4", md: "w-6 h-6", lg: "w-8 h-8" };

export default function Spinner({ size = "md", className = "" }: Props) {
  return (
    <span
      role="status"
      className={`inline-block border-2 border-current border-t-transparent rounded-full animate-spin text-gray-500 ${sizes[size]} ${className}`}
    />
  );
}
