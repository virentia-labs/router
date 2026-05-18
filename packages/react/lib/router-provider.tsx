import { useEffect, type ReactNode } from "react";
import { useUnit } from "@virentia/react";
import type { Router, RouterAdapter } from "@virentia/router";
import { RouterContext } from "./context";

interface RouterProviderProps {
  children?: ReactNode;
  router: Router;
  history?: RouterAdapter;
}

export function RouterProvider({ children, history, router }: RouterProviderProps): ReactNode {
  const setHistory = useUnit(router.setHistory);
  const dispose = useUnit(router.dispose);

  useEffect(() => {
    if (!history) {
      return;
    }

    void setHistory(history);

    return () => {
      void dispose();
    };
  }, [dispose, history, setHistory]);

  return <RouterContext.Provider value={router}>{children}</RouterContext.Provider>;
}
