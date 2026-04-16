import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number | string | null | undefined) {
  const amount = typeof value === 'string' ? parseFloat(value) : (value ?? 0)
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

export function formatNumber(value: number | string | null | undefined, decimals = 2) {
  const amount = typeof value === 'string' ? parseFloat(value) : (value ?? 0)
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(amount)
}

export function formatTaxId(value: string | null | undefined) {
  if (!value) return ''
  const clean = value.replace(/\D/g, '')
  if (clean.length === 14) {
    return clean.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")
  }
  return value // Return raw if not CNPJ pattern
}
