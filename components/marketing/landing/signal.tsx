/** The spark from the Tells logo. Only placed where Tells has found something. */
export function Signal({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className ? `tl-signal ${className}` : "tl-signal"}
      aria-hidden
    >
      <path d="M6.6 2.2h4.9c.5 0 .8.5.6 1L9.6 11.4c-.2.6-1.1.6-1.3 0L6 3.1c-.1-.5.2-.9.6-.9Z" />
      <path d="M16.3 9.3c.3-.3.8-.2 1 .2l1.6 3c.2.4 0 .9-.5 1l-3.9.6c-.6.1-1-.6-.6-1.1l2.4-3.7Z" />
      <circle cx="5.2" cy="15.6" r="2.3" />
      <path d="M11.4 18.1c.2-.4.7-.5 1.1-.3l3.4 2c.4.2.5.7.3 1.1-.2.4-.7.5-1.1.3l-3.4-2c-.4-.3-.5-.8-.3-1.1Z" />
    </svg>
  );
}
