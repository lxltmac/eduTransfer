import React, { useState, useRef, useEffect } from 'react';
import { X, ChevronDown } from 'lucide-react';

interface MultiSelectProps {
  options: { id: string; name: string }[];
  selected: string[];
  onChange?: (selected: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

const MultiSelect: React.FC<MultiSelectProps> = ({ options, selected, onChange, placeholder = '请选择', disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => 
    opt.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedItems = options.filter(opt => selected.includes(opt.id));

  const toggleOption = (id: string) => {
    if (disabled || !onChange) return;
    if (selected.includes(id)) {
      onChange(selected.filter(s => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const removeItem = (id: string, e: React.MouseEvent) => {
    if (disabled || !onChange) return;
    e.stopPropagation();
    onChange(selected.filter(s => s !== id));
  };

  return (
    <div ref={containerRef} className="relative">
      <div 
        className={`min-h-[42px] border border-slate-200 rounded-xl bg-slate-50 p-2 flex flex-wrap gap-1 items-center ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
        onClick={() => {
          if (disabled) return;
          setIsOpen(!isOpen);
          if (!isOpen) inputRef.current?.focus();
        }}
      >
        {selectedItems.length === 0 ? (
          <span className="text-slate-400 text-sm px-2">{placeholder}</span>
        ) : (
          selectedItems.map(item => (
            <span 
              key={item.id}
              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm"
            >
              {item.name}
              {!disabled && onChange && (
                <button 
                  type="button"
                  onClick={(e) => removeItem(item.id, e)}
                  className="hover:text-blue-900"
                >
                  <X size={14} />
                </button>
              )}
            </span>
          ))
        )}
        <ChevronDown size={16} className="ml-auto text-slate-400" />
      </div>
      
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg">
          <div className="p-2 border-b border-slate-100">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索..."
              className="w-full px-3 py-2 bg-slate-50 rounded-lg text-sm outline-none"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-slate-400 text-center">无匹配选项</div>
            ) : (
              filteredOptions.map(opt => (
                <div
                  key={opt.id}
                  onClick={() => toggleOption(opt.id)}
                  className={`px-4 py-2 cursor-pointer flex items-center gap-2 text-sm hover:bg-slate-50 ${
                    selected.includes(opt.id) ? 'bg-blue-50 text-blue-700' : 'text-slate-600'
                  }`}
                >
                  <div className={`w-4 h-4 border rounded flex items-center justify-center ${
                    selected.includes(opt.id) ? 'bg-blue-500 border-blue-500' : 'border-slate-300'
                  }`}>
                    {selected.includes(opt.id) && <span className="text-white text-xs">✓</span>}
                  </div>
                  {opt.name}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiSelect;
