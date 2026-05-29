import type { Condition, CompareOp, RunContext } from './types'

/** Resolve um caminho "a.b.c" dentro de um objeto. */
function getPath(obj: any, path: string): any {
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key.trim()]), obj)
}

/**
 * Substitui {{caminho}} pelo valor do contexto. Se o template for exatamente
 * "{{x}}", retorna o valor cru (preserva tipo); senão interpola como string.
 */
export function renderTemplate(input: unknown, ctx: RunContext): any {
  if (typeof input !== 'string') return input
  const exact = input.match(/^\{\{\s*([^}]+?)\s*\}\}$/)
  if (exact) {
    const v = getPath(ctx, exact[1])
    return v === undefined ? '' : v
  }
  return input.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, p) => {
    const v = getPath(ctx, String(p))
    return v == null ? '' : String(v)
  })
}

function coerce(v: any): any {
  if (typeof v !== 'string') return v
  const n = Number(v)
  if (v.trim() !== '' && !Number.isNaN(n)) return n
  if (v === 'true') return true
  if (v === 'false') return false
  return v
}

function compare(left: any, op: CompareOp, right: any): boolean {
  const l = coerce(left)
  const r = coerce(right)
  switch (op) {
    case '==': return l == r // eslint-disable-line eqeqeq
    case '!=': return l != r // eslint-disable-line eqeqeq
    case '>': return l > r
    case '>=': return l >= r
    case '<': return l < r
    case '<=': return l <= r
    case 'contains': return String(left ?? '').toLowerCase().includes(String(right ?? '').toLowerCase())
    case 'in': return Array.isArray(right) ? right.includes(left) : String(right ?? '').split(',').map(s => s.trim()).includes(String(left))
    case 'is_empty': return left == null || left === '' || (Array.isArray(left) && left.length === 0)
    case 'not_empty': return !(left == null || left === '' || (Array.isArray(left) && left.length === 0))
    default: return false
  }
}

/** Avalia uma condição única resolvendo left/right pelo contexto. */
export function evalCondition(cond: Condition, ctx: RunContext): boolean {
  const left = renderTemplate(cond.left, ctx)
  const right = cond.op === 'is_empty' || cond.op === 'not_empty' ? undefined : renderTemplate(cond.right, ctx)
  return compare(left, cond.op, right)
}

/** Avalia um conjunto de condições com match 'all' (AND) ou 'any' (OR). */
export function evalConditions(conditions: Condition[] | undefined, match: 'all' | 'any' = 'all', ctx: RunContext): boolean {
  const list = conditions ?? []
  if (list.length === 0) return true
  return match === 'any'
    ? list.some(c => evalCondition(c, ctx))
    : list.every(c => evalCondition(c, ctx))
}
