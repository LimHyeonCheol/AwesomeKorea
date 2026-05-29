import { startTransition, useEffect, useEffectEvent, useState } from "react";

import type { SortOrder } from "@awesomekorea/shared";

interface HomeRoute {
  anchor: string | null;
  kind: "home";
  sort: SortOrder | null;
}

interface ContentRoute {
  contentSlug: string;
  kind: "content";
}

export type AppRoute = HomeRoute | ContentRoute;

const CONTENT_ROUTE_PATTERN = /^\/content\/([^/]+)$/;

const parseSort = (value: string | null): SortOrder | null => {
  if (value === "latest" || value === "popular") {
    return value;
  }

  return null;
};

const parseRouteFromLocation = (): AppRoute => {
  const url = new URL(window.location.href);
  const contentMatch = url.pathname.match(CONTENT_ROUTE_PATTERN);

  if (contentMatch?.[1]) {
    return {
      kind: "content",
      contentSlug: decodeURIComponent(contentMatch[1]),
    };
  }

  return {
    kind: "home",
    sort: parseSort(url.searchParams.get("sort")),
    anchor: url.hash ? decodeURIComponent(url.hash.slice(1)) : null,
  };
};

const scrollToAnchor = (anchor: string) => {
  window.requestAnimationFrame(() => {
    document.getElementById(anchor)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });
};

const updateLocation = (route: AppRoute) => {
  const url = new URL(window.location.href);

  if (route.kind === "content") {
    url.pathname = `/content/${encodeURIComponent(route.contentSlug)}`;
    url.search = "";
    url.hash = "";
  } else {
    url.pathname = "/";
    const searchParams = new URLSearchParams();

    if (route.sort) {
      searchParams.set("sort", route.sort);
    }

    url.search = searchParams.toString();
    url.hash = route.anchor ? `#${encodeURIComponent(route.anchor)}` : "";
  }

  window.history.pushState({}, "", url);
};

export function useAppRoute() {
  const [route, setRoute] = useState<AppRoute>(() => parseRouteFromLocation());

  const syncFromLocation = useEffectEvent(() => {
    setRoute(parseRouteFromLocation());
  });

  useEffect(() => {
    const listener = () => syncFromLocation();
    window.addEventListener("popstate", listener);

    return () => {
      window.removeEventListener("popstate", listener);
    };
  }, [syncFromLocation]);

  const openContent = (contentSlug: string) => {
    const nextRoute: ContentRoute = {
      kind: "content",
      contentSlug,
    };

    updateLocation(nextRoute);
    window.scrollTo({ top: 0, behavior: "auto" });

    startTransition(() => {
      setRoute(nextRoute);
    });
  };

  const openHome = (options: { anchor?: string | null; sort?: SortOrder | null } = {}) => {
    const nextRoute: HomeRoute = {
      kind: "home",
      sort: options.sort ?? null,
      anchor: options.anchor ?? null,
    };

    updateLocation(nextRoute);

    if (route.kind === "home") {
      if (nextRoute.anchor) {
        scrollToAnchor(nextRoute.anchor);
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } else {
      window.scrollTo({ top: 0, behavior: "auto" });
    }

    startTransition(() => {
      setRoute(nextRoute);
    });
  };

  return {
    route,
    openContent,
    openHome,
  };
}
