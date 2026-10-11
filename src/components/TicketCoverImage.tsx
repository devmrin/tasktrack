interface TicketCoverImageProps {
  readonly src: string;
  readonly alt: string;
  readonly className?: string;
}

export function TicketCoverImage({
  src,
  alt,
  className = '',
}: TicketCoverImageProps) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <img
        src={src}
        alt={alt}
        draggable={false}
        className="size-full object-cover bg-neutral-100 dark:bg-neutral-900"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-transparent dark:from-neutral-800"
      />
    </div>
  );
}
