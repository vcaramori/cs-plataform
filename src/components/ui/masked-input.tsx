'use client'

import * as React from 'react'
import { NumericFormat, PatternFormat, type NumericFormatProps, type PatternFormatProps } from 'react-number-format'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export interface MaskedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  maskType: 'currency' | 'phone' | 'decimal' | 'tax_id'
  onValueChange?: (value: string) => void
}

const MaskedInput = React.forwardRef<HTMLInputElement, MaskedInputProps>(
  ({ className, maskType, onValueChange, ...props }, ref) => {
    const { value, ...otherProps } = props
    
    // Narrow value to exclude readonly string[] for react-number-format compatibility
    const sanitizedValue = Array.isArray(value) ? value.join('') : value

    const commonProps = {
      className: cn(
        "bg-slate-800 border-slate-700 text-white placeholder:text-slate-500",
        className
      ),
      onValueChange: (values: any) => {
        if (onValueChange) {
           // Retorna o valor "bruto" (clean) para o form lidar
           onValueChange(values.value)
        }
      },
      ...otherProps,
      value: sanitizedValue
    }

    if (maskType === 'currency') {
      return (
        <NumericFormat
          {...(commonProps as any)}
          customInput={Input as any}
          thousandSeparator="."
          decimalSeparator=","
          prefix="R$ "
          decimalScale={2}
          fixedDecimalScale
          allowNegative={false}
        />
      )
    }

    if (maskType === 'decimal') {
      return (
        <NumericFormat
          {...(commonProps as any)}
          customInput={Input as any}
          thousandSeparator="."
          decimalSeparator=","
          decimalScale={2}
          allowNegative={false}
        />
      )
    }

    if (maskType === 'phone') {
      // Máscara flexível: Se o valor começar com +, remove a máscara rígida para permitir internacional
      // Se não, tenta o padrão BR.
      const strValue = String(sanitizedValue || '')
      if (strValue.startsWith('+')) {
        return (
          <Input 
            {...otherProps}
            value={sanitizedValue}
            className={commonProps.className}
            onChange={(e) => onValueChange?.(e.target.value)}
          />
        )
      }

      return (
        <PatternFormat
          {...(commonProps as any)}
          customInput={Input as any}
          format="(##) #####-####"
          mask="_"
        />
      )
    }

    if (maskType === 'tax_id') {
      return (
        <PatternFormat
          {...(commonProps as any)}
          customInput={Input as any}
          format="##.###.###/####-##"
          mask="_"
        />
      )
    }

    return <Input {...otherProps} value={sanitizedValue} className={commonProps.className} />
  }
)

MaskedInput.displayName = 'MaskedInput'

export { MaskedInput }
