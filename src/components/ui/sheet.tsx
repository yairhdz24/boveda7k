"use client";

import type { ComponentProps } from "react";
import { Dialog as SheetPrimitive } from "radix-ui";
import { cn } from "@/lib/cn";

/* Sheet (shadcn/ui sobre Radix Dialog): panel lateral en escritorio, hoja inferior en móvil. */
export const Sheet = SheetPrimitive.Root;
export const SheetClose = SheetPrimitive.Close;

export function SheetContent({ className, children, ...props }: ComponentProps<typeof SheetPrimitive.Content>) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className="fixed inset-0 z-80 bg-black/55 backdrop-blur-[2px] data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out" />
      <SheetPrimitive.Content
        className={cn(
          "fixed z-80 flex flex-col overflow-hidden bg-card text-foreground shadow-pop outline-none",
          "inset-x-0 bottom-0 h-[92dvh] rounded-t-3xl border-0 border-t border-solid border-border pb-[env(safe-area-inset-bottom)]",
          "desk:inset-x-auto desk:inset-y-0 desk:right-0 desk:h-dvh desk:w-[460px] desk:max-w-full desk:rounded-none desk:border-t-0 desk:border-l desk:pb-0",
          "data-[state=open]:animate-sheet-in data-[state=closed]:animate-sheet-out",
          className,
        )}
        {...props}
      >
        <div aria-hidden className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-border-strong/60 desk:hidden" />
        {children}
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}

export function SheetTitle({ className, ...props }: ComponentProps<typeof SheetPrimitive.Title>) {
  return <SheetPrimitive.Title className={cn("m-0 font-display text-[22px]/7 font-semibold tracking-tight wrap-anywhere", className)} {...props} />;
}

export function SheetDescription({ className, ...props }: ComponentProps<typeof SheetPrimitive.Description>) {
  return <SheetPrimitive.Description className={cn("m-0 text-muted-foreground", className)} {...props} />;
}
