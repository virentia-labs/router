import { useMemo } from "react";
import { useUnit } from "@virentia/react";
import type { Query, Route } from "@virentia/router";
import { useRouter } from "./use-router";

export function useLink<T extends object | void = void>(
  to: Route<T>,
  params?: T,
  query?: Query,
) {
  const router = useRouter();
  const open = useUnit(to.open);
  const target = router.knownRoutes.find(({ route }) => route === to);

  if (!target) {
    throw new Error("[useLink] Route not found. Pass it to router first.");
  }

  const path = useMemo(() => {
    const pathname = target.build(params ?? undefined);
    const search = stringifyQuery(query);

    return `${pathname}${search}`;
  }, [params, query, target]);

  return {
    path,
    open
  };
}

function stringifyQuery(query: Query | undefined): string {
  if (!query) {
    return "";
  }

  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item != null) {
          params.append(key, item);
        }
      }

      continue;
    }

    if (value != null) {
      params.set(key, value);
    }
  }

  const search = params.toString();

  return search ? `?${search}` : "";
}
