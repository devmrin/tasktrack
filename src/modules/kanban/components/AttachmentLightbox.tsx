import { ChevronLeft, ChevronRight, Download, FileImage, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { JiraAttachment } from "@/db/database";
import {
  useAttachmentLightboxSource,
  type AttachmentLightboxSource,
} from "@/modules/kanban/hooks/useAttachmentLightboxSource";
import { formatAttachmentSize } from "@/modules/tickets";

interface AttachmentLightboxProps {
  readonly images: readonly JiraAttachment[];
  readonly index: number;
  readonly downloading: boolean;
  readonly error: string | null;
  readonly onStep: (direction: -1 | 1) => void;
  readonly onClose: () => void;
  readonly onDownload: () => void;
}

export function AttachmentLightbox({
  images,
  index,
  downloading,
  error,
  onStep,
  onClose,
  onDownload,
}: AttachmentLightboxProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const attachment = images[index];
  const source = useAttachmentLightboxSource(attachment);
  const canCycle = images.length > 1;

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      onStep(event.key === "ArrowLeft" ? -1 : 1);
    };
    globalThis.addEventListener("keydown", onKeyDown, true);
    return () => globalThis.removeEventListener("keydown", onKeyDown, true);
  }, [onClose, onStep]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  if (!attachment) {
    return null;
  }

  const position = canCycle ? `${index + 1} of ${images.length}` : attachment.filename;

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={attachment.filename}
      tabIndex={-1}
      className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm focus:outline-none"
    >
      <p className="sr-only" aria-live="polite">
        {canCycle
          ? `${position}. ${attachment.filename}. Use the left and right arrow keys to cycle through images.`
          : attachment.filename}
      </p>
      <LightboxToolbar
        downloading={downloading}
        onClose={onClose}
        onDownload={onDownload}
      />
      <div
        className="absolute inset-x-0 top-16 bottom-20 flex items-center justify-center px-16"
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            onClose();
          }
        }}
      >
        {canCycle && (
          <LightboxStepButton direction="previous" onClick={() => onStep(-1)} />
        )}
        <LightboxStage attachment={attachment} source={source} />
        {canCycle && <LightboxStepButton direction="next" onClick={() => onStep(1)} />}
      </div>
      <LightboxCaption
        attachment={attachment}
        position={canCycle ? `${index + 1} / ${images.length}` : undefined}
        error={error}
      />
    </div>,
    document.body,
  );
}

function LightboxToolbar({
  downloading,
  onClose,
  onDownload,
}: {
  readonly downloading: boolean;
  readonly onClose: () => void;
  readonly onDownload: () => void;
}) {
  return (
    <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-end gap-1 px-3 py-3 sm:px-4">
      <button
        type="button"
        onClick={onDownload}
        disabled={downloading}
        className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-xs font-medium text-white hover:bg-white/20 disabled:opacity-60"
      >
        {downloading ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
        ) : (
          <Download className="size-3.5" aria-hidden />
        )}
        Download
      </button>
      <button
        type="button"
        onClick={onClose}
        className="rounded-full p-2 text-white hover:bg-white/15"
        aria-label="Close preview"
      >
        <X className="size-5" aria-hidden />
      </button>
    </div>
  );
}

function LightboxStepButton({
  direction,
  onClick,
}: {
  readonly direction: "previous" | "next";
  readonly onClick: () => void;
}) {
  const Icon = direction === "previous" ? ChevronLeft : ChevronRight;
  const position = direction === "previous" ? "left-3 sm:left-5" : "right-3 sm:right-5";
  const label = direction === "previous" ? "Previous image" : "Next image";
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`absolute top-1/2 ${position} z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-neutral-950/75 text-white shadow-lg ring-1 ring-white/25 hover:bg-neutral-950`}
    >
      <Icon className="size-6" aria-hidden />
    </button>
  );
}

function LightboxStage({
  attachment,
  source,
}: {
  readonly attachment: JiraAttachment;
  readonly source: AttachmentLightboxSource;
}) {
  const [rejected, setRejected] = useState<{ id: string; src: string } | null>(null);
  const rejectedSrc = rejected?.id === attachment.id ? rejected.src : null;
  const preview = attachment.previewDataUrl;
  const fullFailed = Boolean(source.src && source.src !== preview && rejectedSrc === source.src);
  const displaySrc = fullFailed ? preview : source.src;
  if (source.loading) {
    return <LightboxStatus title="Loading image" spinning />;
  }
  if (source.failed || !displaySrc || rejectedSrc === displaySrc) {
    return <LightboxStatus title={`Could not load ${attachment.filename}`} />;
  }
  return (
    <img
      key={displaySrc}
      src={displaySrc}
      alt={attachment.filename}
      draggable={false}
      onError={() => setRejected({ id: attachment.id, src: displaySrc })}
      className="max-h-full max-w-full rounded-md object-contain shadow-2xl"
    />
  );
}

function LightboxStatus({
  title,
  spinning = false,
}: {
  readonly title: string;
  readonly spinning?: boolean;
}) {
  return (
    <div className="flex max-w-sm flex-col items-center gap-3 px-6 text-center text-white/80">
      {spinning ? (
        <Loader2 className="size-6 animate-spin" aria-hidden />
      ) : (
        <FileImage className="size-8" aria-hidden />
      )}
      <p className="text-sm">{title}</p>
    </div>
  );
}

function LightboxCaption({
  attachment,
  position,
  error,
}: {
  readonly attachment: JiraAttachment;
  readonly position?: string;
  readonly error: string | null;
}) {
  const details = [formatAttachmentSize(attachment.size), position].filter(Boolean).join(" · ");
  return (
    <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-1 px-6 pb-4 pt-2 text-center">
      <p className="max-w-full truncate text-sm text-white">{attachment.filename}</p>
      <p className="text-xs text-white/70">{details}</p>
      {error && <p className="max-w-full truncate text-xs text-red-300">{error}</p>}
    </div>
  );
}
