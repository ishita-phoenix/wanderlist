"use client"

import type { ReactElement, ReactNode } from "react"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"

type ListPaperContextMenuProps = {
  /** Shown in the paper header and for context */
  menuLabel: string
  showTitle?: boolean
  /** Single element that receives the right-click (e.g. magnet wrapper or title block) */
  trigger: ReactElement
  children: ReactNode
}

/** Ruled “notebook paper” menu — opens on right-click via Radix ContextMenu */
export function ListPaperContextMenu({
  menuLabel,
  showTitle = true,
  trigger,
  children,
}: ListPaperContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{trigger}</ContextMenuTrigger>
      <ContextMenuContent className="min-w-[12rem] border-0 bg-transparent p-0 shadow-none">
        <div className="overflow-hidden rounded-lg border-2 border-amber-200/90 bg-[#fffdf6] shadow-md ring-1 ring-amber-900/8">
          {showTitle ? (
            <div className="relative border-b border-amber-200/70 bg-gradient-to-r from-amber-100/90 via-[#fff8e8] to-amber-50/90 px-3 py-2">
              <div className="absolute left-0 top-0 h-full w-1.5 bg-rose-300/90" aria-hidden />
              <p className="pl-2 font-[family-name:var(--font-handwritten)] text-sm leading-tight text-amber-950/90">
                <span className="text-amber-700/80">✎</span> {menuLabel}
              </p>
            </div>
          ) : null}
          <div
            className="px-0.5 py-1"
            style={{
              backgroundImage:
                "repeating-linear-gradient(transparent 0px, transparent 26px, rgba(251, 191, 36, 0.2) 26px, rgba(251, 191, 36, 0.2) 27px)",
            }}
          >
            {children}
          </div>
        </div>
      </ContextMenuContent>
    </ContextMenu>
  )
}

export function ListPaperMenuSeparator() {
  return <ContextMenuSeparator className="my-0.5 bg-amber-200/60" />
}
