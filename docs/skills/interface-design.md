# Interface Design - Tailwind + Radix UI Best Practices

> **Nota:** Esta skill combina implementação técnica (Radix + Tailwind) com princípios de design do [interface-design](https://github.com/Dammyjay93/interface-design).
>
> Para qualquer agente de IA: siga os princípios abaixo para consistência sistemática.

---

## Princípios de Design (Interface Design System)

### O Problema
Quando você constrói UI, decisões são feitas: valores de spacing, cores, estratégia de depth. Sem estrutura, essas decisõesdrift ao longo das sessões.

**Interface Design ajuda você:**
1. **Craft** — Design baseado em princípios que produz interfaces profissionais
2. **Memory** — Salvar decisões em `.interface-design/system.md`, carrega automaticamente
3. **Consistency** — Cada componente segue os mesmos princípios durante toda sessão

### Design Directions

| Direction | Feel | Best For |
|-----------|------|----------|
| **Precision & Density** | Tight, technical, monochrome | Developer tools, admin dashboards |
| **Warmth & Approachability** | Generous spacing, soft shadows | Collaborative tools, consumer apps |
| **Sophistication & Trust** | Cool tones, layered depth | Finance, enterprise B2B |
| **Boldness & Clarity** | High contrast, dramatic space | Modern dashboards, data-heavy apps |
| **Utility & Function** | Muted, functional density | GitHub-style tools |
| **Data & Analysis** | Chart-optimized, numbers-first | Analytics, BI tools |

### Como Usar

**Primeira sessão:**
```
Você: "Build a user dashboard"

Agente:
- Depth: Borders-only (clean, technical)
- Surfaces: Subtle elevation shifts  
- Spacing: 8px base

Depth: borders-only
Surfaces: 7% → 9% → 11% lightness scale
Borders: rgba(255,255,255,0.06)
Spacing: 8px base

[Builds com consistência]

Quer salvar em .interface-design/system.md?
```

**Sessões subsequentes:**
```
✓ Carregado system.md
✓ Aplica padrões existentes
```

### System File (`.interface-design/system.md`)

```markdown
# Design System

## Direction
Personality: Precision & Density
Foundation: Cool (slate)
Depth: Borders-only

## Tokens
### Spacing
Base: 4px
Scale: 4, 8, 12, 16, 24, 32

### Colors
--foreground: slate-900
--secondary: slate-600
--accent: blue-600

## Patterns
### Button Primary
- Height: 36px
- Padding: 12px 16px
- Radius: 6px

### Card Default
- Border: 0.5px solid
- Padding: 16px
- Radius: 8px
```

### Regras para Agentes

1. **Estabeleça a direção antes de construir** — defina depth, surfaces, spacing
2. **Mantenha consistência** — reuse os padrões estabelecidos
3. **Documente novas decisões** — ofereça salvar ao final
4. **Evite hardcoding** — use tokens do system

---

## Referências
- [Interface Design (GitHub)](https://github.com/Dammyjay93/interface-design)
- [shadcn/ui + Tailwind v4](https://thecodeforge.io/javascript/build-design-system-shadcn-tailwind-radix/)
- [Design System com Radix](https://hanyrabah.com/blog/building-design-system-tailwind-radix)
- [Radix UI Primitives](https://www.radix-ui.com/primitives)
- [4 Dropdown Examples](https://cruip.com/4-examples-of-dropdown-menus-with-tailwind-css-and-radix-ui/)

## Arquitetura de Componentes

```
components/
├── ui/                    # Radix + Tailwind (base)
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Dialog.tsx
│   ├── DropdownMenu.tsx
│   ├── Select.tsx
│   ├── Tabs.tsx
│   ├── Badge.tsx
│   └── Card.tsx
├── layout/
│   ├── Sidebar.tsx
│   └── ClientDashboardLayout.tsx
└── providers/
    └── QueryProvider.tsx
```

## Tokens (Tailwind v4)

```css
/* app/globals.css */
@import "tailwindcss";

@theme {
  --color-background: hsl(0 0% 100%);
  --color-foreground: hsl(222.2 84% 4.9%);

  --color-primary: hsl(222.2 47.4% 11.2%);
  --color-primary-foreground: hsl(210 40% 98%);

  --color-secondary: hsl(210 40% 96.1%);
  --color-secondary-foreground: hsl(222.2 47.4% 11.2%);

  --color-muted: hsl(210 40% 96.1%);
  --color-muted-foreground: hsl(215.4 16.3% 46.9%);

  --color-accent: hsl(210 40% 96.1%);
  --color-accent-foreground: hsl(222.2 47.4% 11.2%);

  --color-destructive: hsl(0 62.8% 30.6%);
  --color-destructive-foreground: hsl(210 40% 98%);

  --color-border: hsl(214.3 31.8% 91.4%);
  --color-input: hsl(214.3 31.8% 91.4%);
  --color-ring: hsl(222.2 84% 4.9%);

  --radius: 0.5rem;

  --color-chart-1: hsl(221.2 83.2% 53.3%);
  --color-chart-2: hsl(190 90% 50%);
  --color-chart-3: hsl(280 65% 60%);
  --color-chart-4: hsl(340 75% 55%);
  --color-chart-5: hsl(280 65% 40%);
}
```

## shadcn/ui Style

### Button
```tsx
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
        outline: 'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
```

### Input
```tsx
const inputVariants = cn(
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'
);

export function Input({ className, type, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn(inputVariants, className)}
      {...props}
    />
  );
}
```

### Dialog (Modal)
```tsx
import * as Dialog from '@radix-ui/react-dialog';

export function Modal({ children, ...props }: Dialog.DialogProps) {
  return <Dialog.Root {...props}>{children}</Dialog.Root>;
}

export function ModalContent({ children, className, ...props }: Dialog.DialogContentProps) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out" />
      <Dialog.Content className={cn('fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out sm:rounded-lg', className)}>
        {children}
        <Dialog.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100" />
      </Dialog.Content>
    </Dialog.Portal>
  );
}
```

### Select
```tsx
import * as Select from '@radix-ui/react-select';

const selectTriggerVariants = cva(
  'flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1',
  {
    variants: {
      variant: {
        default: 'bg-transparent',
        filled: 'bg-muted',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export function SelectTrigger({ className, variant, children, ...props }: Select.SelectTriggerProps & { variant?: 'default' | 'filled' }) {
  return (
    <Select.Trigger className={cn(selectTriggerVariants({ variant }), className)} {...props}>
      {children}
      <Select.Icon asChild>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </Select.Icon>
    </Select.Trigger>
  );
}
```

### Badge
```tsx
const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80',
        secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive: 'border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80',
        outline: 'text-foreground',
        success: 'border-transparent bg-green-100 text-green-800',
        warning: 'border-transparent bg-yellow-100 text-yellow-800',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
```

### Card
```tsx
const cardVariants = cva(
  'rounded-lg border bg-card text-card-foreground shadow-sm',
  {
    variants: {
      variant: {
        default: 'shadow',
        flat: 'shadow-none border-0 bg-muted',
        glass: 'bg-white/80 backdrop-blur-sm shadow',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export function Card({ className, variant = 'default', ...props }: CardProps) {
  return <div className={cn(cardVariants({ variant }), className)} {...props} />;
}
```

## Radix Data Attributes

```tsx
// Use data attributes para estados (não classes próprias)
<DropdownMenu.Item
  className={cn(
    'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors',
    'focus:bg-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-50'
  )}
/>

// Estados disponíveis:
// data-[highlighted] - hover/focus
// data-[selected] - item selecionado
// data-[disabled] - desabilitado
// data-[state=open] - aberto
// data-[state=closed] - fechado
```

## Utility cn()

```typescript
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

## Patterns Comuns

### Loading States
```tsx
// Skeleton
<div className="animate-pulse rounded-md bg-muted h-4 w-full" />

// Spinner
<Spinner className="h-4 w-4 animate-spin" />

// Progress
<Progress value={33} className="h-2" />
```

### Empty States
```tsx
<div className="flex flex-col items-center justify-center py-12 text-center">
  <FileQuestion className="h-12 w-12 text-muted-foreground" />
  <h3 className="mt-4 text-lg font-semibold">Nenhum resultado</h3>
  <p className="mt-2 text-sm text-muted-foreground">Tente ajustar seus filtros</p>
</div>
```

### Table
```tsx
<div className="w-full overflow-auto">
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Name</TableHead>
        <TableHead>Status</TableHead>
        <TableHead className="text-right">Value</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {items.map((item) => (
        <TableRow key={item.id}>
          <TableCell>{item.name}</TableCell>
          <TableCell><Badge variant="success">{item.status}</Badge></TableCell>
          <TableCell className="text-right">{formatCurrency(item.value)}</TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</div>
```

## Responsive Patterns

```tsx
// Mobile-first
<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4" />

// Hide on mobile
<div className="hidden md:block" />

// Show on mobile only
<div className="md:hidden" />
```

## Referências Adicionais
- [Radix UI Customization](https://www.mintlify.com/radix-ui/primitives/concepts/customization)
- [TheCodeForge - shadcn/ui](https://thecodeforge.io/javascript/build-design-system-shadcn-tailwind-radix/)
- [Ruixen UI - Modern Design System](https://www.ruixen.com/blog/react-tailwind-design-system)