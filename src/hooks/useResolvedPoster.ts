import { useEffect, useState } from "react";
import { isDirectPosterUrl, resolvePoster } from "../utils/mediaPoster";

export function useResolvedPoster(
  customPoster?: string | null,
  filePath?: string | null,
  enabled = true,
) {
  const [src, setSrc] = useState<string | null>(() =>
    isDirectPosterUrl(customPoster),
  );

  useEffect(() => {
    if (!enabled) return;

    if (!customPoster?.trim() && !filePath) {
      setSrc(null);
      return;
    }

    let isMounted = true;
    resolvePoster(customPoster, filePath).then((resolved) => {
      if (isMounted) setSrc(resolved);
    });

    return () => {
      isMounted = false;
    };
  }, [customPoster, filePath, enabled]);

  return [src, setSrc] as const;
}
