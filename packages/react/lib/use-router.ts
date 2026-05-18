import { useContext } from "react";
import { RouterContext } from "./context";

export function useRouter() {
  const router = useContext(RouterContext);

  if (!router) {
    throw new Error("[useRouter] Router is not provided. Wrap the tree with RouterProvider.");
  }

  return router;
}
