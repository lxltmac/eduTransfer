-- eduTransfer PostgreSQL 初始化脚本

-- 部门表
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 角色表
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    permissions TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'member',
    name TEXT NOT NULL,
    avatar TEXT,
    avatar_url TEXT,
    department_id INTEGER,
    department_ids TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 小组表
CREATE TABLE IF NOT EXISTS groups (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    department_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 文件夹表
CREATE TABLE IF NOT EXISTS folders (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    parent_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    role_ids TEXT,
    group_ids TEXT,
    department_ids TEXT,
    owner_id INTEGER,
    is_public INTEGER DEFAULT 0
);

-- 文件表
CREATE TABLE IF NOT EXISTS files (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_url TEXT,
    file_size INTEGER,
    upload_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uploader_name TEXT,
    uploader_username TEXT,
    uploader_id INTEGER,
    folder_id INTEGER,
    role_ids TEXT,
    group_ids TEXT,
    department_ids TEXT
);

-- 用户-角色关联表
CREATE TABLE IF NOT EXISTS user_roles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    role_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, role_id)
);

-- 用户-小组关联表
CREATE TABLE IF NOT EXISTS user_groups (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    group_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, group_id)
);

-- 系统设置表
CREATE TABLE IF NOT EXISTS app_settings (
    id SERIAL PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 插入默认角色
INSERT INTO roles (name, description, permissions) VALUES 
('admin', '系统管理员', '["view_dashboard","manage_departments","manage_users","manage_groups","manage_folders","manage_files","manage_roles","manage_settings","upload_files","download_files","access_files","view_folders"]'),
('manager', '部门管理员', '["view_dashboard","manage_own_department","manage_own_groups","manage_own_folders","upload_files","download_files","manage_folders","access_files","view_folders","manage_files","manage_groups"]'),
('member', '普通成员', '["view_folders","upload_files","download_files","access_files"]')
ON CONFLICT (name) DO NOTHING;

-- 插入默认管理员账号 (密码: admin123)
INSERT INTO users (username, password, role, name, avatar) VALUES 
('admin', 'admin123', 'admin', '系统管理员', 'https://picsum.photos/seed/admin/100/100')
ON CONFLICT (username) DO NOTHING;