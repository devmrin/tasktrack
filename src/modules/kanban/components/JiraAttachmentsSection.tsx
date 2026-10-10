import {
  Download,
  File,
  FileArchive,
  FileImage,
  FileText,
  FileVideo,
} from "lucide-react";
import { useCallback, useState } from "react";
import type { JiraAttachment } from "@/db/database";
import { AttachmentLightbox } from "@/modules/kanban/components/AttachmentLightbox";
import {
  downloadJiraAttachment,
  formatAttachmentSize,
  isJiraImageAttachment,
} from "@/modules/tickets";
import { formatRelativeTimeAgo } from "@/utils/formatRelativeTimeAgo";

interface JiraAttachmentsSectionProps {
  readonly attachments: readonly JiraAttachment[];
}

export function JiraAttachmentsSection({ attachments }: JiraAttachmentsSectionProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const images = attachments.filter((attachment) =>
    isJiraImageAttachment(attachment.mimeType, attachment.filename),
  );
  const files = attachments.filter(
    (attachment) => !isJiraImageAttachment(attachment.mimeType, attachment.filename),
  );
  const activeImage =
    lightboxIndex === null ? undefined : images[Math.min(lightboxIndex, images.length - 1)];

  const downloadAttachment = async (attachment: JiraAttachment) => {
    setError(null);
    setDownloadingId(attachment.id);
    try {
      const blob = await downloadJiraAttachment(attachment.id);
      saveBlob(blob, attachment.filename);
    } catch {
      setError(`Could not download ${attachment.filename}`);
    } finally {
      setDownloadingId(null);
    }
  };

  const openImage = (attachment: JiraAttachment) => {
    const index = images.findIndex((item) => item.id === attachment.id);
    if (index < 0) {
      return;
    }
    setError(null);
    setLightboxIndex(index);
  };

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
    setError(null);
  }, []);

  const stepLightbox = useCallback((direction: -1 | 1) => {
    setError(null);
    setLightboxIndex((current) => {
      if (current === null || images.length < 2) {
        return current;
      }
      const base = Math.min(current, images.length - 1);
      return (base + direction + images.length) % images.length;
    });
  }, [images.length]);

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Attachments
        </span>
        <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs tabular-nums text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
          {attachments.length}
        </span>
      </div>
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {images.map((attachment) => (
            <ImageTile
              key={attachment.id}
              attachment={attachment}
              busy={downloadingId === attachment.id}
              onOpen={() => openImage(attachment)}
            />
          ))}
        </div>
      )}
      {files.length > 0 && (
        <ul className={`space-y-1.5 ${images.length > 0 ? "mt-2" : ""}`}>
          {files.map((attachment) => (
            <li key={attachment.id}>
              <FileRow
                attachment={attachment}
                busy={downloadingId === attachment.id}
                onDownload={() => void downloadAttachment(attachment)}
              />
            </li>
          ))}
        </ul>
      )}
      {error && lightboxIndex === null && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
      {activeImage && lightboxIndex !== null && (
        <AttachmentLightbox
          images={images}
          index={Math.min(lightboxIndex, images.length - 1)}
          downloading={downloadingId === activeImage.id}
          error={error}
          onStep={stepLightbox}
          onClose={closeLightbox}
          onDownload={() => void downloadAttachment(activeImage)}
        />
      )}
    </div>
  );
}

function ImageTile({
  attachment,
  busy,
  onOpen,
}: {
  readonly attachment: JiraAttachment;
  readonly busy: boolean;
  readonly onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={busy}
      title={`${attachment.filename} · ${formatAttachmentSize(attachment.size)}`}
      aria-label={`Open ${attachment.filename}`}
      className="cursor-zoom-in overflow-hidden rounded-md border border-neutral-200 bg-neutral-50 text-left hover:border-neutral-300 disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-neutral-500"
    >
      <span className="block aspect-[4/3] bg-neutral-100 dark:bg-neutral-900">
        {attachment.previewDataUrl ? (
          <img
            src={attachment.previewDataUrl}
            alt=""
            draggable={false}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full items-center justify-center text-neutral-400">
            <FileImage className="size-5" aria-hidden />
          </span>
        )}
      </span>
      <span className="block truncate px-1.5 py-1 text-[11px] text-neutral-600 dark:text-neutral-300">
        {attachment.filename}
      </span>
    </button>
  );
}

function FileRow({
  attachment,
  busy,
  onDownload,
}: {
  readonly attachment: JiraAttachment;
  readonly busy: boolean;
  readonly onDownload: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onDownload}
      disabled={busy}
      aria-label={`Download ${attachment.filename}`}
      className="flex w-full items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-2 text-left hover:bg-neutral-100 disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-800/50 dark:hover:bg-neutral-800"
    >
      <AttachmentFileIcon mimeType={attachment.mimeType} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-neutral-800 dark:text-neutral-100">
          {attachment.filename}
        </span>
        <span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">
          {attachmentDetails(attachment)}
        </span>
      </span>
      <Download className="size-3.5 shrink-0 text-neutral-400" aria-hidden />
    </button>
  );
}

function AttachmentFileIcon({ mimeType }: { readonly mimeType: string }) {
  const className = "size-4 shrink-0 text-neutral-500 dark:text-neutral-400";
  const type = mimeType.toLowerCase();
  if (type.startsWith("image/")) {
    return <FileImage className={className} aria-hidden />;
  }
  if (type.startsWith("video/")) {
    return <FileVideo className={className} aria-hidden />;
  }
  if (type.includes("zip") || type.includes("compressed") || type.includes("tar")) {
    return <FileArchive className={className} aria-hidden />;
  }
  if (
    type.startsWith("text/")
    || type.includes("pdf")
    || type.includes("json")
    || type.includes("word")
  ) {
    return <FileText className={className} aria-hidden />;
  }
  return <File className={className} aria-hidden />;
}

function attachmentDetails(attachment: JiraAttachment): string {
  const parts = [formatAttachmentSize(attachment.size)];
  if (attachment.authorName) {
    parts.push(attachment.authorName);
  }
  const created = attachmentTimestamp(attachment.createdAt);
  if (created) {
    parts.push(created);
  }
  return parts.join(" · ");
}

function attachmentTimestamp(createdAt?: string): string | undefined {
  if (!createdAt) {
    return undefined;
  }
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  return formatRelativeTimeAgo(createdAt);
}

function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Keep the object URL alive until the browser starts the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
