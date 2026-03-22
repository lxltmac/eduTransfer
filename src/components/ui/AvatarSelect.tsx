import React, { useState, useRef } from 'react';
import { Upload, Check, X } from 'lucide-react';

const PRESET_AVATARS = [
  'https://picsum.photos/seed/xili1/100/100',
  'https://picsum.photos/seed/xili2/100/100',
  'https://picsum.photos/seed/xili3/100/100',
  'https://picsum.photos/seed/xili4/100/100',
  'https://picsum.photos/seed/xili5/100/100',
  'https://picsum.photos/seed/xili6/100/100',
  'https://picsum.photos/seed/xili7/100/100',
  'https://picsum.photos/seed/xili8/100/100',
  'https://picsum.photos/seed/xili9/100/100',
  'https://picsum.photos/seed/xili10/100/100',
  'https://picsum.photos/seed/xili11/100/100',
  'https://picsum.photos/seed/xili12/100/100',
  'https://picsum.photos/seed/xili13/100/100',
  'https://picsum.photos/seed/xili14/100/100',
  'https://picsum.photos/seed/xili15/100/100',
  'https://picsum.photos/seed/xili16/100/100',
];

interface AvatarSelectProps {
  value: string;
  onChange: (avatar: string, avatarUrl?: string) => void;
  label?: string;
}

export function AvatarSelect({ value, onChange, label = '头像' }: AvatarSelectProps) {
  const [uploading, setUploading] = useState(false);
  const [customAvatar, setCustomAvatar] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('图片大小不能超过2MB');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const res = await fetch('/api/avatar/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setCustomAvatar(data.url);
        onChange(data.url, data.url);
      } else {
        alert(data.message || '上传失败');
      }
    } catch (err) {
      alert('上传失败');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handlePresetSelect = (avatar: string) => {
    setCustomAvatar(null);
    onChange(avatar, avatar);
  };

  const handleRemoveCustom = () => {
    setCustomAvatar(null);
    onChange(PRESET_AVATARS[0], PRESET_AVATARS[0]);
  };

  const displayAvatar = customAvatar || value || PRESET_AVATARS[0];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center">
        <div className="relative">
          <img
            src={displayAvatar}
            alt="Selected avatar"
            className="w-24 h-24 rounded-full object-cover border-4 border-slate-200 shadow-lg"
            onError={(e) => {
              e.currentTarget.src = 'https://picsum.photos/seed/default/100/100';
            }}
          />
          {customAvatar && (
            <button
              onClick={handleRemoveCustom}
              className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center hover:bg-rose-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-2">{label}</label>
        
        <div className="mb-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            id="avatar-upload"
          />
          <label
            htmlFor="avatar-upload"
            className={`flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Upload size={18} className="text-slate-500" />
            <span className="text-sm text-slate-600">{uploading ? '上传中...' : '上传自定义头像'}</span>
          </label>
        </div>

        <p className="text-xs text-slate-500 mb-2">或选择预设头像：</p>
        <div className="grid grid-cols-8 gap-2">
          {PRESET_AVATARS.map((avatar, idx) => (
            <button
              key={idx}
              onClick={() => handlePresetSelect(avatar)}
              className={`relative w-10 h-10 rounded-full overflow-hidden border-2 transition-all ${
                displayAvatar === avatar && !customAvatar
                  ? 'border-blue-500 ring-2 ring-blue-200'
                  : 'border-transparent hover:border-slate-300'
              }`}
            >
              <img src={avatar} alt={`Avatar ${idx + 1}`} className="w-full h-full object-cover" />
              {displayAvatar === avatar && !customAvatar && (
                <div className="absolute inset-0 bg-blue-500/30 flex items-center justify-center">
                  <Check size={16} className="text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AvatarSelect;
