import * as React from "react"

import { cn } from "~/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      data-slot="input"
      type={type}
      className={cn(
        "flex h-12 w-full min-w-0 rounded-xl border border-black/70 bg-white/90 px-4 py-3 text-base font-medium text-black shadow-xs outline-none transition-[color,box-shadow] placeholder:text-black/45 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 focus-visible:border-black focus-visible:ring-[3px] focus-visible:ring-white/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
