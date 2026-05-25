"use client";

import { cn } from "@/lib/utils";
import {
  Arrow,
  Content,
  Portal,
  Provider,
  Root,
  Trigger,
} from "@radix-ui/react-tooltip";
import {
  type ComponentPropsWithoutRef,
  type ComponentRef,
  type PropsWithChildren,
  type ReactNode,
  forwardRef,
} from "react";

export const TooltipProvider = Provider;
export const TooltipRoot = Root;
export const TooltipTrigger = Trigger;

export const TooltipContent = forwardRef<
  ComponentRef<typeof Content>,
  ComponentPropsWithoutRef<typeof Content>
>(({ className, sideOffset = 4, children, ...props }, ref) => (
  <Portal>
    <Content
      className={cn(
        "fade-in-0 zoom-in-95 data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 z-50 animate-in overflow-hidden rounded-md bg-black px-3 py-1.5 text-primary-foreground text-xs data-[state=closed]:animate-out",
        className,
      )}
      ref={ref}
      sideOffset={sideOffset}
      {...props}
    >
      {children}
      <Arrow className="fill-black" />
    </Content>
  </Portal>
));
TooltipContent.displayName = Content.displayName;

type TooltipProps = PropsWithChildren<{
  content: ReactNode;
  className?: string;
  side?: "top" | "right" | "bottom" | "left";
  align?: "center" | "start" | "end";
  hidden?: boolean;
}>;

export function Tooltip({
  content,
  children,
  className,
  side = "bottom",
  align = "center",
  hidden,
}: TooltipProps) {
  return (
    <Root>
      <Trigger aria-describedby={undefined} asChild>
        <div className="w-full">{children}</div>
      </Trigger>
      <TooltipContent
        align={align}
        className={className}
        hidden={hidden}
        side={side}
      >
        <p className="md:max-w-[50vw]">{content}</p>
      </TooltipContent>
    </Root>
  );
}
