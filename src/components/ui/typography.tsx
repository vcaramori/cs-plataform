import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const textVariants = cva("", {
  variants: {
    variant: {
      /** Títulos de seção, métricas, valores principais */
      primary: "text-content-primary",
      /** Labels, captions, placeholders, texto de apoio */
      secondary: "text-content-secondary",
      /** Cor de destaque da marca (orange) */
      accent: "text-accent",
      /** Feedback de erro/alerta */
      destructive: "text-destructive",
    },
    size: {
      xs:   "text-xs",
      sm:   "text-sm",
      base: "text-base",
      lg:   "text-lg",
      xl:   "text-xl",
      "2xl": "text-2xl",
      "3xl": "text-3xl",
    },
    weight: {
      normal:    "font-normal",
      medium:    "font-medium",
      semibold:  "font-semibold",
      bold:      "font-bold",
      black:     "font-black",
    },
  },
  defaultVariants: {
    variant: "primary",
    size: "base",
    weight: "normal",
  },
})

type As = "p" | "span" | "div" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "label"

interface TextProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof textVariants> {
  as?: As
}

/**
 * Primitivo de texto semântico. Use `variant` em vez de classes `text-gray-*`
 * para garantir que o tema Light/Dark seja respeitado automaticamente.
 *
 * @example
 * <Text variant="secondary" size="sm">Última atualização: hoje</Text>
 * <Text as="h2" variant="primary" size="2xl" weight="bold">Receita ARR</Text>
 */
const Text = React.forwardRef<HTMLElement, TextProps>(
  ({ as: Tag = "p", className, variant, size, weight, ...props }, ref) => (
    <Tag
      ref={ref as React.Ref<HTMLParagraphElement>}
      className={cn(textVariants({ variant, size, weight }), className)}
      {...props}
    />
  )
)
Text.displayName = "Text"

export { Text, textVariants }
export type { TextProps }
