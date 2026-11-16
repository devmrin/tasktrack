import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, X } from 'lucide-react';
import { sanitizeHtml } from '@/utils/sanitizeHtml';

interface SanitizedHtmlProps {
  readonly html: string;
  readonly className?: string;
  readonly as?: 'div' | 'span' | 'p';
}

/**
 * Renders sanitized HTML. For plain text (no HTML tags), preserves newlines.
 */
export function SanitizedHtml({ html, className, as: Tag = 'div' }: SanitizedHtmlProps) {
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt: string } | null>(null);
  const isHtml = html.includes('<');
  const sanitized = isHtml ? sanitizeHtml(html) : sanitizeHtml(html.replaceAll('\n', '<br>'));
  return (
    <>
      <Tag
        className={className}
        dangerouslySetInnerHTML={{ __html: sanitized }}
        onClick={(event: React.MouseEvent<HTMLElement>) => {
          const target = event.target;
          if (!(target instanceof HTMLImageElement)) return;
          const src = target.currentSrc || target.src;
          if (src) setLightboxImage({ src, alt: target.alt });
        }}
      />
      {lightboxImage && createPortal(
        <DescriptionImageLightbox
          image={lightboxImage}
          onClose={() => setLightboxImage(null)}
        />,
        document.body,
      )}
    </>
  );
}

function DescriptionImageLightbox({
  image,
  onClose,
}: {
  readonly image: { src: string; alt: string };
  readonly onClose: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={image.alt || 'Image preview'}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-12"
      onClick={onClose}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose();
      }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close image preview"
        className="absolute right-4 top-4 rounded-full p-2 text-white hover:bg-white/15"
      >
        <X className="size-5" aria-hidden />
      </button>
      {!loaded && !failed && (
        <Loader2
          className="absolute size-6 animate-spin text-white"
          aria-label="Loading image"
        />
      )}
      {failed ? (
        <p className="text-sm text-white/80">Could not load image</p>
      ) : (
        <img
          src={image.src}
          alt={image.alt}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          onClick={(event) => event.stopPropagation()}
          className={`max-h-full max-w-full rounded-md object-contain shadow-2xl ${loaded ? '' : 'opacity-0'}`}
        />
      )}
    </div>
  );
}
