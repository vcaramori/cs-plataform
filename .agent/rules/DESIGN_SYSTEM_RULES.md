# Executive Premium 2026 — Design System Rules

> **Status**: Mandatory for all AI-generated UI code.

## 1. Core Typography
All text must follow the semantic hierarchy defined in `globals.css`.

| Intent | Class | Rule |
| :--- | :--- | :--- |
| **Page Title** | `.h1-page` | Exactly one per page. |
| **Section Header** | `.h2-section` | Used for card titles or major dividers. |
| **Field Labels** | `.label-premium` | Mandatory for ALL form labels and metadata indicators. |
| **Bold Emphasis** | `font-black` | Use for critical numbers or status labels. |

### Semantic Class Definitions:
- `.h1-page`: `text-3xl font-black uppercase tracking-tighter font-heading text-foreground`
- `.h2-section`: `text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 font-sans`
- `.label-premium`: `text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 font-sans`

## 2. Colors & Contrast
- **No Hardcoded Slates**: Avoid `text-slate-400`, `bg-zinc-900`.
- **Use Tokens**: Use `text-muted-foreground`, `bg-accent/30`, `border-border`.
- **Primary Accent**: Use `text-primary` (Plannera Orange) for highlights.

## 3. Layout Patterns
- **Glassmorphism**: Use `variant="glass"` for cards and dialogs to provide depth.
- **Rounding**: Use `rounded-2xl` or `rounded-3xl` for a soft, premium feel.
- **Spacing**: Use `space-y-4` or `space-y-6` for consistent vertical rhythm.

## 4. Components
- **Buttons**: Prefer `variant="premium"` for main CTAs.
- **Cards**: Cards should have suttle shadows and `border-border`.

## 5. Enforcement
Any code block generating JSX MUST:
1. Verify if `Label` or `CardTitle` are using the semantic classes.
2. Ensure `uppercase tracking-widest` is applied to all labels.
3. Check for Light/Dark mode compatibility via semantic tokens.
