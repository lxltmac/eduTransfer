"use client";
import React, { useState, useEffect, useRef } from 'react';
import { 
  Users,
  FileCheck,
  Layers,
  ShieldCheck,
  Building,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Search,
  LayoutDashboard,
  Menu,
  Network,
} from 'lucide-react';

type Tab = 'dashboard' | 'files' | 'departments' | 'groups' | 'accounts' | 'roles' | 'settings' | 'organization';

interface NavigationItem {
  id: Tab;
  name: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  permission?: string;
}

interface ModernSidebarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  user: {
    name: string;
    avatar: string;
    avatar_url?: string;
    role: string;
  };
  onLogout: () => void;
  siteSettings: {
    site_name: string;
    theme_color: string;
    site_subtitle: string;
  };
  hasPermission: (permission: string) => boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const navigationItems: NavigationItem[] = [
  { id: "dashboard", name: "仪表盘", icon: LayoutDashboard, permission: 'view_dashboard' },
  { id: "files", name: "文件传输", icon: FileCheck, permission: 'access_files' },
  { id: "organization", name: "组织架构", icon: Network },
  { id: "departments", name: "部门管理", icon: Building, permission: 'manage_departments' },
  { id: "groups", name: "小组管理", icon: Layers, permission: 'manage_groups' },
];

const adminItems: NavigationItem[] = [
  { id: "accounts", name: "账号管理", icon: Users, permission: 'manage_users' },
  { id: "roles", name: "角色管理", icon: ShieldCheck, permission: 'manage_roles' },
  { id: "settings", name: "系统设置", icon: Settings, permission: 'manage_settings' },
];

const roleLabels: Record<string, string> = {
  admin: '系统管理员',
  manager: '部门经理',
  member: '普通成员',
};

