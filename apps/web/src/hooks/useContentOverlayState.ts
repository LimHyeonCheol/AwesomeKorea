import { startTransition, useEffect, useEffectEvent, useState } from "react";

const getContentSlugFromLocation = () =>
  new URLSearchParams(window.location.search).get("content");

const updateContentSlugInLocation = (contentSlug: string | null) => {
  const url = new URL(window.location.href);

  if (contentSlug) {
    url.searchParams.set("content", contentSlug);
  } else {
    url.searchParams.delete("content");
  }

  window.history.pushState({}, "", url);
};

export function useContentOverlayState() {
  const [activeContentSlug, setActiveContentSlug] = useState<string | null>(() =>
    getContentSlugFromLocation(),
  );

  const syncFromLocation = useEffectEvent(() => {
    setActiveContentSlug(getContentSlugFromLocation());
  });

  useEffect(() => {
    const listener = () => syncFromLocation();
    window.addEventListener("popstate", listener);

    return () => {
      window.removeEventListener("popstate", listener);
    };
  }, [syncFromLocation]);

  const openContent = (contentSlug: string) => {
    updateContentSlugInLocation(contentSlug);
    startTransition(() => {
      setActiveContentSlug(contentSlug);
    });
  };

  const closeContent = () => {
    updateContentSlugInLocation(null);
    startTransition(() => {
      setActiveContentSlug(null);
    });
  };

  return {
    activeContentSlug,
    closeContent,
    openContent,
  };
}
