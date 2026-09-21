import { useEffect, useState } from 'react';
import { cn } from '../../lib/utils';
import { readEvidenceMedia } from '../../lib/evidenceMedia';

export function EvidenceImage({ fallbackSrc, mediaKey, variant = 'original', alt, className }: {
  fallbackSrc: string;
  mediaKey?: string;
  variant?: 'original' | 'stamped';
  alt: string;
  className?: string;
}) {
  const token = `${mediaKey ?? ''}:${variant}`;
  const [resolved, setResolved] = useState<{ token: string; url: string } | null>(null);
  const source = resolved?.token === token ? resolved.url : fallbackSrc;

  useEffect(() => {
    if (!mediaKey) return;
    let active = true;
    let objectUrl = '';
    readEvidenceMedia(mediaKey, variant).then(blob => {
      if (!active) return;
      objectUrl = URL.createObjectURL(blob);
      setResolved({ token, url: objectUrl });
    }).catch(() => undefined);
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [mediaKey, token, variant]);

  return <img alt={alt} src={source} className={cn(className)} />;
}
