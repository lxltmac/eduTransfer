-- eduTransfer PostgreSQL 初始化脚本
-- 如果需要手动创建，运行此脚本

-- 角色表
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    permissions TEXT NOT NULL
);

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'member',
    name TEXT NOT NULL,
    avatar TEXT,
    student_id INTEGER
);

-- 班级表
CREATE TABLE IF NOT EXISTS classes (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    grade TEXT,
    student_count INTEGER DEFAULT 0
);

-- 学生表
CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    student_id TEXT UNIQUE,
    class_id INTEGER,
    group_id INTEGER
);

-- 分组表
CREATE TABLE IF NOT EXISTS groups (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    class_id INTEGER
);

-- 文件表
CREATE TABLE IF NOT EXISTS files (
    id SERIAL PRIMARY KEY,
    student_id INTEGER,
    name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_url TEXT,
    file_size INTEGER,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uploader_name TEXT,
    uploader_username TEXT,
    folder_id INTEGER
);

-- 文件夹表
CREATE TABLE IF NOT EXISTS folders (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    parent_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 菜单表
CREATE TABLE IF NOT EXISTS menus (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    route TEXT,
    icon TEXT,
    parent_id INTEGER,
    order_index INTEGER DEFAULT 0,
    enabled INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 设置表
CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value TEXT,
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