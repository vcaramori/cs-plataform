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
  size?: "default" | "sm"
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = "Selecione uma opção...",
  emptyMessage = "Nenhuma opção encontrada.",
  className,
  disabled = false,
  size = "default",
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
            "w-full justify-between bg-surface-card/50 dark:bg-[#101623] border-border/50 text-[#2d3558] dark:text-white hover:bg-surface-card dark:hover:bg-[#1a2333] transition-all",
            size === "sm"
              ? "h-9 px-3 text-xs font-normal rounded-lg shadow-sm"
              : "h-11 px-6 text-[10px] font-black uppercase tracking-[0.1em] rounded-2xl shadow-sm",
            className
          )}
        >
          <span className="truncate">
            {value
              ? options.find((option) => option.value === value)?.label || placeholder
              : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("w-[--radix-popover-trigger-width] p-0 z-[60] bg-white dark:bg-[#101623] border border-border/50 shadow-2xl overflow-hidden", size === "sm" ? "rounded-lg" : "rounded-2xl")}>
        <Command className="bg-transparent">
          <CommandInput 
            placeholder="Pesquisar..." 
            className="text-[#2d3558] dark:text-white border-0 focus:ring-0 placeholder:text-content-secondary" 
          />
          <CommandList className="max-h-[250px] overflow-auto">
            <CommandEmpty className="py-4 text-center text-xs font-bold uppercase tracking-widest text-content-secondary">{emptyMessage}</CommandEmpty>
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
                    "text-[#2d3558] dark:text-white data-[selected='true']:bg-surface-background dark:data-[selected='true']:bg-slate-800 cursor-pointer",
                    size === "sm"
                      ? "text-xs font-normal py-2 px-3 normal-case"
                      : "font-bold uppercase tracking-widest text-[9px] py-3",
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
