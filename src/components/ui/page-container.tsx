"use client"

import * as React from "react"
import { motion, type HTMLMotionProps } from "framer-motion"
import { cn } from "@/lib/utils"

interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Remove o padding padrão (útil para views full-bleed) */
  noPadding?: boolean
  /** Anima entrada da página com fade+slide (padrão: true) */
  animate?: boolean
}

/**
 * Wrapper raiz de cada view. Garante `bg-surface-background` e padding
 * consistente em toda a aplicação — nunca use bg-slate-* diretamente em pages.
 */
const PageContainer = React.forwardRef<HTMLDivElement, PageContainerProps>(
  ({ className, noPadding = false, animate = true, children, ...props }, ref) => {
    const baseClass = cn(
      "w-full bg-surface-background bg-honeycomb text-content-primary",
      !noPadding && "container mx-auto px-4 py-6 md:px-8 space-y-6",
      className
    )

    if (!animate) {
      return (
        <div ref={ref} className={baseClass} {...props}>
          {children}
        </div>
      )
    }

    return (
      <motion.div
        ref={ref}
        className={baseClass}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        {...(props as HTMLMotionProps<"div">)}
      >
        {children}
      </motion.div>
    )
  }
)
PageContainer.displayName = "PageContainer"

export { PageContainer }
