import { forwardRef, type ForwardedRef, type MouseEvent, type ReactNode } from "react";
import type { RouteOpenedPayload } from "@virentia/router";
import type { LinkProps } from "./types";
import { useLink } from "./use-link";

type ForwardedLink = <Params extends object | void = void>(
  props: LinkProps<Params> & { ref?: ForwardedRef<HTMLAnchorElement> },
) => ReactNode;

export const Link: ForwardedLink = forwardRef<HTMLAnchorElement, LinkProps<any>>(
  (props, ref) => {
    const { onClick, params, query, replace, target, to, ...anchorProps } = props;
    const link = useLink(to, params, query);

    return (
      <a
        {...anchorProps}
        ref={ref}
        href={link.path}
        target={target}
        onClick={(event) => {
          onClick?.(event);

          if (shouldIgnoreClick(event, target)) {
            return;
          }

          event.preventDefault();

          void link.open({
            ...(params === undefined ? {} : { params }),
            query,
            replace
          } as RouteOpenedPayload<any>);
        }}
      />
    );
  },
) as ForwardedLink;

function shouldIgnoreClick(event: MouseEvent<HTMLAnchorElement>, target: string | undefined) {
  return (
    event.defaultPrevented ||
    (target !== undefined && target !== "_self") ||
    event.metaKey ||
    event.altKey ||
    event.ctrlKey ||
    event.shiftKey
  );
}
