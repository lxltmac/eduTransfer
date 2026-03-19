"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface SelectOption {
  value: string
  label: string
}

interface SearchTypeSelectProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

const searchTypes: SelectOption[] = [
  { value: "file", label: "文件名" },
  { value: "folder", label: "文件夹名" },
  { value: "uploader", label: "上传者" },
]

export function SearchTypeSelect({ value, onChange, className }: SearchTypeSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selectedOption = searchTypes.find(t => t.value === value)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex h-8 items-center justify-between gap-2 rounded-l-lg border border-r-0 border-slate-200 bg-white px-3 text-sm text-slate-600 outline-none transition-all",
          "hover:border-blue-300 hover:bg-blue-50",
          isOpen && "border-blue-400 bg-blue-50 ring-2 ring-blue-200"
        )}
      >
        <span className="truncate">{selectedOption?.label || "文件名"}</span>
        <ChevronDown className={cn("size-4 text-slate-400 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 min-w-[120px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          {searchTypes.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => {
                onChange(type.value)
                setIsOpen(false)
              }}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-600 transition-colors",
                "hover:bg-blue-50 hover:text-blue-600",
                type.value === value && "bg-blue-50 text-blue-600 font-medium"
              )}
            >
              {type.value === value && <Check className="size-3.5" />}
              <span>{type.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
