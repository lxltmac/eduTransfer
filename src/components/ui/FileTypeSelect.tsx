"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface SelectOption {
  value: string
  label: string
}

interface FileTypeSelectProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

const fileTypes: SelectOption[] = [
  { value: "all", label: "所有类型" },
  { value: "audio", label: "音频文件" },
  { value: "ppt", label: "PPT 演示文稿" },
  { value: "pdf", label: "PDF 文档" },
  { value: "image", label: "图片资源" },
  { value: "video", label: "视频文件" },
  { value: "other", label: "其他" },
]

export function FileTypeSelect({ value, onChange, className }: FileTypeSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selectedOption = fileTypes.find(f => f.value === value)

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
          "flex h-8 w-auto min-w-[100px] items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600 outline-none transition-all",
          "hover:border-blue-300 hover:bg-blue-50",
          isOpen && "border-blue-400 bg-blue-50 ring-2 ring-blue-200"
        )}
      >
        <span className="truncate">{selectedOption?.label || "选择"}</span>
        <ChevronDown className={cn("size-4 text-slate-400 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 min-w-[140px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          {fileTypes.map((type) => (
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
