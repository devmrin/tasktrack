import { useEffect, useRef, useState } from "react";
import type { JiraAttachment } from "@/db/database";
import { downloadJiraAttachment } from "@/modules/tickets";

const LIGHTBOX_MAX_BYTES = 12 * 1024 * 1024;

interface LightboxEntry {
  readonly url?: string;
  readonly error?: boolean;
}

export interface AttachmentLightboxSource {
  readonly src?: string;
  readonly loading: boolean;
  readonly failed: boolean;
}

export function useAttachmentLightboxSource(
  attachment: JiraAttachment | undefined,
): AttachmentLightboxSource {
  const [entries, setEntries] = useState<Readonly<Record<string, LightboxEntry>>>({});
  const urlsRef = useRef<string[]>([]);
  const settledRef = useRef(new Set<string>());
  const id = attachment?.id;
  const tooLarge = (attachment?.size ?? 0) > LIGHTBOX_MAX_BYTES;

  useEffect(() => {
    const urls = urlsRef;
    return () => {
      for (const url of urls.current) {
        URL.revokeObjectURL(url);
      }
      urls.current = [];
    };
  }, []);

  useEffect(() => {
    if (!id || tooLarge || settledRef.current.has(id)) {
      return;
    }
    let cancelled = false;
    downloadJiraAttachment(id)
      .then((blob) => {
        if (cancelled || settledRef.current.has(id)) {
          return;
        }
        settledRef.current.add(id);
        const url = URL.createObjectURL(blob);
        urlsRef.current.push(url);
        setEntries((current) => ({ ...current, [id]: { url } }));
      })
      .catch(() => {
        if (cancelled || settledRef.current.has(id)) {
          return;
        }
        settledRef.current.add(id);
        setEntries((current) => ({ ...current, [id]: { error: true } }));
      });
    return () => {
      cancelled = true;
    };
  }, [id, tooLarge]);

  const preview = attachment?.previewDataUrl;
  const entry = id ? entries[id] : undefined;
  const src = entry?.url ?? preview;
  const failed = !src && (Boolean(entry?.error) || tooLarge);
  return {
    src,
    loading: Boolean(id) && !src && !failed,
    failed,
  };
}
