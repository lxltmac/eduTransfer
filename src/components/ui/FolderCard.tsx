import React from 'react';
import { Settings, CheckCircle2, Circle } from 'lucide-react';

interface FolderCardProps {
  title: string;
  onClick?: () => void;
  onSettings?: () => void;
  isSelected?: boolean;
  onSelect?: () => void;
}

const FolderCard: React.FC<FolderCardProps> = ({ 
  title, 
  onClick, 
  onSettings,
  isSelected = false,
  onSelect
}) => {
  return (
    <section 
      className="relative group flex flex-col items-center justify-center cursor-pointer"
      onClick={onClick}
    >
      {/* 选择按钮 */}
      <button 
        onClick={(e) => { e.stopPropagation(); onSelect?.(); }}
        className="absolute top-0 left-0 z-20 p-1"
      >
        {isSelected ? (
          <CheckCircle2 size={18} className="text-blue-600" />
        ) : (
          <Circle size={18} className="text-slate-300" />
        )}
      </button>

      {/* 权限设置按钮 */}
      <button 
        onClick={(e) => { e.stopPropagation(); onSettings?.(); }}
        className="absolute top-0 right-0 z-20 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Settings size={16} className="text-slate-400 hover:text-slate-600" />
      </button>

      <div className="file relative w-32 h-20 cursor-pointer origin-bottom [perspective:1500px] z-10">
        <div className="work-5 bg-amber-600 w-full h-full origin-top rounded-2xl rounded-tl-none group-hover:shadow-[0_20px_40px_rgba(0,0,0,.2)] transition-all ease duration-300 relative after:absolute after:content-[''] after:bottom-[99%] after:left-0 after:w-10 after:h-3 after:bg-amber-600 after:rounded-t-2xl before:absolute before:content-[''] before:-top-[10px] before:left-[49px] before:w-3 before:h-3 before:bg-amber-600 before:[clip-path:polygon(0_35%,0%_100%,50%_100%);]" />
        <div className="work-4 absolute inset-0.5 bg-zinc-400 rounded-xl transition-all ease duration-300 origin-bottom select-none group-hover:[transform:rotateX(-20deg)]" />
        <div className="work-3 absolute inset-0.5 bg-zinc-300 rounded-xl transition-all ease duration-300 origin-bottom group-hover:[transform:rotateX(-30deg)]" />
        <div className="work-2 absolute inset-0.5 bg-zinc-200 rounded-xl transition-all ease duration-300 origin-bottom group-hover:[transform:rotateX(-38deg)]" />
        <div className="work-1 absolute bottom-0 bg-gradient-to-t from-amber-500 to-amber-400 w-full h-[82px] rounded-xl rounded-tr-none after:absolute after:content-[''] after:bottom-[99%] after:right-0 after:w-[78px] after:h-[10px] after:bg-amber-400 after:rounded-t-xl before:absolute before:content-[''] before:-top-[6px] before:right-[76px] before:size-2 before:bg-amber-400 before:[clip-path:polygon(100%_14%,50%_100%,100%_100%);] transition-all ease duration-300 origin-bottom flex items-end group-hover:shadow-[inset_0_20px_40px_#fbbf24,_inset_0_-20px_40px_#d97706] group-hover:[transform:rotateX(-46deg)_translateY(1px)]" />
      </div>
      <p className="text-xs pt-2 text-slate-600 font-medium truncate max-w-28 text-center">{title}</p>
    </section>
  );
}

export default FolderCard;