export function ModernSidebar({
  activeTab,
  onTabChange,
  user,
  onLogout,
  siteSettings,
  hasPermission,
  isCollapsed,
  onToggleCollapse,
}: ModernSidebarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const visibleMainItems = navigationItems.filter(item => 
    !item.permission || hasPermission(item.permission)
  );
  
  const visibleAdminItems = adminItems.filter(item => 
    !item.permission || hasPermission(item.permission)
  );

  const allVisibleItems = [...visibleMainItems, ...visibleAdminItems];
  
  const searchResults = searchQuery.trim() 
    ? allVisibleItems.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileOpen(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNavClick = (tab: Tab) => {
    onTabChange(tab);
    setSearchQuery('');
    setShowResults(false);
    if (window.innerWidth < 768) {
      setIsMobileOpen(false);
    }
  };

  const handleSearchFocus = () => {
    if (searchQuery.trim()) {
      setShowResults(true);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setShowResults(value.trim().length > 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setSearchQuery('');
      setShowResults(false);
      inputRef.current?.blur();
    } else if (e.key === 'Enter' && searchResults.length > 0) {
      handleNavClick(searchResults[0].id);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsMobileOpen(true)}
        className="fixed top-4 left-4 z-[60] p-3 rounded-2xl bg-white shadow-lg border border-slate-200 md:hidden hover:bg-slate-50 transition-all duration-200"
        aria-label="打开菜单"
      >
        <Menu className="h-5 w-5 text-slate-700" />
      </button>

      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[55] md:hidden" 
          onClick={() => setIsMobileOpen(false)} 
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-full bg-gradient-to-b from-slate-50 to-white z-[59] transition-all duration-300 ease-in-out flex flex-col
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          ${isCollapsed ? "w-20" : "w-64"}
          border-r border-slate-200/80 shadow-xl shadow-slate-200/50
        `}
      >
        <div className="relative">
          <div className={`flex items-center ${isCollapsed ? 'justify-center p-4' : 'p-5'} border-b border-slate-200/60`}>
            <div 
              className="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0"
              style={{ backgroundColor: siteSettings.theme_color }}
            >
              <Layers size={24} className="text-white" />
            </div>
            {!isCollapsed && (
              <div className="ml-3">
                <h1 className="font-bold text-lg text-slate-800">{siteSettings.site_name}</h1>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">{siteSettings.site_subtitle}</p>
              </div>
            )}
          </div>
          <button
            onClick={onToggleCollapse}
            className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white border border-slate-200 items-center justify-center shadow-md hover:bg-slate-50 transition-all duration-200 z-10"
            aria-label={isCollapsed ? "展开" : "收起"}
          >
            {isCollapsed ? (
              <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
            ) : (
              <ChevronLeft className="h-3.5 w-3.5 text-slate-500" />
            )}
          </button>
        </div>

        {!isCollapsed && (
          <div className="px-4 py-4" ref={searchRef}>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={handleSearchFocus}
                onKeyDown={handleKeyDown}
                placeholder="搜索功能..."
                className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all duration-200 shadow-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); setShowResults(false); }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <span className="text-xs">✕</span>
                </button>
              )}
            </div>

            {showResults && searchResults.length > 0 && (
              <div className="absolute z-50 mt-2 left-4 right-4 bg-white rounded-xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
                <div className="py-1">
                  {searchResults.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavClick(item.id)}
                        className={`
                          w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors
                          ${isActive ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
                        `}
                      >
                        <Icon className={`h-4 w-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} size={18} />
                        <span className={isActive ? 'font-medium' : ''}>{item.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {showResults && searchResults.length === 0 && searchQuery.trim() && (
              <div className="absolute z-50 mt-2 left-4 right-4 bg-white rounded-xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
                <div className="px-4 py-4 text-center text-sm text-slate-400">
                  未找到匹配的功能
                </div>
              </div>
            )}
          </div>
        )}

        <nav className="flex-1 px-3 py-2 overflow-y-auto">
          <div className={`text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2 ${isCollapsed ? 'text-center px-2' : 'px-3'}`}>
            {!isCollapsed && '主菜单'}
          </div>
          <ul className="space-y-1">
            {visibleMainItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const matchesSearch = searchQuery.trim() && item.name.toLowerCase().includes(searchQuery.toLowerCase());
              return (
                <li key={item.id} className="relative">
                  <button
                    onClick={() => handleNavClick(item.id)}
                    className={`
                      w-full flex items-center gap-3 transition-all duration-200 group relative
                      ${matchesSearch 
                        ? "bg-blue-100 text-blue-700" 
                        : isActive 
                          ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30" 
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}
                      ${isCollapsed ? "justify-center p-3 rounded-xl" : "px-4 py-3 rounded-xl"}
                    `}
                  >
                    <Icon className={`h-5 w-5 flex-shrink-0 ${matchesSearch ? "text-blue-600" : isActive ? "text-white" : "text-slate-500 group-hover:text-slate-700"}`} size={22} />
                    {!isCollapsed && <span className={`text-sm font-medium ${isActive ? "font-semibold" : ""}`}>{item.name}</span>}
                    {isCollapsed && (
                      <div className="absolute left-full ml-3 px-3 py-2 bg-slate-800 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-xl">
                        {item.name}
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1.5 w-2 h-2 bg-slate-800 rotate-45" />
                      </div>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          {visibleAdminItems.length > 0 && (
            <>
              <div className={`my-4 border-t border-slate-200/60 ${isCollapsed ? 'mx-2' : 'mx-3'}`} />
              <div className={`text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2 ${isCollapsed ? 'text-center px-2' : 'px-3'}`}>
                {!isCollapsed && '系统管理'}
              </div>
              <ul className="space-y-1">
                {visibleAdminItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  const matchesSearch = searchQuery.trim() && item.name.toLowerCase().includes(searchQuery.toLowerCase());
                  return (
                    <li key={item.id} className="relative">
                      <button
                        onClick={() => handleNavClick(item.id)}
                        className={`
                          w-full flex items-center gap-3 transition-all duration-200 group relative
                          ${matchesSearch 
                            ? "bg-blue-100 text-blue-700" 
                            : isActive 
                              ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30" 
                              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}
                          ${isCollapsed ? "justify-center p-3 rounded-xl" : "px-4 py-3 rounded-xl"}
                        `}
                      >
                        <Icon className={`h-5 w-5 flex-shrink-0 ${matchesSearch ? "text-blue-600" : isActive ? "text-white" : "text-slate-500 group-hover:text-slate-700"}`} size={22} />
                        {!isCollapsed && <span className={`text-sm font-medium ${isActive ? "font-semibold" : ""}`}>{item.name}</span>}
                        {isCollapsed && (
                          <div className="absolute left-full ml-3 px-3 py-2 bg-slate-800 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-xl">
                            {item.name}
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1.5 w-2 h-2 bg-slate-800 rotate-45" />
                          </div>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </nav>

        <div className="mt-auto border-t border-slate-200/60 bg-gradient-to-t from-slate-50 to-transparent">
          <div className={`border-b border-slate-200/60 ${isCollapsed ? 'p-2' : 'p-4'}`}>
            <div className={`flex items-center rounded-xl transition-colors duration-200 ${isActive => isActive ? 'bg-blue-50' : 'hover:bg-slate-100'} ${isCollapsed ? 'justify-center p-2' : 'p-2.5'}`}>
              <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-slate-200">
                <img src={user.avatar_url || user.avatar} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              {!isCollapsed && (
                <div className="ml-3 flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{user.name}</p>
                  <p className="text-xs text-slate-500 truncate">{roleLabels[user.effective_role || user.role] || user.effective_role || user.role}</p>
                </div>
              )}
            </div>
          </div>

          <div className="p-2">
            <button
              onClick={onLogout}
              className={`
                w-full flex items-center rounded-xl text-left transition-all duration-200 group relative
                text-rose-600 hover:bg-rose-50 hover:text-rose-700
                ${isCollapsed ? "justify-center p-3" : "px-4 py-3"}
              `}
            >
              <LogOut className="h-5 w-5 flex-shrink-0 text-rose-500 group-hover:text-rose-600" size={22} />
              {!isCollapsed && <span className="text-sm font-medium ml-3">退出登录</span>}
              {isCollapsed && (
                <div className="absolute left-full ml-3 px-3 py-2 bg-slate-800 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-xl">
                  退出登录
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1.5 w-2 h-2 bg-slate-800 rotate-45" />
                </div>
              )}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
