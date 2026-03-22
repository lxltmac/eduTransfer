import React, { useState, useEffect, useRef } from 'react';
import FolderCard from './components/ui/FolderCard';
import Modal from './components/ui/Modal';
import Alert from './components/ui/Alert';
import MultiSelect from './components/ui/MultiSelect';
import { AvatarSelect } from './components/ui/AvatarSelect';
import { ModernSidebar } from './components/ui/ModernSidebar';
import { AnimatedLoginPage } from './components/ui/AnimatedLoginPage';
import { 
  AlertTriangle,
  LayoutDashboard, 
  Users, 
  FileCheck, 
  Layers, 
  Plus, 
  Upload, 
  CheckCircle2, 
  XCircle, 
  ChevronRight,
  Download,
  ShieldCheck,
  Check,
  Circle,
  Menu,
  Trash2,
  Folder,
  FolderPlus,
  Trash,
  Settings,
  FileText,
  Image,
  Video,
  File,
  Grid,
  List,
  Building,
  Edit,
  Home,
  Music,
  Search,
  Network
} from 'lucide-react';

export interface Department {
  id: number;
  name: string;
  description: string;
  created_at?: string;
}

export interface Group {
  id: number;
  name: string;
  department_id: number;
  department_name?: string;
}

export interface Folder {
  id: number;
  name: string;
  parent_id: number | null;
  created_at: string;
  role_ids?: string;
  group_ids?: string;
  department_ids?: string;
  owner_id?: number;
  owner_name?: string;
  is_public?: number;
}

export interface Role {
  id: number;
  name: string;
  description: string;
  permissions: string[];
}

export interface User {
  id: number;
  username: string;
  role: string;
  effective_role?: string;
  name: string;
  avatar: string;
  avatar_url?: string;
  permissions: string[];
  department_ids?: number[];
  department_names?: string;
  password?: string;
  role_ids?: number[];
  role_names?: string[];
  group_ids?: number[];
  groups?: { id: number; name: string; department_id: number; department_name?: string }[];
}

export interface FileItem {
  id: number;
  name: string;
  file_type: string;
  file_url: string;
  file_size: number;
  upload_time: string;
  uploader_name: string;
  uploader_username: string;
  uploader_id: number;
  folder_id: number;
}

type Tab = 'dashboard' | 'files' | 'departments' | 'groups' | 'accounts' | 'roles' | 'settings' | 'organization';

function canManage(user: User | null): boolean {
  if (!user) return false;
  return user.effective_role === "admin" || user.permissions?.includes("manage_folders") || user.permissions?.includes("manage_files") || user.permissions?.includes("manage_users");
}

function App() {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('edu_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [siteSettings, setSiteSettings] = useState({ site_name: 'EduTransfer', theme_color: '#3B82F6', site_subtitle: 'File Transfer System' });
  
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error' | 'warning' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type?: 'danger' | 'warning' | 'info';
  } | null>(null);
  
  const confirmCallbackRef = useRef<(() => void) | null>(null);

  const showConfirm = (options: {
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info';
  }) => {
    confirmCallbackRef.current = options.onConfirm;
    setConfirmDialog({
      isOpen: true,
      title: options.title,
      message: options.message,
      type: options.type,
    });
  };

  const handleConfirm = () => {
    if (confirmCallbackRef.current) {
      confirmCallbackRef.current();
    }
    setConfirmDialog(null);
    confirmCallbackRef.current = null;
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      setSiteSettings({ 
        site_name: data.site_name || 'EduTransfer', 
        theme_color: data.theme_color || '#3B82F6', 
        site_subtitle: data.site_subtitle || 'File Transfer System' 
      });
      document.documentElement.style.setProperty('--color-primary', data.theme_color || '#3B82F6');
    } catch (e) {
      console.error('Failed to load settings', e);
    }
  };

  const hasPermission = (permission: string) => {
    return user?.permissions.includes(permission);
  };

  const handleLogin = (userData: User) => {
    localStorage.setItem('edu_user', JSON.stringify(userData));
    setUser(userData);
  };

  useEffect(() => {
    if (user) {
      localStorage.setItem('edu_user', JSON.stringify(user));
    }
  }, [user]);

  const handleLogout = () => {
    showConfirm({
      title: '退出登录',
      message: '确定要退出登录吗？',
      type: 'warning',
      onConfirm: () => {
        localStorage.removeItem('edu_user');
        setUser(null);
        setActiveTab('dashboard');
      }
    });
  };

  if (!user) {
    return <AnimatedLoginPage onLogin={handleLogin} showNotification={showNotification} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <ModernSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        user={user}
        onLogout={handleLogout}
        siteSettings={siteSettings}
        hasPermission={hasPermission}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      
      <main className={`flex-1 overflow-y-auto transition-all duration-300 ${sidebarCollapsed ? 'md:pl-20' : 'md:pl-64'} pl-16`}>
        <div className="p-6">
          {activeTab === 'dashboard' && <DashboardView user={user} />}
          {activeTab === 'files' && <FilesView user={user} showConfirm={showConfirm} showNotification={showNotification} />}
          {activeTab === 'departments' && <DepartmentsView user={user} showConfirm={showConfirm} showNotification={showNotification} />}
          {activeTab === 'groups' && <GroupsView user={user} showConfirm={showConfirm} showNotification={showNotification} />}
          {activeTab === 'accounts' && <AccountsView user={user} showConfirm={showConfirm} showNotification={showNotification} onUserUpdate={setUser} />}
            {activeTab === 'roles' && <RolesView user={user} showConfirm={showConfirm} showNotification={showNotification} />}
          {activeTab === 'settings' && <SettingsView showNotification={showNotification} siteSettings={siteSettings} setSiteSettings={setSiteSettings} />}
          {activeTab === 'organization' && <OrganizationView user={user} showNotification={showNotification} />}
        </div>
      </main>

      {notification && (
        <Alert type={notification.type} message={notification.message} />
      )}

      {confirmDialog?.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-2">{confirmDialog.title}</h3>
            <p className="text-slate-600 mb-6">{confirmDialog.message}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDialog(null)} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50">
                取消
              </button>
              <button onClick={handleConfirm} className={`flex-1 px-4 py-2 rounded-xl font-medium text-white ${
                confirmDialog.type === 'danger' ? 'bg-rose-600 hover:bg-rose-700' : 
                confirmDialog.type === 'warning' ? 'bg-amber-500 hover:bg-amber-600' : 
                'bg-blue-600 hover:bg-blue-700'
              }`}>
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardView({ user }: { user: User }) {
  const [stats, setStats] = useState({ departments: 0, users: 0, files: 0, folders: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const [deptRes, usersRes, filesRes, foldersRes] = await Promise.all([
        fetch('/api/departments'),
        fetch('/api/users'),
        fetch('/api/files'),
        fetch(`/api/folders?userId=${user?.id}`),
      ]);
      const [departments, users, files, foldersData] = await Promise.all([
        deptRes.json(),
        usersRes.json(),
        filesRes.json(),
        foldersRes.json(),
      ]);
      setStats({
        departments: Array.isArray(departments) ? departments.length : 0,
        users: Array.isArray(users) ? users.length : 0,
        files: Array.isArray(files) ? files.length : 0,
        folders: Array.isArray(foldersData.folders) ? foldersData.folders.length : 0,
      });
    };
    fetchStats();
  }, []);

  const displayAvatar = user.avatar_url || user.avatar;
  const roleLabel = user.role_names?.[0] || (user.effective_role === 'admin' ? '系统管理员' : user.effective_role === 'manager' ? '部门管理员' : '普通成员');
  const userGroups = Array.isArray(user.groups) ? user.groups : [];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center gap-4">
          <img src={displayAvatar} alt={user.name} className="w-16 h-16 rounded-full object-cover border-2 border-slate-200" referrerPolicy="no-referrer" />
          <div>
            <h2 className="text-2xl font-bold text-slate-800">欢迎回来，{user.name}</h2>
            <p className="text-slate-500 flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded text-xs font-medium">{roleLabel}</span>
              {user.department_names && <span className="text-sm">{user.department_names}</span>}
            </p>
            {userGroups.length > 0 && (
              <p className="text-sm text-slate-500 mt-1">所属小组：{userGroups.map(g => g.name).join(', ')}</p>
            )}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
            <Building size={24} className="text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-slate-800">{stats.departments}</p>
          <p className="text-slate-500 text-sm">部门数量</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
            <Users size={24} className="text-green-600" />
          </div>
          <p className="text-3xl font-bold text-slate-800">{stats.users}</p>
          <p className="text-slate-500 text-sm">用户数量</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-4">
            <Folder size={24} className="text-amber-600" />
          </div>
          <p className="text-3xl font-bold text-slate-800">{stats.folders}</p>
          <p className="text-slate-500 text-sm">文件夹数量</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
            <FileCheck size={24} className="text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-slate-800">{stats.files}</p>
          <p className="text-slate-500 text-sm">文件数量</p>
        </div>
      </div>
    </div>
  );
}

function FileTypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'audio': return <Music size={20} className="text-purple-500" />;
    case 'ppt': return <Layers size={20} className="text-orange-500" />;
    case 'pdf': return <FileCheck size={20} className="text-rose-500" />;
    case 'image': return <Image size={20} className="text-emerald-500" />;
    case 'video': return <Video size={20} className="text-blue-500" />;
    default: return <File size={20} className="text-slate-400" />;
  }
}

