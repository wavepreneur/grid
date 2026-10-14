import Image from "next/image";

export function GridLogo({
  height = 34,
  priority = false,
}: {
  height?: number;
  priority?: boolean;
}) {
  return (
    <Image
      src="/marketing/tells-logo.png"
      alt="Tells"
      width={742}
      height={295}
      className="grid-logo-wordmark"
      style={{ height, width: "auto" }}
      priority={priority}
    />
  );
}
