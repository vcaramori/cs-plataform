"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export type Option = {
  label: string
  value: string
  className?: string
}

export interface SearchableSelectProps {
  options: Option[]
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  emptyMessage?: string
  className?: string
  disabled?: boolean
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = "Selecione uma opção...",
  emptyMessage = "Nenhuma opção encontrada.",
  className,
  disabled = false,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false)

  // O shadcn command filtra usando internal text nodes. Como Label é renderizado, ele filtrará na label
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-[#2d3558] dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700",
            "text-[10px] font-bold uppercase tracking-widest shadow-sm",
            className
          )}
        >
          <span className="truncate">
            {value
              ? options.find((option) => option.value === value)?.label || placeholder
              : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-40" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 z-[60] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-xl">
        <Command className="bg-transparent">
          <CommandInput 
            placeholder="Pesquisar..." 
            className="text-[#2d3558] dark:text-white border-0 focus:ring-0 placeholder:text-slate-400" 
          />
          <CommandList className="max-h-[250px] overflow-auto">
            <CommandEmpty className="py-4 text-center text-xs font-bold uppercase tracking-widest text-slate-400">{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label} // O cmdk by default filtra pelo value prop do CommandItem
                  onSelect={() => {
                    onValueChange(option.value)
                    setOpen(false)
                  }}
                  className={cn(
                    "text-[#2d3558] dark:text-white data-[selected='true']:bg-slate-50 dark:data-[selected='true']:bg-slate-800 cursor-pointer font-bold uppercase tracking-widest text-[9px] py-3",
                    option.className
                  )}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100 text-indigo-600 dark:text-indigo-400" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