function FilesView({ user, showConfirm, showNotification }: { user: User; showConfirm: any; showNotification: any }) {
  const [filter, setFilter] = useState<string>('all');
  const [showUpload, setShowUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<number[]>([]);
  const [selectedFolders, setSelectedFolders] = useState<number[]>([]);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showFolderMoveModal, setShowFolderMoveModal] = useState(false);
  const [targetFolderId, setTargetFolderId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [parentId, setParentId] = useState<number | null>(null);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [editName, setEditName] = useState('');
  const [showBatchActions, setShowBatchActions] = useState(false);
  const [viewMode, setViewMode] = useState<'icon' | 'list'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'all' | 'file' | 'folder' | 'creator'>('all');
  const [folderPermissions, setFolderPermissions] = useState<{role_ids: string[], group_ids: string[], department_ids: string[], is_public: number}>({role_ids: [], group_ids: [], department_ids: [], is_public: 0});
  const [showFolderSettings, setShowFolderSettings] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    fetchFolders();
    fetchFiles(parentId);
  }, [parentId]);

  const getChildFolders = (pid: number | null) => {
    return folders.filter(f => f.parent_id === pid);
  };

  const renderFolderTree = (pid: number | null, level: number = 0) => {
    const childFolders = getChildFolders(pid);
    return childFolders.map(folder => (
      <div key={folder.id}>
        <div className={`flex items-center gap-1 ${selectedFolders.includes(folder.id) ? 'bg-blue-50' : ''}`}>
          <button 
            onClick={() => { setParentId(folder.id); setCurrentPage(1); }}
            className={`flex-1 text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${parentId === folder.id ? 'bg-blue-50 text-blue-600 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
            style={{ paddingLeft: `${12 + level * 16}px` }}
          >
            <Folder size={14} className="text-blue-400" />
            {folder.name}
          </button>
          <input 
            type="checkbox" 
            checked={selectedFolders.includes(folder.id)}
            onChange={(e) => {
              e.stopPropagation();
              setSelectedFolders(prev => prev.includes(folder.id) ? prev.filter(id => id !== folder.id) : [...prev, folder.id]);
            }}
            className="mr-2"
          />
        </div>
        {renderFolderTree(folder.id, level + 1)}
      </div>
    ));
  };

  const filteredFiles = (files || []).filter(f => {
    if (searchType === 'folder') return false;
    if (searchType === 'creator') {
      const fileInFolder = parentId ? f.folder_id === parentId : !f.folder_id;
      const q = searchQuery.toLowerCase();
      const creatorMatch = f.uploader_name && f.uploader_name.toLowerCase().includes(q);
      return fileInFolder && creatorMatch;
    }
    const fileInFolder = parentId ? f.folder_id === parentId : !f.folder_id;
    const typeMatch = filter === 'all' || f.file_type === filter;
    let searchMatch = true;
    if (searchQuery !== '') {
      const q = searchQuery.toLowerCase();
      searchMatch = f.name.toLowerCase().includes(q) ||
        (f.uploader_name && f.uploader_name.toLowerCase().includes(q));
    }
    return fileInFolder && typeMatch && searchMatch;
  });
  
  const currentFolders = folders.filter(f => {
    if (searchType === 'file') return false;
    if (searchType === 'creator') {
      const q = searchQuery.toLowerCase();
      return f.owner_name && f.owner_name.toLowerCase().includes(q);
    }
    const folderInCurrent = f.parent_id === parentId;
    let searchMatch = true;
    if (searchQuery !== '') {
      const q = searchQuery.toLowerCase();
      searchMatch = f.name.toLowerCase().includes(q) ||
        (f.owner_name && f.owner_name.toLowerCase().includes(q));
    }
    return folderInCurrent && searchMatch;
  });
  const currentFiles = filteredFiles;
  
  const combinedItems = [...currentFolders.map(f => ({ ...f, _type: 'folder' as const })), ...currentFiles.map(f => ({ ...f, _type: 'file' as const }))];
  const totalItems = combinedItems.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = combinedItems.slice(startIndex, endIndex);
  const displayFolders = paginatedItems.filter(item => item._type === 'folder');
  const displayFiles = paginatedItems.filter(item => item._type === 'file');
  
  const getBreadcrumb = () => {
    const path: {id: number | null, name: string}[] = [{id: null, name: '全部文件'}];
    let current = parentId;
    while (current) {
      const folder = folders.find(f => f.id === current);
      if (folder) {
        path.push({id: folder.id, name: folder.name});
        current = folder.parent_id;
      } else {
        break;
      }
    }
    return path.reverse();
  };

  const breadcrumb = getBreadcrumb();

  const fetchFolders = async () => {
    try {
      const res = await fetch(`/api/folders?userId=${user.id}`);
      const data = await res.json();
      setFolders(data.folders || []);
    } catch (error) {
      console.error('Error fetching folders:', error);
    }
  };

  const fetchFiles = async (folderId: number | null) => {
    try {
      const url = folderId ? `/api/files?folder_id=${folderId}` : '/api/files';
      const res = await fetch(url);
      const data = await res.json();
      setFiles(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching files:', error);
    }
  };

  const handleUpdateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFolder || !editName.trim()) return;
    await fetch(`/api/folders/${editingFolder.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName })
    });
    setEditingFolder(null);
    setEditName('');
    fetchFolders();
  };

  const handleDeleteFolder = async (id: number) => {
    showConfirm({
      title: '删除文件夹',
      message: '确定要删除该文件夹吗？',
      type: 'danger',
      onConfirm: async () => {
        await fetch(`/api/folders/${id}`, { method: 'DELETE' });
        showNotification('success', '文件夹已删除');
        fetchFolders();
      }
    });
  };

  const handleOpenFolderSettings = async (folder: Folder) => {
    const [rolesRes, groupsRes, deptsRes] = await Promise.all([
      fetch('/api/roles'),
      fetch('/api/groups'),
      fetch('/api/departments')
    ]);
    setRoles(await rolesRes.json());
    setGroups(await groupsRes.json());
    setDepartments(await deptsRes.json());
    setEditingFolder(folder);
    setEditName(folder.name);
    setFolderPermissions({
      role_ids: folder.role_ids ? JSON.parse(folder.role_ids) : [],
      group_ids: folder.group_ids ? JSON.parse(folder.group_ids) : [],
      department_ids: folder.department_ids ? JSON.parse(folder.department_ids) : [],
      is_public: folder.is_public || 0
    });
    setShowFolderSettings(true);
  };

  const handleSaveFolderPermissions = async () => {
    if (!editingFolder) return;
    await fetch(`/api/folders/${editingFolder.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editName,
        role_ids: folderPermissions.role_ids,
        group_ids: folderPermissions.group_ids,
        department_ids: folderPermissions.department_ids,
        is_public: folderPermissions.is_public
      })
    });
    setShowFolderSettings(false);
    setEditingFolder(null);
    fetchFolders();
    showNotification('success', '文件夹权限已更新');
  };

  const togglePermission = (type: 'role' | 'group' | 'department', id: number) => {
    setFolderPermissions(prev => {
      const key = type === 'role' ? 'role_ids' : type === 'group' ? 'group_ids' : 'department_ids';
      const arr = [...prev[key]];
      const idx = arr.indexOf(id);
      if (idx >= 0) arr.splice(idx, 1);
      else arr.push(id);
      return { ...prev, [key]: arr };
    });
  };

  const handleBatchDeleteFiles = async () => {
    showConfirm({
      title: '删除文件',
      message: `确定要删除选中的 ${selectedFiles.length} 个文件吗？`,
      type: 'danger',
      onConfirm: async () => {
        for (const id of selectedFiles) {
          await fetch(`/api/files/${id}`, { method: 'DELETE' });
        }
        setSelectedFiles([]);
        setShowBatchActions(false);
        showNotification('success', '文件已删除');
        fetchFiles(parentId);
      }
    });
  };

  const handleBatchDeleteFolders = async () => {
    showConfirm({
      title: '删除文件夹',
      message: `确定要删除选中的 ${selectedFolders.length} 个文件夹吗？`,
      type: 'danger',
      onConfirm: async () => {
        for (const id of selectedFolders) {
          await fetch(`/api/folders/${id}`, { method: 'DELETE' });
        }
        setSelectedFolders([]);
        fetchFolders();
        showNotification('success', '文件夹已删除');
      }
    });
  };

  const handleMoveFiles = async () => {
    if (selectedFiles.length === 0) {
      showNotification('warning', '请选择要移动的文件');
      return;
    }
    const res = await fetch('/api/files/move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileIds: selectedFiles, folderId: targetFolderId, userId: user?.id })
    });
    const data = await res.json();
    if (data.success) {
      showNotification('success', '文件移动成功');
      setSelectedFiles([]);
      setShowMoveModal(false);
      setTargetFolderId(null);
      fetchFiles(parentId);
    } else {
      showNotification('error', data.message || '移动文件失败');
    }
  };

  const handleMoveFolders = async () => {
    if (selectedFolders.length === 0) {
      showNotification('warning', '请选择要移动的文件夹');
      return;
    }
    const res = await fetch('/api/folders/move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderIds: selectedFolders, targetId: targetFolderId, userId: user?.id })
    });
    const data = await res.json();
    if (data.success) {
      showNotification('success', '文件夹移动成功');
      setSelectedFolders([]);
      setShowFolderMoveModal(false);
      setTargetFolderId(null);
      fetchFolders();
    } else {
      showNotification('error', data.message || '移动文件夹失败');
    }
  };
  
  const detectFileType = (file: File): 'audio' | 'ppt' | 'pdf' | 'image' | 'video' | 'other' => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(ext)) return 'audio';
    if (['ppt', 'pptx', 'key'].includes(ext)) return 'ppt';
    if (['pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx'].includes(ext)) return 'pdf';
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(ext)) return 'image';
    if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) return 'video';
    return 'other';
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      showNotification('warning', '请选择文件');
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('folder_id', parentId?.toString() || '');
    formData.append('uploader_id', user.id.toString());
    formData.append('uploader_name', user.name);
    formData.append('uploader_username', user.username);

    try {
      const res = await fetch('/api/files/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        showNotification('success', '文件上传成功');
        setShowUpload(false);
        setSelectedFile(null);
        fetchFiles(parentId);
      } else {
        showNotification('error', data.message || '上传失败');
      }
    } catch (error) {
      showNotification('error', '上传出错');
    } finally {
      setUploading(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      showNotification('warning', '请输入文件夹名称');
      return;
    }
    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newFolderName, 
          parent_id: parentId,
          owner_id: user.id,
          department_ids: user.department_ids?.length ? user.department_ids : []
        })
      });
      const result = await res.json();
      if (result.success) {
        setNewFolderName('');
        setShowAddFolder(false);
        fetchFolders();
        showNotification('success', '创建文件夹成功');
      } else {
        showNotification('error', result.message || '创建失败');
      }
    } catch (error) {
      showNotification('error', '创建文件夹失败');
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const toggleFileSelection = (id: number) => {
    setSelectedFiles(prev => 
      prev.includes(id) ? prev.filter(fileId => fileId !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold">文件传输</h3>
          <p className="text-slate-500 text-sm">管理学习资源与文件夹</p>
        </div>
        <div className="flex gap-2">
          <div className="relative flex items-center">
            <select
              value={searchType}
              onChange={(e) => { setSearchType(e.target.value as 'all' | 'file' | 'folder' | 'creator'); setCurrentPage(1); }}
              className="px-3 py-2 rounded-l-xl border border-slate-200 border-r-0 text-sm bg-white text-slate-600 outline-none"
            >
              <option value="all">全部</option>
              <option value="file">文件</option>
              <option value="folder">文件夹</option>
              <option value="creator">创建者</option>
            </select>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                placeholder={searchType === 'all' ? '搜索全部...' : searchType === 'file' ? '搜索文件...' : searchType === 'folder' ? '搜索文件夹...' : '输入创建者名称...'}
                className="px-4 py-2 pl-10 pr-4 rounded-r-xl border border-slate-200 text-sm bg-white w-48 focus:w-64 transition-all outline-none focus:border-blue-400"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            </div>
          </div>
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            <button onClick={() => setViewMode('icon')} className={`p-2 rounded-md ${viewMode === 'icon' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
              <Grid size={16} />
            </button>
            <button onClick={() => setViewMode('list')} className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
              <List size={16} />
            </button>
          </div>
          <button 
            onClick={() => setShowAddFolder(true)}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 flex items-center gap-2"
          >
            <FolderPlus size={18} />
            新建文件夹
          </button>
          <button 
            onClick={() => setShowUpload(true)}
            className="px-4 py-2 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 flex items-center gap-2"
          >
            <Upload size={18} />
            上传文件
          </button>
        </div>
      </div>

      {(selectedFiles.length > 0 || selectedFolders.length > 0) && (
        <div className="p-3 bg-blue-50 rounded-xl">
          <p className="text-sm text-blue-600 mb-2">
            已选择 {selectedFiles.length} 个文件，{selectedFolders.length} 个文件夹
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedFiles.length > 0 && (
              <>
                <button onClick={() => setShowMoveModal(true)} className="text-xs bg-blue-100 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-200">移动文件</button>
                <button onClick={handleBatchDeleteFiles} className="text-xs bg-rose-100 text-rose-600 px-3 py-1.5 rounded-lg hover:bg-rose-200">删除文件</button>
                <button 
                  onClick={() => {
                    selectedFiles.forEach(fileId => {
                      const file = files.find(f => f.id === fileId);
                      if (file) {
                        const link = document.createElement('a');
                        link.href = file.file_url;
                        link.download = file.name;
                        link.target = '_blank';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }
                    });
                    showNotification('success', '开始下载文件');
                  }} 
                  className="text-xs bg-green-100 text-green-600 px-3 py-1.5 rounded-lg hover:bg-green-200"
                >
                  批量下载
                </button>
              </>
            )}
            {selectedFolders.length > 0 && (
              <>
                <button onClick={() => setShowFolderMoveModal(true)} className="text-xs bg-blue-100 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-200">移动文件夹</button>
                <button onClick={handleBatchDeleteFolders} className="text-xs bg-rose-100 text-rose-600 px-3 py-1.5 rounded-lg hover:bg-rose-200">删除文件夹</button>
              </>
            )}
            <button onClick={() => { setSelectedFiles([]); setSelectedFolders([]); }} className="text-xs bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-300">清除</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center gap-2 text-sm mb-4">
          {breadcrumb.map((item, idx) => (
            <React.Fragment key={item.id ?? 'root'}>
              {idx > 0 && <ChevronRight size={14} className="text-slate-300" />}
              <button 
                onClick={() => { setParentId(item.id); setCurrentPage(1); }}
                className={`hover:text-blue-600 ${idx === breadcrumb.length - 1 ? 'text-blue-600 font-medium' : 'text-slate-500'}`}
              >
                {item.name}
              </button>
            </React.Fragment>
          ))}
          <span className="ml-auto text-slate-400 text-xs">
            {currentFolders.length} 个文件夹，{currentFiles.length} 个文件
          </span>
        </div>

        <div className="flex gap-2 mb-4">
          <select 
            value={filter}
            onChange={(e) => { setFilter(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm font-medium text-slate-600 outline-none"
          >
            <option value="all">所有类型</option>
            <option value="audio">音频文件</option>
            <option value="ppt">PPT 演示文稿</option>
            <option value="pdf">PDF 文档</option>
            <option value="image">图片资源</option>
            <option value="video">视频文件</option>
            <option value="other">其他</option>
          </select>
          <select 
            value={itemsPerPage}
            onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
            className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm font-medium text-slate-600 outline-none"
          >
            <option value="10">10条/页</option>
            <option value="20">20条/页</option>
            <option value="50">50条/页</option>
            <option value="100">100条/页</option>
          </select>
        </div>

        {currentFolders.length === 0 && displayFiles.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Folder className="text-slate-300" size={32} />
              </div>
              <p className="text-slate-400">当前文件夹为空</p>
              <p className="text-xs text-slate-400 mt-1">可以上传文件或创建子文件夹</p>
            </div>
          ) : viewMode === 'icon' ? (
            <>
              {currentFolders.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-bold text-slate-400 mb-3">文件夹</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {currentFolders.map(folder => (
                      <div 
                        key={folder.id}
                        className="flex flex-col items-center"
                      >
                        <div 
                          className="relative cursor-pointer"
                          onClick={() => { setParentId(folder.id); setCurrentPage(1); }}
                        >
                          <FolderCard 
                            title={folder.name}
                            isSelected={selectedFolders.includes(folder.id)}
                            onSelect={() => toggleFileSelection(folder.id)}
                            onSettings={() => handleOpenFolderSettings(folder)}
                          />
                        </div>
                        <p className="text-sm font-medium text-slate-700 mt-2 truncate max-w-32 text-center">{folder.owner_name || '未知'}</p>
                        <p className="text-xs text-slate-400 truncate max-w-32 text-center">{new Date(folder.created_at).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {displayFiles.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-slate-400 mb-3">文件</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {displayFiles.map(file => (
                      <div key={file.id} className="bg-white rounded-xl border border-slate-200 p-3 hover:shadow-md transition-shadow group relative">
                        <div className="absolute top-2 left-2 z-10">
                          <button onClick={(e) => { e.stopPropagation(); toggleFileSelection(file.id); }}>
                            {selectedFiles.includes(file.id) ? (
                              <CheckCircle2 size={18} className="text-blue-600" />
                            ) : (
                              <Circle size={18} className="text-slate-300" />
                            )}
                          </button>
                        </div>
                        <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <a href={file.file_url} download onClick={(e) => e.stopPropagation()} className="p-1 bg-white rounded shadow hover:bg-slate-50">
                            <Download size={14} className="text-slate-600" />
                          </a>
                          <button onClick={(e) => { e.stopPropagation(); showConfirm({ title: '删除文件', message: '确定要删除这个文件吗？', type: 'danger', onConfirm: async () => { await fetch(`/api/files/${file.id}`, { method: 'DELETE' }); fetchFiles(parentId); showNotification('success', '文件已删除'); }}); }} className="p-1 bg-white rounded shadow hover:bg-slate-50">
                            <Trash size={14} className="text-slate-600" />
                          </button>
                        </div>
                        <div className="aspect-square bg-slate-50 rounded-lg mb-2 flex items-center justify-center">
                          {file.file_type === 'image' ? (
                            <img src={file.file_url} alt={file.name} className="w-full h-full object-cover rounded-lg" />
                          ) : (
                            <FileTypeIcon type={file.file_type} />
                          )}
                        </div>
                        <p className="font-medium text-xs truncate">{file.name}</p>
                        <p className="text-xs text-slate-400">{formatSize(file.file_size)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="w-10 py-3 px-4">
                      <input 
                        type="checkbox"
                        checked={selectedFolders.length > 0 && selectedFolders.length === currentFolders.length && displayFolders.length === currentFolders.length}
                        onChange={() => {
                          if (selectedFolders.length === currentFolders.length) {
                            setSelectedFolders([]);
                          } else {
                            setSelectedFolders(currentFolders.map(f => f.id));
                          }
                        }}
                        className="w-4 h-4"
                      />
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500">名称</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500">类型</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500">大小</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500">创建者</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500">创建时间</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {displayFolders.map(folder => (
                    <tr key={folder.id} className={`border-b border-slate-50 hover:bg-slate-50 ${selectedFolders.includes(folder.id) ? 'bg-blue-50' : ''}`}>
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="checkbox"
                          checked={selectedFolders.includes(folder.id)}
                          onChange={() => {
                            setSelectedFolders(prev => 
                              prev.includes(folder.id) ? prev.filter(id => id !== folder.id) : [...prev, folder.id]
                            );
                          }}
                          className="w-4 h-4"
                        />
                      </td>
                      <td className="py-3 px-4 cursor-pointer" onClick={() => { setParentId(folder.id); setCurrentPage(1); }}>
                        <div className="flex items-center gap-3">
                          <Folder size={18} className="text-amber-500" />
                          <span className="text-sm font-medium">{folder.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-500 cursor-pointer" onClick={() => { setParentId(folder.id); setCurrentPage(1); }}>文件夹</td>
                      <td className="py-3 px-4 text-sm text-slate-500 cursor-pointer" onClick={() => { setParentId(folder.id); setCurrentPage(1); }}>-</td>
                      <td className="py-3 px-4 text-sm text-slate-500 cursor-pointer" onClick={() => { setParentId(folder.id); setCurrentPage(1); }}>{folder.owner_name || '未知'}</td>
                      <td className="py-3 px-4 text-sm text-slate-500 cursor-pointer" onClick={() => { setParentId(folder.id); setCurrentPage(1); }}>{new Date(folder.created_at).toLocaleString()}</td>
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-2">
                          {canManage(user) && (
                            <button onClick={() => handleOpenFolderSettings(folder)} className="text-slate-400 hover:text-blue-500" title="权限设置">
                              <ShieldCheck size={14} />
                            </button>
                          )}
                          {canManage(user) && (
                            <button onClick={() => handleDeleteFolder(folder.id)} className="text-slate-400 hover:text-red-500">
                              <Trash size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {displayFiles.map(file => (
                    <tr key={file.id} className={`border-b border-slate-50 hover:bg-slate-50 ${selectedFiles.includes(file.id) ? 'bg-blue-50' : ''}`}>
                      <td className="py-3 px-4">
                        <input 
                          type="checkbox"
                          checked={selectedFiles.includes(file.id)}
                          onChange={() => {
                            setSelectedFiles(prev => 
                              prev.includes(file.id) ? prev.filter(id => id !== file.id) : [...prev, file.id]
                            );
                          }}
                          className="w-4 h-4"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {file.file_type === 'image' ? (
                            <img src={file.file_url} alt={file.name} className="w-8 h-8 object-cover rounded" />
                          ) : (
                            <FileTypeIcon type={file.file_type} />
                          )}
                          <span className="text-sm font-medium">{file.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-500">{file.file_type}</td>
                      <td className="py-3 px-4 text-sm text-slate-500">{formatSize(file.file_size)}</td>
                      <td className="py-3 px-4 text-sm text-slate-500">{file.uploader_name}</td>
                      <td className="py-3 px-4 text-sm text-slate-500">{new Date(file.upload_time).toLocaleString()}</td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <a href={file.file_url} download className="text-slate-400 hover:text-blue-500">
                            <Download size={14} />
                          </a>
                          {canManage(user) && (
                            <button onClick={() => showConfirm({ title: '删除文件', message: '确定要删除这个文件吗？', type: 'danger', onConfirm: async () => { await fetch(`/api/files/${file.id}`, { method: 'DELETE' }); fetchFiles(parentId); showNotification('success', '文件已删除'); }})} className="text-slate-400 hover:text-red-500">
                              <Trash size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                上一页
              </button>
              <span className="text-sm text-slate-500">{currentPage} / {totalPages}</span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                下一页
              </button>
            </div>
          )}
      </div>

      {showUpload && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold mb-6">上传学习文件</h3>
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:border-blue-300 transition-colors relative">
                <Upload size={40} className="mx-auto text-slate-300 mb-3" />
                {selectedFile ? (
                  <div className="text-sm">
                    <p className="font-medium text-slate-700">{selectedFile.name}</p>
                    <p className="text-xs text-slate-400 mt-1">点击更换文件</p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-slate-500">点击或拖拽文件到此处上传</p>
                    <p className="text-xs text-slate-400 mt-1">支持所有文件类型</p>
                  </>
                )}
                <input 
                  type="file" 
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setSelectedFile(file);
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
              
              {selectedFile && (
                <div className="bg-blue-50 rounded-xl p-3 flex items-center gap-3 mt-4">
                  <FileCheck size={20} className="text-blue-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-700">{selectedFile.name}</p>
                    <p className="text-xs text-blue-400">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
              )}
              
              <div className="flex gap-3 mt-6">
                <button 
                  type="button"
                  onClick={() => { setShowUpload(false); setSelectedFile(null); }}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50"
                  disabled={uploading}
                >
                  取消
                </button>
                <button 
                  type="button"
                  onClick={handleUpload}
                  className="flex-1 px-4 py-3 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-2"
                  disabled={uploading || !selectedFile}
                >
                  {uploading ? (
                    <>上传中...</>
                  ) : (
                    <>
                      <Upload size={18} />
                      上传文件
                    </>
                  )}
                </button>
              </div>
          </div>
        </div>
      )}

      {showMoveModal && selectedFiles.length > 0 && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold mb-6">移动文件</h3>
            <p className="text-sm text-slate-500 mb-4">选择目标文件夹</p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              <button
                onClick={async () => {
                  let hasError = false;
                  for (const fileId of selectedFiles) {
                    const res = await fetch('/api/files/move', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ fileId, folderId: null, userId: user?.id })
                    });
                    const data = await res.json();
                    if (!data.success) {
                      hasError = true;
                      showNotification('error', data.message || '移动文件失败');
                      break;
                    }
                  }
                  if (!hasError) {
                    showNotification('success', '文件移动成功');
                    setShowMoveModal(false);
                    setSelectedFiles([]);
                    fetchFiles(parentId);
                  }
                }}
                className="w-full px-4 py-3 text-left rounded-xl hover:bg-blue-50 flex items-center gap-3"
              >
                <Home size={18} className="text-slate-500" />
                <span>根目录</span>
              </button>
              {folders.filter(f => f.parent_id === parentId).map(folder => (
                <button
                  key={folder.id}
                  onClick={async () => {
                    let hasError = false;
                    for (const fileId of selectedFiles) {
                      const res = await fetch('/api/files/move', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ fileId, folderId: folder.id, userId: user?.id })
                      });
                      const data = await res.json();
                      if (!data.success) {
                        hasError = true;
                        showNotification('error', data.message || '移动文件失败');
                        break;
                      }
                    }
                    if (!hasError) {
                      showNotification('success', '文件移动成功');
                      setShowMoveModal(false);
                      setSelectedFiles([]);
                      fetchFiles(parentId);
                    }
                  }}
                  className="w-full px-4 py-3 text-left rounded-xl hover:bg-blue-50 flex items-center gap-3"
                >
                  <Folder size={18} className="text-blue-500" />
                  <span>{folder.name}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setShowMoveModal(false)} className="w-full mt-4 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50">取消</button>
          </div>
        </div>
      )}

      {showFolderMoveModal && selectedFolders.length > 0 && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold mb-6">移动文件夹</h3>
            <p className="text-sm text-slate-500 mb-4">选择目标位置</p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              <button
                onClick={async () => {
                  let hasError = false;
                  for (const folderId of selectedFolders) {
                    const res = await fetch(`/api/folders/${folderId}?userId=${user?.id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ parentId: null })
                    });
                    const data = await res.json();
                    if (!data.success) {
                      hasError = true;
                      showNotification('error', data.message || '移动文件夹失败');
                      break;
                    }
                  }
                  if (!hasError) {
                    showNotification('success', '文件夹移动成功');
                    setShowFolderMoveModal(false);
                    setSelectedFolders([]);
                    fetchFolders();
                  }
                }}
                className="w-full px-4 py-3 text-left rounded-xl hover:bg-blue-50 flex items-center gap-3"
              >
                <Home size={18} className="text-slate-500" />
                <span>根目录</span>
              </button>
              {folders.filter(f => f.parent_id === parentId && !selectedFolders.includes(f.id)).map(folder => (
                <button
                  key={folder.id}
                  onClick={async () => {
                    let hasError = false;
                    for (const folderId of selectedFolders) {
                      const res = await fetch(`/api/folders/${folderId}?userId=${user?.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ parentId: folder.id })
                      });
                      const data = await res.json();
                      if (!data.success) {
                        hasError = true;
                        showNotification('error', data.message || '移动文件夹失败');
                        break;
                      }
                    }
                    if (!hasError) {
                      showNotification('success', '文件夹移动成功');
                      setShowFolderMoveModal(false);
                      setSelectedFolders([]);
                      fetchFolders();
                    }
                  }}
                  className="w-full px-4 py-3 text-left rounded-xl hover:bg-blue-50 flex items-center gap-3"
                >
                  <Folder size={18} className="text-blue-500" />
                  <span>{folder.name}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setShowFolderMoveModal(false)} className="w-full mt-4 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50">取消</button>
          </div>
        </div>
      )}

      {showAddFolder && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold mb-6">新建文件夹</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">文件夹名称</label>
                <input 
                  type="text" 
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none"
                  placeholder="请输入文件夹名称"
                />
              </div>
              <div className="flex gap-3 mt-8">
                <button type="button" onClick={() => setShowAddFolder(false)} className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50">取消</button>
                <button type="button" onClick={handleCreateFolder} className="flex-1 px-4 py-3 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600">创建</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingFolder && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold mb-6">重命名文件夹</h3>
            <form onSubmit={handleUpdateFolder} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">文件夹名称</label>
                <input 
                  type="text" 
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none"
                  required
                />
              </div>
              <div className="flex gap-3 mt-8">
                <button type="button" onClick={() => setEditingFolder(null)} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-medium">取消</button>
                <button type="submit" className="flex-1 px-4 py-2 rounded-xl bg-blue-500 text-white font-medium">保存</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showFolderSettings && editingFolder && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-6">文件夹权限设置</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">文件夹名称</label>
                <input 
                  type="text" 
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  disabled={!canManage(user)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none disabled:opacity-60"
                />
              </div>
              
              <div>
                <label className={`flex items-center gap-2 ${!canManage(user) ? 'cursor-not-allowed' : 'cursor-pointer'} opacity-60`}>
                  <input 
                    type="checkbox"
                    checked={folderPermissions.is_public === 1}
                    onChange={(e) => setFolderPermissions(prev => ({ ...prev, is_public: e.target.checked ? 1 : 0 }))}
                    disabled={!canManage(user)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">公开文件夹（所有用户可见）</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">可见角色</label>
                <div className="flex flex-wrap gap-2">
                  {roles.map(role => (
                    <button
                      key={role.id}
                      onClick={() => canManage(user) && togglePermission('role', role.id)}
                      disabled={!canManage(user)}
                      className={`px-3 py-1.5 rounded-lg text-sm ${folderPermissions.role_ids.includes(role.id) ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'} disabled:cursor-not-allowed`}
                    >
                      {role.description || role.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">可见部门</label>
                <MultiSelect
                  options={departments.map(d => ({ id: String(d.id), name: d.name }))}
                  selected={folderPermissions.department_ids}
                  onChange={canManage(user) ? (selected) => setFolderPermissions(prev => ({ ...prev, department_ids: selected })) : undefined}
                  disabled={!canManage(user)}
                  placeholder="选择可见部门"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">可见小组</label>
                <MultiSelect
                  options={groups.map(g => ({ id: String(g.id), name: g.name }))}
                  selected={folderPermissions.group_ids}
                  onChange={canManage(user) ? (selected) => setFolderPermissions(prev => ({ ...prev, group_ids: selected })) : undefined}
                  disabled={!canManage(user)}
                  placeholder="选择可见小组"
                />
              </div>

              <div className="flex gap-3 mt-8">
                <button type="button" onClick={() => { setShowFolderSettings(false); setEditingFolder(null); }} className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50">取消</button>
                {canManage(user) && (
                  <button type="button" onClick={handleSaveFolderPermissions} className="flex-1 px-4 py-3 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600">保存</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DepartmentsView({ user, showConfirm, showNotification }: { user: User; showConfirm: any; showNotification: any }) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [newDept, setNewDept] = useState({ name: '', description: '' });

  const fetchDepartments = async () => {
    const res = await fetch('/api/departments');
    const data = await res.json();
    setDepartments(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleCreate = async () => {
    if (!newDept.name.trim()) return;
    await fetch('/api/departments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newDept)
    });
    showNotification('success', '部门创建成功');
    setNewDept({ name: '', description: '' });
    setShowAdd(false);
    fetchDepartments();
  };

  const handleUpdate = async () => {
    if (!editingDept || !editingDept.name.trim()) return;
    await fetch(`/api/departments/${editingDept.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingDept)
    });
    showNotification('success', '部门更新成功');
    setEditingDept(null);
    fetchDepartments();
  };

  const handleDelete = async (id: number) => {
    showConfirm({
      title: '删除部门',
      message: '确定要删除这个部门吗？',
      type: 'danger',
      onConfirm: async () => {
        await fetch(`/api/departments/${id}`, { method: 'DELETE' });
        showNotification('success', '部门已删除');
        fetchDepartments();
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">部门管理</h2>
          <p className="text-slate-500">管理系统中的部门</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 flex items-center gap-2">
          <Plus size={18} />
          新增部门
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500">部门名称</th>
              <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500">描述</th>
              <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500">操作</th>
            </tr>
          </thead>
          <tbody>
            {departments.map(dept => (
              <tr key={dept.id} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Building size={20} className="text-blue-600" />
                    </div>
                    <span className="font-medium">{dept.name}</span>
                  </div>
                </td>
                <td className="py-4 px-6 text-slate-500">{dept.description || '-'}</td>
                <td className="py-4 px-6">
                  <div className="flex gap-2">
                    {canManage(user) && (
                      <button onClick={() => setEditingDept(dept)} className="text-slate-400 hover:text-blue-500">
                        <Edit size={16} />
                      </button>
                    )}
                    {canManage(user) && (
                      <button onClick={() => handleDelete(dept.id)} className="text-slate-400 hover:text-red-500">
                        <Trash size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="新增部门" disableAnimation>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">部门名称</label>
            <input
              type="text"
              value={newDept.name}
              onChange={(e) => setNewDept({ ...newDept, name: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
              placeholder="请输入部门名称"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">描述</label>
            <input
              type="text"
              value={newDept.description}
              onChange={(e) => setNewDept({ ...newDept, description: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
              placeholder="请输入描述"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowAdd(false)} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-slate-600">取消</button>
            <button onClick={handleCreate} className="flex-1 px-4 py-2 rounded-xl bg-blue-500 text-white">创建</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!editingDept} onClose={() => setEditingDept(null)} title="编辑部门" disableAnimation>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">部门名称</label>
            <input
              type="text"
              value={editingDept?.name || ''}
              onChange={(e) => setEditingDept({ ...editingDept!, name: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">描述</label>
            <input
              type="text"
              value={editingDept?.description || ''}
              onChange={(e) => setEditingDept({ ...editingDept!, description: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setEditingDept(null)} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-slate-600">取消</button>
            <button onClick={handleUpdate} className="flex-1 px-4 py-2 rounded-xl bg-blue-500 text-white">保存</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function GroupsView({ user, showConfirm, showNotification }: { user: User; showConfirm: any; showNotification: any }) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [editingMembers, setEditingMembers] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: '', department_id: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [memberSearchTerm, setMemberSearchTerm] = useState('');

  const isAdmin = user.effective_role === 'admin' || user.role === 'admin' || user.permissions?.includes('manage_users');

  const fetchGroups = async () => {
    const res = await fetch('/api/groups');
    const data = await res.json();
    const groupsData = Array.isArray(data) ? data : [];
    setAllGroups(groupsData);
    setGroups(groupsData);
  };

  const fetchDepartments = async () => {
    const res = await fetch('/api/departments');
    const data = await res.json();
    setDepartments(Array.isArray(data) ? data : []);
  };

  const fetchUsers = async () => {
    const res = await fetch('/api/users');
    const data = await res.json();
    setUsers(Array.isArray(data) ? data : []);
  };

  const fetchGroupUsers = async (groupId: number) => {
    try {
      const res = await fetch(`/api/groups/${groupId}/users`);
      const data = await res.json();
      return data.map((u: any) => u.id) || [];
    } catch {
      return [];
    }
  };

  useEffect(() => {
    fetchGroups();
    fetchDepartments();
    fetchUsers();
  }, []);

  useEffect(() => {
    let filtered = [...allGroups];
    if (searchTerm) {
      filtered = filtered.filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (filterDept) {
      filtered = filtered.filter(g => g.department_id === parseInt(filterDept));
    }
    setGroups(filtered);
    setCurrentPage(1);
  }, [searchTerm, filterDept, allGroups]);

  const paginatedGroups = groups.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalPages = Math.ceil(groups.length / pageSize);

  const handleCreate = async () => {
    if (!newGroup.name.trim()) return;
    const deptId = newGroup.department_id ? parseInt(newGroup.department_id) : null;
    
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newGroup.name, department_id: deptId })
    });
    const result = await res.json();
    
    if (result.success && deptId) {
      const usersRes = await fetch('/api/users');
      const usersData = await usersRes.json();
      const sameDeptUsers = (usersData || []).filter((u: any) => {
        const userDepts = u.department_ids || [];
        return userDepts.includes(deptId);
      });
      if (sameDeptUsers.length > 0) {
        await fetch(`/api/groups/${result.id}/members`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_ids: sameDeptUsers.map((u: any) => u.id) })
        });
      }
      showNotification('success', `小组创建成功，已自动分配 ${sameDeptUsers.length} 名同部门成员`);
    } else {
      showNotification('success', '小组创建成功');
    }
    setNewGroup({ name: '', department_id: '' });
    setShowAdd(false);
    fetchGroups();
  };

  const handleUpdate = async () => {
    if (!editingGroup) return;
    await fetch(`/api/groups/${editingGroup.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editingGroup.name, department_id: editingGroup.department_id || null })
    });
    showNotification('success', '分组更新成功');
    setEditingGroup(null);
    fetchGroups();
  };

  const handleDelete = async (id: number) => {
    showConfirm({
      title: '删除分组',
      message: '确定要删除这个分组吗？',
      type: 'danger',
      onConfirm: async () => {
        await fetch(`/api/groups/${id}`, { method: 'DELETE' });
        showNotification('success', '分组已删除');
        fetchGroups();
      }
    });
  };

  const [groupMemberIds, setGroupMemberIds] = useState<number[]>([]);

  const handleOpenMembers = async (group: Group) => {
    setEditingGroup(group);
    setEditingMembers(true);
    const memberIds = await fetchGroupUsers(group.id);
    setGroupMemberIds(memberIds);
  };

  const handleSaveMembers = async () => {
    if (!editingGroup) return;
    await fetch(`/api/groups/${editingGroup.id}/members`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_ids: groupMemberIds })
    });
    showNotification('success', '成员更新成功');
    setEditingMembers(false);
    setEditingGroup(null);
    fetchGroups();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">小组管理</h2>
          <p className="text-slate-500">管理系统中的小组</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowAdd(true)} className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 flex items-center gap-2">
            <Plus size={18} />
            新增小组
          </button>
        )}
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="搜索小组名称..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500"
          />
        </div>
        <select
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
          className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500"
        >
          <option value="">全部部门</option>
          {departments.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500">小组名称</th>
              <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500">所属部门</th>
              <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500">成员数</th>
              {isAdmin && <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500">操作</th>}
            </tr>
          </thead>
          <tbody>
            {paginatedGroups.map(group => (
              <tr key={group.id} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Layers size={20} className="text-green-600" />
                    </div>
                    <span className="font-medium">{group.name}</span>
                  </div>
                </td>
                <td className="py-4 px-6 text-slate-500">{group.department_name || '-'}</td>
                <td className="py-4 px-6 text-slate-500">
                  {group.member_count !== undefined ? `${group.member_count} 人` : '-'}
                </td>
                {isAdmin && (
                  <td className="py-4 px-6">
                    <div className="flex gap-2">
                      <button onClick={() => handleOpenMembers(group)} className="text-slate-400 hover:text-green-500" title="管理成员">
                        <Users size={16} />
                      </button>
                      <button onClick={() => setEditingGroup(group)} className="text-slate-400 hover:text-blue-500">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => handleDelete(group.id)} className="text-slate-400 hover:text-red-500">
                        <Trash size={16} />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
            <p className="text-sm text-slate-500">显示 {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, groups.length)} / {groups.length} 条</p>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                上一页
              </button>
              <span className="px-3 py-1.5 text-sm">{currentPage} / {totalPages}</span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="新增小组" disableAnimation>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">小组名称</label>
            <input
              type="text"
              value={newGroup.name}
              onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
              placeholder="请输入小组名称"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">所属部门</label>
            <select
              value={newGroup.department_id}
              onChange={(e) => setNewGroup({ ...newGroup, department_id: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
            >
              <option value="">请选择部门</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowAdd(false)} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-slate-600">取消</button>
            <button onClick={handleCreate} className="flex-1 px-4 py-2 rounded-xl bg-blue-500 text-white">创建</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!editingGroup && !editingMembers} onClose={() => setEditingGroup(null)} title="编辑小组" disableAnimation>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">小组名称</label>
            <input
              type="text"
              value={editingGroup?.name || ''}
              onChange={(e) => setEditingGroup({ ...editingGroup!, name: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">所属部门</label>
            <select
              value={editingGroup?.department_id || ''}
              onChange={(e) => setEditingGroup({ ...editingGroup!, department_id: parseInt(e.target.value) || null })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
            >
              <option value="">请选择部门</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setEditingGroup(null)} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-slate-600">取消</button>
            <button onClick={handleUpdate} className="flex-1 px-4 py-2 rounded-xl bg-blue-500 text-white">保存</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={editingMembers} onClose={() => { setEditingMembers(false); setEditingGroup(null); setMemberSearchTerm(''); }} title={`管理小组 "${editingGroup?.name}" 的成员`} disableAnimation>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-2">选择成员（可多选，仅显示同部门用户）</label>
            <div className="relative mb-2">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="搜索用户姓名或用户名..."
                value={memberSearchTerm}
                onChange={(e) => setMemberSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500"
              />
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {(() => {
                const groupDeptId = editingGroup?.department_id;
                let eligibleUsers = users.filter(u => {
                  if (!groupDeptId) return true;
                  const userDepts = u.department_ids || [];
                  return userDepts.includes(groupDeptId);
                });
                if (memberSearchTerm) {
                  const term = memberSearchTerm.toLowerCase();
                  eligibleUsers = eligibleUsers.filter(u => 
                    u.name.toLowerCase().includes(term) || 
                    u.username.toLowerCase().includes(term)
                  );
                }
                if (eligibleUsers.length === 0) {
                  return <p className="text-slate-400 text-sm py-4 text-center">
                    {memberSearchTerm ? '未找到匹配的用户' : '暂无同部门用户'}
                  </p>;
                }
                const allSelected = eligibleUsers.every(u => groupMemberIds.includes(u.id));
                const someSelected = eligibleUsers.some(u => groupMemberIds.includes(u.id));
                return (
                  <>
                    <label className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 font-medium cursor-pointer border-b border-slate-200">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => { if (el) el.indeterminate = !allSelected && someSelected; }}
                        onChange={(e) => {
                          if (e.target.checked) {
                            const newIds = [...new Set([...groupMemberIds, ...eligibleUsers.map(u => u.id)])];
                            setGroupMemberIds(newIds);
                          } else {
                            const idsToRemove = new Set(eligibleUsers.map(u => u.id));
                            setGroupMemberIds(groupMemberIds.filter(id => !idsToRemove.has(id)));
                          }
                        }}
                        className="w-4 h-4 rounded border-slate-300"
                      />
                      <span>全选 / 取消全选</span>
                    </label>
                    {eligibleUsers.map(u => (
                      <label key={u.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={groupMemberIds.includes(u.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setGroupMemberIds([...groupMemberIds, u.id]);
                            } else {
                              setGroupMemberIds(groupMemberIds.filter(id => id !== u.id));
                            }
                          }}
                          className="w-4 h-4 rounded border-slate-300"
                        />
                        <img src={u.avatar_url || u.avatar} alt={u.name} className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                        <div>
                          <p className="font-medium">{u.name}</p>
                          <p className="text-xs text-slate-500">{u.department_names || u.username}</p>
                        </div>
                      </label>
                    ))}
                  </>
                );
              })()}
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => { setEditingMembers(false); setEditingGroup(null); setMemberSearchTerm(''); }} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-slate-600">取消</button>
            <button onClick={handleSaveMembers} className="flex-1 px-4 py-2 rounded-xl bg-blue-500 text-white">保存</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function AccountsView({ user, showConfirm, showNotification, onUserUpdate }: { user: User; showConfirm: any; showNotification: any; onUserUpdate?: (user: User) => void }) {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState({ 
    username: '', password: '', name: '', role: 'member', 
    department_ids: [] as string[], role_ids: [] as string[], group_ids: [] as string[], avatar: '' 
  });
  const isAdmin = user.effective_role === 'admin' || user.role === 'admin' || user.permissions?.includes('manage_users');

  const fetchUsers = async () => {
    const res = await fetch('/api/users');
    const data = await res.json();
    setUsers(Array.isArray(data) ? data : []);
  };

  const fetchDepartments = async () => {
    const res = await fetch('/api/departments');
    const data = await res.json();
    setDepartments(Array.isArray(data) ? data : []);
  };

  const fetchGroups = async () => {
    const res = await fetch('/api/groups');
    const data = await res.json();
    setGroups(Array.isArray(data) ? data : []);
  };

  const fetchRoles = async () => {
    const res = await fetch('/api/roles');
    const data = await res.json();
    setRoles(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    fetchUsers();
    fetchDepartments();
    fetchGroups();
    fetchRoles();
  }, []);

  const handleCreate = async () => {
    if (!newUser.username || !newUser.password || !newUser.name) {
      showNotification('warning', '请填写必填项');
      return;
    }
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newUser,
        department_ids: newUser.department_ids.map(id => parseInt(id)),
        role_ids: newUser.role_ids.map(id => parseInt(id)),
        group_ids: newUser.group_ids.map(id => parseInt(id))
      })
    });
    const result = await res.json();
    if (result.success) {
      showNotification('success', '用户创建成功');
      setNewUser({ username: '', password: '', name: '', role: 'member', department_ids: [], role_ids: [], group_ids: [], avatar: '' });
      setShowAdd(false);
      fetchUsers();
    } else {
      showNotification('error', result.message || '创建用户失败');
    }
  };

  const handleUpdate = async () => {
    if (!editingUser) return;
    const deptIds = Array.isArray(editingUser.department_ids) 
      ? editingUser.department_ids.map(id => parseInt(String(id))) 
      : [];
    const roleIds = Array.isArray(editingUser.role_ids) 
      ? editingUser.role_ids.map(id => parseInt(String(id))) 
      : [];
    const groupIds = Array.isArray(editingUser.group_ids) 
      ? editingUser.group_ids.map(id => parseInt(String(id))) 
      : [];
    const res = await fetch(`/api/users/${editingUser.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: editingUser.username,
        name: editingUser.name,
        password: editingUser.password,
        role: editingUser.role,
        department_ids: deptIds,
        role_ids: roleIds,
        group_ids: groupIds,
        avatar_url: editingUser.avatar
      })
    });
    const result = await res.json();
    if (result.success) {
      showNotification('success', '用户更新成功');
      if (editingUser.id === user.id && onUserUpdate) {
        const updatedUser = { 
          ...user, 
          avatar: editingUser.avatar, 
          avatar_url: editingUser.avatar_url || editingUser.avatar 
        };
        onUserUpdate(updatedUser);
      }
      setEditingUser(null);
      fetchUsers();
    } else {
      showNotification('error', result.message || '更新失败');
    }
  };

  const handleDelete = async (id: number) => {
    showConfirm({
      title: '删除用户',
      message: '确定要删除这个用户吗？',
      type: 'danger',
      onConfirm: async () => {
        await fetch(`/api/users/${id}`, { method: 'DELETE' });
        showNotification('success', '用户已删除');
        fetchUsers();
      }
    });
  };

  const handleAvatarChange = (avatar: string, avatarUrl?: string) => {
    if (editingUser) {
      setEditingUser({ ...editingUser, avatar, avatar_url: avatarUrl || avatar });
    } else {
      setNewUser({ ...newUser, avatar, avatar_url: avatarUrl || avatar });
    }
  };

  const openEditModal = (u: User) => {
    setEditingUser({
      ...u,
      department_ids: (u.department_ids || []),
      role_ids: (u.role_ids || []),
      group_ids: (u.group_ids || []),
      password: ''
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">用户管理</h2>
          <p className="text-slate-500">管理系统中的用户</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowAdd(true)} className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 flex items-center gap-2">
            <Plus size={18} />
            新增用户
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500">用户</th>
              <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500">用户名</th>
              <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500">角色</th>
              <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500">部门</th>
              <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500">小组</th>
              <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500">操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    <img src={u.avatar_url || u.avatar} alt={u.name} className="w-10 h-10 rounded-full object-cover" referrerPolicy="no-referrer" />
                    <span className="font-medium">{u.name}</span>
                  </div>
                </td>
                <td className="py-4 px-6 text-slate-500">{u.username}</td>
                <td className="py-4 px-6">
                  <div className="flex flex-wrap gap-1">
                    {u.role_names?.map((name, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded text-xs font-medium">
                        {name}
                      </span>
                    )) || <span className="px-2 py-0.5 bg-green-100 text-green-600 rounded text-xs font-medium">{u.role}</span>}
                  </div>
                </td>
                <td className="py-4 px-6 text-slate-500 text-sm">{u.department_names || '-'}</td>
                <td className="py-4 px-6 text-slate-500 text-sm">{u.group_names || '-'}</td>
                <td className="py-4 px-6">
                  <div className="flex gap-2">
                    {isAdmin && (
                      <button onClick={() => openEditModal(u)} className="text-slate-400 hover:text-blue-500">
                        <Edit size={16} />
                      </button>
                    )}
                    {isAdmin && (
                      <button onClick={() => handleDelete(u.id)} className="text-slate-400 hover:text-red-500">
                        <Trash size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="新增用户" disableAnimation>
        <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-2">
          <AvatarSelect 
            value={newUser.avatar} 
            onChange={handleAvatarChange} 
          />
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">用户名 *</label>
            <input type="text" value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" placeholder="请输入用户名" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">密码 *</label>
            <input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" placeholder="请输入密码" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">姓名 *</label>
            <input type="text" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" placeholder="请输入姓名" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">角色（可多选）</label>
            <MultiSelect
              options={roles.map(r => ({ id: String(r.id), name: r.description || r.name }))}
              selected={newUser.role_ids}
              onChange={(selected) => setNewUser({ ...newUser, role_ids: selected })}
              placeholder="选择角色"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">部门（可多选）</label>
            <MultiSelect
              options={departments.map(d => ({ id: String(d.id), name: d.name }))}
              selected={newUser.department_ids}
              onChange={(selected) => setNewUser({ ...newUser, department_ids: selected })}
              placeholder="选择部门"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">小组（可多选）</label>
            <MultiSelect
              options={groups.map(g => ({ id: String(g.id), name: `${g.name} (${g.department_name || '未分配部门'})` }))}
              selected={newUser.group_ids}
              onChange={(selected) => setNewUser({ ...newUser, group_ids: selected })}
              placeholder="选择小组"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowAdd(false)} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-slate-600">取消</button>
            <button onClick={handleCreate} className="flex-1 px-4 py-2 rounded-xl bg-blue-500 text-white">创建</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!editingUser} onClose={() => setEditingUser(null)} title="编辑用户" disableAnimation>
        <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-2">
          <AvatarSelect 
            value={editingUser?.avatar || ''} 
            onChange={handleAvatarChange} 
          />
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">用户名</label>
            <input type="text" value={editingUser?.username || ''} onChange={(e) => setEditingUser({ ...editingUser!, username: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">新密码（留空不修改）</label>
            <input type="password" value={editingUser?.password || ''} onChange={(e) => setEditingUser({ ...editingUser!, password: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">姓名</label>
            <input type="text" value={editingUser?.name || ''} onChange={(e) => setEditingUser({ ...editingUser!, name: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">角色（可多选）</label>
            <MultiSelect
              options={roles.map(r => ({ id: String(r.id), name: r.description || r.name }))}
              selected={editingUser?.role_ids?.map(String) || []}
              onChange={isAdmin ? (selected) => setEditingUser({ ...editingUser!, role_ids: selected.map(s => parseInt(s)) }) : undefined}
              disabled={!isAdmin}
              placeholder="选择角色"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">部门（可多选）</label>
            <MultiSelect
              options={departments.map(d => ({ id: String(d.id), name: d.name }))}
              selected={editingUser?.department_ids?.map(String) || []}
              onChange={isAdmin ? (selected) => setEditingUser({ ...editingUser!, department_ids: selected.map(s => parseInt(s)) }) : undefined}
              disabled={!isAdmin}
              placeholder="选择部门"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">小组（可多选）</label>
            <MultiSelect
              options={groups.map(g => ({ id: String(g.id), name: `${g.name} (${g.department_name || '未分配部门'})` }))}
              selected={editingUser?.group_ids?.map(String) || []}
              onChange={isAdmin ? (selected) => setEditingUser({ ...editingUser!, group_ids: selected.map(s => parseInt(s)) }) : undefined}
              disabled={!isAdmin}
              placeholder="选择小组"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setEditingUser(null)} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-slate-600">取消</button>
            <button onClick={handleUpdate} className="flex-1 px-4 py-2 rounded-xl bg-blue-500 text-white">保存</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function RolesView({ user, showConfirm, showNotification }: { user: User; showConfirm: any; showNotification: any }) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [newRole, setNewRole] = useState({ name: '', description: '', permissions: [] as string[] });
  const isAdmin = user.effective_role === 'admin' || user.role === 'admin' || user.permissions?.includes('manage_roles');

  const permissionLabels: Record<string, string> = {
    view_dashboard: '查看仪表盘',
    manage_departments: '部门管理',
    manage_users: '用户管理',
    manage_groups: '分组管理',
    manage_folders: '文件夹管理',
    manage_files: '文件管理',
    manage_roles: '角色管理',
    manage_settings: '系统设置',
    upload_files: '上传文件',
    download_files: '下载文件',
    view_folders: '查看文件夹',
    manage_own_department: '管理部门',
    manage_own_groups: '管理小组',
    manage_own_folders: '管理文件夹',
    access_files: '访问文件',
  };

  const allPermissions = [
    { id: 'view_dashboard', label: '查看仪表盘' },
    { id: 'manage_departments', label: '部门管理' },
    { id: 'manage_users', label: '用户管理' },
    { id: 'manage_groups', label: '分组管理' },
    { id: 'manage_folders', label: '文件夹管理' },
    { id: 'manage_files', label: '文件管理' },
    { id: 'manage_roles', label: '角色管理' },
    { id: 'manage_settings', label: '系统设置' },
    { id: 'upload_files', label: '上传文件' },
    { id: 'download_files', label: '下载文件' },
    { id: 'view_folders', label: '查看文件夹' },
  ];

  const fetchRoles = async () => {
    const res = await fetch('/api/roles');
    const data = await res.json();
    setRoles(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleCreate = async () => {
    if (!newRole.name.trim()) return;
    await fetch('/api/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRole)
    });
    showNotification('success', '角色创建成功');
    setNewRole({ name: '', description: '', permissions: [] });
    setShowAdd(false);
    fetchRoles();
  };

  const handleUpdate = async () => {
    if (!editingRole) return;
    await fetch(`/api/roles/${editingRole.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingRole)
    });
    showNotification('success', '角色更新成功');
    setEditingRole(null);
    fetchRoles();
  };

  const handleDelete = async (id: number) => {
    showConfirm({
      title: '删除角色',
      message: '确定要删除这个角色吗？',
      type: 'danger',
      onConfirm: async () => {
        await fetch(`/api/roles/${id}`, { method: 'DELETE' });
        showNotification('success', '角色已删除');
        fetchRoles();
      }
    });
  };

  const togglePermission = (role: 'new' | 'edit', permId: string) => {
    const setter = role === 'new' ? setNewRole : setEditingRole;
    const current = role === 'new' ? newRole.permissions : editingRole?.permissions || [];
    setter((prev: any) => ({
      ...prev,
      permissions: current.includes(permId)
        ? current.filter((p: string) => p !== permId)
        : [...current, permId]
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">角色管理</h2>
          <p className="text-slate-500">管理系统中的角色和权限</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowAdd(true)} className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 flex items-center gap-2">
            <Plus size={18} />
            新增角色
          </button>
        )}
      </div>

      <div className="grid gap-4">
        {roles.map(role => (
          <div key={role.id} className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="font-bold text-lg">{role.description || role.name}</h4>
                <p className="text-slate-500 text-sm">{role.name}</p>
              </div>
              {isAdmin && (
                <div className="flex gap-2">
                  <button onClick={() => setEditingRole(role)} className="text-slate-400 hover:text-blue-500">
                    <Edit size={16} />
                  </button>
                  <button onClick={() => handleDelete(role.id)} className="text-slate-400 hover:text-red-500">
                    <Trash size={16} />
                  </button>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {role.permissions.map(p => (
                <span key={p} className="px-2 py-1 bg-blue-100 text-blue-600 rounded-lg text-xs">{permissionLabels[p] || p}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="新增角色" disableAnimation>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">角色名称</label>
            <input type="text" value={newRole.name} onChange={(e) => setNewRole({ ...newRole, name: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" placeholder="如: manager" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">描述</label>
            <input type="text" value={newRole.description} onChange={(e) => setNewRole({ ...newRole, description: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" placeholder="如: 部门管理员" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-2">权限</label>
            <div className="flex flex-wrap gap-2">
              {allPermissions.map(perm => (
                <button key={perm.id} onClick={() => togglePermission('new', perm.id)} className={`px-3 py-1.5 rounded-lg text-sm ${newRole.permissions.includes(perm.id) ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {newRole.permissions.includes(perm.id) && <Check size={14} className="inline mr-1" />}
                  {perm.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowAdd(false)} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-slate-600">取消</button>
            <button onClick={handleCreate} className="flex-1 px-4 py-2 rounded-xl bg-blue-500 text-white">创建</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!editingRole} onClose={() => setEditingRole(null)} title="编辑角色" disableAnimation>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">角色名称</label>
            <input type="text" value={editingRole?.name || ''} onChange={(e) => setEditingRole({ ...editingRole!, name: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">描述</label>
            <input type="text" value={editingRole?.description || ''} onChange={(e) => setEditingRole({ ...editingRole!, description: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-2">权限</label>
            <div className="flex flex-wrap gap-2">
              {allPermissions.map(perm => (
                <button key={perm.id} onClick={() => togglePermission('edit', perm.id)} className={`px-3 py-1.5 rounded-lg text-sm ${editingRole?.permissions.includes(perm.id) ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {editingRole?.permissions.includes(perm.id) && <Check size={14} className="inline mr-1" />}
                  {perm.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setEditingRole(null)} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-slate-600">取消</button>
            <button onClick={handleUpdate} className="flex-1 px-4 py-2 rounded-xl bg-blue-500 text-white">保存</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function SettingsView({ showNotification, siteSettings, setSiteSettings }: { showNotification: any; siteSettings: any; setSiteSettings: any }) {
  const [form, setForm] = useState(siteSettings);

  useEffect(() => {
    setForm(siteSettings);
  }, [siteSettings]);

  const handleSave = async () => {
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    setSiteSettings(form);
    document.documentElement.style.setProperty('--color-primary', form.theme_color);
    showNotification('success', '设置已保存');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">系统设置</h2>
        <p className="text-slate-500">配置系统基本信息</p>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-xl space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">系统名称</label>
          <input type="text" value={form.site_name} onChange={(e) => setForm({ ...form, site_name: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">副标题</label>
          <input type="text" value={form.site_subtitle} onChange={(e) => setForm({ ...form, site_subtitle: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">主题颜色</label>
          <div className="flex gap-3">
            <input type="color" value={form.theme_color} onChange={(e) => setForm({ ...form, theme_color: e.target.value })} className="w-12 h-12 rounded-xl border border-slate-200 cursor-pointer" />
            <input type="text" value={form.theme_color} onChange={(e) => setForm({ ...form, theme_color: e.target.value })} className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
          </div>
        </div>
        <button onClick={handleSave} className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600">保存设置</button>
      </div>
    </div>
  );
}

function OrganizationView({ user, showNotification }: { user: User; showNotification: any }) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [myOrg, setMyOrg] = useState<{ departments: Department[]; groups: any[]; roles: Role[] } | null>(null);
  const isAdmin = user.effective_role === 'admin' || user.role === 'admin' || user.permissions.includes('manage_departments');

  useEffect(() => {
    fetchDepartments();
    fetchGroups();
    fetchMyOrganization();
  }, []);

  const fetchDepartments = async () => {
    const res = await fetch('/api/departments');
    const data = await res.json();
    const allDepts = Array.isArray(data) ? data : [];
    if (isAdmin) {
      setDepartments(allDepts);
    } else {
      const userDeptIds = user.department_ids || [];
      setDepartments(allDepts.filter(d => userDeptIds.includes(d.id)));
    }
  };

  const fetchGroups = async () => {
    const res = await fetch('/api/groups');
    const data = await res.json();
    const allGroups = Array.isArray(data) ? data : [];
    if (isAdmin) {
      setGroups(allGroups);
    } else {
      const userGroupIds = user.group_ids || [];
      setGroups(allGroups.filter(g => userGroupIds.includes(g.id)));
    }
  };

  const fetchMyOrganization = async () => {
    try {
      const res = await fetch(`/api/my-organization?userId=${user.id}`);
      const data = await res.json();
      if (data.success) {
        setMyOrg({
          departments: data.departments || [],
          groups: data.groups || [],
          roles: data.roles || []
        });
      }
    } catch (e) {
      console.error('Failed to fetch organization:', e);
    }
  };

  const getGroupsByDepartment = (deptId: number) => {
    return groups.filter(g => g.department_id === deptId);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">组织架构</h2>
        <p className="text-slate-500">查看公司部门结构和我的归属</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
            <img src={user.avatar_url || user.avatar} alt={user.name} className="w-6 h-6 rounded-full object-cover" referrerPolicy="no-referrer" />
          </div>
          我的归属
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs font-medium text-slate-400 uppercase mb-2">部门</p>
            <div className="space-y-1">
              {myOrg?.departments.map(dept => (
                <div key={dept.id} className="flex items-center gap-2">
                  <Building size={16} className="text-blue-500" />
                  <span className="font-medium text-slate-700">{dept.name}</span>
                </div>
              ))}
              {(!myOrg?.departments || myOrg.departments.length === 0) && (
                <p className="text-slate-400 text-sm">未分配部门</p>
              )}
            </div>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs font-medium text-slate-400 uppercase mb-2">小组</p>
            <div className="space-y-1">
              {myOrg?.groups.map(group => (
                <div key={group.id} className="flex items-center gap-2">
                  <Layers size={16} className="text-green-500" />
                  <span className="font-medium text-slate-700">{group.name}</span>
                  {group.department_name && (
                    <span className="text-xs text-slate-400">({group.department_name})</span>
                  )}
                </div>
              ))}
              {(!myOrg?.groups || myOrg.groups.length === 0) && (
                <p className="text-slate-400 text-sm">未分配小组</p>
              )}
            </div>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs font-medium text-slate-400 uppercase mb-2">角色</p>
            <div className="space-y-1">
              {myOrg?.roles.map(role => (
                <div key={role.id} className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-purple-500" />
                  <span className="font-medium text-slate-700">{role.description || role.name}</span>
                </div>
              ))}
              {(!myOrg?.roles || myOrg.roles.length === 0) && (
                <p className="text-slate-400 text-sm">未分配角色</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Building size={20} className="text-blue-500" />
            部门列表
          </h3>
        </div>
        <div className="divide-y divide-slate-100">
          {departments.map(dept => {
            const deptGroups = getGroupsByDepartment(dept.id);
            return (
              <div key={dept.id} className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Building size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">{dept.name}</h4>
                    <p className="text-sm text-slate-500">{dept.description || '暂无描述'}</p>
                  </div>
                </div>
                {deptGroups.length > 0 && (
                  <div className="ml-13 pl-13 border-l-2 border-slate-200 space-y-2">
                    {deptGroups.map(group => (
                      <div key={group.id} className="flex items-center gap-2 ml-4">
                        <Layers size={14} className="text-green-500" />
                        <span className="text-sm text-slate-600">{group.name}</span>
                        {group.department_name && (
                          <span className="text-xs text-slate-400 ml-2">
                            {departments.find(d => d.id === group.department_id)?.name}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {departments.length === 0 && (
            <div className="p-8 text-center text-slate-400">暂无部门</div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Layers size={20} className="text-green-500" />
            小组列表
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
          {groups.map(group => (
            <div key={group.id} className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Layers size={16} className="text-green-500" />
                <span className="font-bold text-slate-800">{group.name}</span>
              </div>
              <p className="text-sm text-slate-500 flex items-center gap-1">
                <Building size={12} />
                {group.department_name || '未分配部门'}
              </p>
            </div>
          ))}
          {groups.length === 0 && (
            <div className="col-span-full p-8 text-center text-slate-400">暂无小组</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
