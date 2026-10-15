import Image from "next/image";

export function GridLogo({
  height = 34,
  priority = false,
  className,
}: {
  height?: number;
  priority?: boolean;
  className?: string;
}) {
  return (
    <Image
      src="/marketing/tells-logo.png"
      alt="Tells"
      width={742}
      height={295}
      className={className ? `grid-logo-wordmark ${className}` : "grid-logo-wordmark"}
      style={{ height, width: "auto" }}
      priority={priority}
    />
  );
}
