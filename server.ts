import express from "express";
import Database from "better-sqlite3";
import path from "path";
import multer from "multer";
import * as fs from "fs";
import { fileURLToPath } from "url";
import * as crypto from "crypto";
import * as XLSX from "xlsx";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3100;

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer configuration with UTF-8 support for Chinese filenames
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    const originalName = Buffer.from(file.originalname, "latin1").toString("utf8");
    const sanitizedName = originalName.replace(/[<>:"|?*]/g, "").replace(/\s+/g, "_");
    cb(null, uniqueSuffix + "-" + sanitizedName);
  },
});

const limits = {
  fieldNameSize: 200,
  fieldSize: 10 * 1024 * 1024,
  files: 10,
  fileFieldSize: 10 * 1024 * 1024,
};

const upload = multer({
  storage,
  limits,
  preservePath: true,
});

const db = new Database("edu_transfer.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    department_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(department_id) REFERENCES departments(id)
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'member',
    name TEXT NOT NULL,
    avatar TEXT,
    avatar_url TEXT,
    department_ids TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(department_id) REFERENCES departments(id)
  );

  CREATE TABLE IF NOT EXISTS user_roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    role_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, role_id),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(role_id) REFERENCES roles(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS user_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    group_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, group_id),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    parent_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    role_ids TEXT,
    group_ids TEXT,
    department_ids TEXT,
    owner_id INTEGER,
    is_public INTEGER DEFAULT 0,
    FOREIGN KEY(parent_id) REFERENCES folders(id),
    FOREIGN KEY(owner_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_url TEXT,
    file_size INTEGER,
    upload_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    uploader_name TEXT,
    uploader_username TEXT,
    uploader_id INTEGER,
    folder_id INTEGER,
    role_ids TEXT,
    group_ids TEXT,
    department_ids TEXT,
    FOREIGN KEY(uploader_id) REFERENCES users(id),
    FOREIGN KEY(folder_id) REFERENCES folders(id)
  );

  CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    permissions TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS app_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Initialize default roles
const existingRoles = db.prepare("SELECT COUNT(*) as count FROM roles").get() as any;
if (!existingRoles.count) {
  const defaultRoles = [
    {
      name: "admin",
      description: "系统管理员",
      permissions: JSON.stringify([
        "view_dashboard",
        "manage_departments",
        "manage_users",
        "manage_groups",
        "manage_folders",
        "manage_files",
        "manage_roles",
        "manage_settings",
        "upload_files",
        "download_files",
      ]),
    },
    {
      name: "manager",
      description: "部门管理员",
      permissions: JSON.stringify([
        "view_dashboard",
        "manage_own_department",
        "manage_own_groups",
        "manage_own_folders",
        "upload_files",
        "download_files",
      ]),
    },
    {
      name: "member",
      description: "普通成员",
      permissions: JSON.stringify(["view_folders", "upload_files", "download_files"]),
    },
  ];

  const insertRole = db.prepare(
    "INSERT INTO roles (name, description, permissions) VALUES (?, ?, ?)"
  );
  defaultRoles.forEach((r) => insertRole.run(r.name, r.description, r.permissions));

  const existingAdmin = db
    .prepare("SELECT COUNT(*) as count FROM users WHERE username = ?")
    .get("admin") as any;
  if (!existingAdmin.count) {
    db.prepare(
      "INSERT INTO users (username, password, role, name, avatar_url) VALUES (?, ?, ?, ?, ?)"
    ).run(
      "admin",
      "admin123",
      "admin",
      "系统管理员",
      "https://api.dicebear.com/7.x/avataaars/svg?seed=admin-avatar"
    );
  } else {
    const admin = db.prepare("SELECT avatar_url FROM users WHERE username = 'admin'").get() as any;
    if (admin && admin.avatar_url && admin.avatar_url.includes('picsum')) {
      db.prepare("UPDATE users SET avatar_url = ? WHERE username = 'admin'").run(
        'https://api.dicebear.com/7.x/avataaars/svg?seed=admin-avatar'
      );
    }
  }

  const insertDept = db.prepare(
    "INSERT INTO departments (name, description) VALUES (?, ?)"
  );
  insertDept.run("技术部", "技术部门");
  insertDept.run("市场部", "市场部门");
  insertDept.run("财务部", "财务部门");

  const existingSettings = db.prepare("SELECT COUNT(*) as count FROM app_settings").get() as any;
  if (!existingSettings.count) {
    const defaultSettings = [
      { key: "site_name", value: "EduTransfer" },
      { key: "theme_color", value: "#3B82F6" },
      { key: "site_subtitle", value: "文件传输系统" },
    ];
    const insertSetting = db.prepare("INSERT INTO app_settings (key, value) VALUES (?, ?)");
    defaultSettings.forEach((s) => insertSetting.run(s.key, s.value));
  }
}

const allRoles = db.prepare("SELECT id, permissions FROM roles").all() as any[];
allRoles.forEach((role) => {
  const perms = JSON.parse(role.permissions || "[]");
  const fileRelatedPerms = ["view_folders", "upload_files", "download_files", "manage_folders", "manage_files", "manage_own_folders"];
  const needsAccessFiles = fileRelatedPerms.some(p => perms.includes(p)) && !perms.includes("access_files");
  if (needsAccessFiles) {
    perms.push("access_files");
    db.prepare("UPDATE roles SET permissions = ? WHERE id = ?").run(JSON.stringify(perms), role.id);
  }
});

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "dist")));

// Auth Routes
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const user = db
    .prepare(
      `
      SELECT u.id, u.username, u.role, u.name, u.avatar, u.avatar_url, u.department_ids, r.permissions 
      FROM users u
      LEFT JOIN roles r ON u.role = r.name
      WHERE u.username = ? AND u.password = ?
    `
    )
    .get(username, password) as any;

  if (user) {
    const userRoles = db.prepare(`
      SELECT r.id, r.name, r.description, r.permissions 
      FROM user_roles ur 
      JOIN roles r ON ur.role_id = r.id 
      WHERE ur.user_id = ?
    `).all(user.id) as any[];
    
    let allPermissions: string[] = [];
    for (const role of userRoles) {
      const perms = JSON.parse(role.permissions || "[]");
      allPermissions = [...new Set([...allPermissions, ...perms])];
    }
    
    if (user.role === 'admin' || userRoles.some(r => r.name === 'admin')) {
      allPermissions = [...new Set([...allPermissions, 'view_dashboard', 'manage_departments', 'manage_users', 'manage_groups', 'manage_folders', 'manage_files', 'manage_roles', 'manage_settings', 'upload_files', 'download_files', 'access_files'])];
    }
    
    user.permissions = allPermissions;
    user.role_ids = userRoles.map(r => r.id);
    user.role_names = userRoles.map(r => r.description || r.name);
    
    if (userRoles.some(r => r.name === 'admin')) {
      user.effective_role = 'admin';
    } else {
      user.effective_role = user.role;
    }
    
    const userGroups = db.prepare(`
      SELECT g.id, g.name, g.department_id, d.name as department_name
      FROM user_groups ug 
      JOIN groups g ON ug.group_id = g.id 
      LEFT JOIN departments d ON g.department_id = d.id
      WHERE ug.user_id = ?
    `).all(user.id) as any[];
    user.group_ids = userGroups.map(g => g.id);
    user.groups = userGroups;
    
    if (user.department_ids) {
      const deptIds = JSON.parse(user.department_ids);
      user.department_ids = deptIds;
      const depts = db.prepare(`SELECT id, name FROM departments WHERE id IN (${deptIds.map(() => '?').join(',') || '0'})`).all(...deptIds) as any[];
      user.department_names = depts.map(d => d.name).join(', ');
    } else {
      user.department_ids = [];
    }
    
    res.json({ success: true, user });
  } else {
    res.status(401).json({ success: false, message: "用户名或密码错误" });
  }
});

app.post("/api/folders/move", (req, res) => {
  try {
    const { folderIds, targetId, userId } = req.body;
    if (!folderIds || !Array.isArray(folderIds)) {
      return res.status(400).json({ success: false, message: "缺少文件夹ID列表" });
    }
    if (!userId) {
      return res.status(401).json({ success: false, message: "未授权" });
    }
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as any;
    const isAdmin = user.effective_role === "admin" || user.permissions?.includes("manage_folders");
    for (const folderId of folderIds) {
      const folder = db.prepare("SELECT * FROM folders WHERE id = ?").get(folderId) as any;
      if (!folder) continue;
      const isOwner = folder.owner_id === parseInt(userId);
      if (!isAdmin && !isOwner) {
        return res.status(403).json({ success: false, message: "无权限移动此文件夹" });
      }
    }
    const updateStmt = db.prepare("UPDATE folders SET parent_id = ? WHERE id = ?");
    for (const folderId of folderIds) {
      updateStmt.run(targetId || null, folderId);
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: "移动文件夹失败" });
  }
});

app.delete("/api/folders/:id", (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(401).json({ success: false, message: "未授权" });
    }
    
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as any;
    const folder = db.prepare("SELECT * FROM folders WHERE id = ?").get(req.params.id) as any;
    
    if (!folder) {
      return res.status(404).json({ success: false, message: "文件夹不存在" });
    }
    
    const isAdmin = user.effective_role === "admin" || user.permissions?.includes("manage_folders");
    const isOwner = folder.owner_id === parseInt(userId as string);
    
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ success: false, message: "无权限删除此文件夹" });
    }
    
    db.prepare("DELETE FROM folders WHERE id = ?").run(req.params.id);
    db.prepare("DELETE FROM files WHERE folder_id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: "删除文件夹失败" });
  }
});

// File Management Routes
app.get("/api/files", (req, res) => {
  try {
    const { folder_id, userId } = req.query;
    let files;

    if (folder_id) {
      files = db
        .prepare("SELECT * FROM files WHERE folder_id = ? ORDER BY upload_time DESC")
        .all(folder_id);
    } else {
      files = db.prepare("SELECT * FROM files ORDER BY upload_time DESC").all();
    }

    res.json(files);
  } catch (e) {
    console.error("[FILES GET] Error:", e);
    res.status(500).json({ success: false, message: "获取文件列表失败" });
  }
});

app.post(
  "/api/files/upload",
  upload.single("file"),
  (req, res) => {
    try {
      const file = req.file;
      const { folder_id, uploader_id, uploader_name, uploader_username } = req.body;

      if (!file) {
        return res.status(400).json({ success: false, message: "请选择文件" });
      }

      const displayName = Buffer.from(file.originalname, "latin1").toString("utf8");
      const file_type = getFileType(displayName);
      const result = db
        .prepare(
          "INSERT INTO files (name, file_type, file_url, file_size, uploader_name, uploader_username, uploader_id, folder_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .run(
          displayName,
          file_type,
          `/uploads/${file.filename}`,
          file.size,
          uploader_name || "未知",
          uploader_username || "unknown",
          uploader_id || null,
          folder_id || null
        );

      res.json({
        success: true,
        id: result.lastInsertRowid,
        url: `/uploads/${file.filename}`,
      });
    } catch (e) {
      console.error("[FILE UPLOAD] Error:", e);
      res.status(500).json({ success: false, message: "上传文件失败" });
    }
  }
);

app.post("/api/files/move", (req, res) => {
  try {
    const { fileId, folderId, userId } = req.body;
    if (fileId === undefined) {
      return res.status(400).json({ success: false, message: "缺少文件ID" });
    }
    if (!userId) {
      return res.status(401).json({ success: false, message: "未授权" });
    }
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as any;
    const file = db.prepare("SELECT * FROM files WHERE id = ?").get(fileId) as any;
    if (!file) {
      return res.status(404).json({ success: false, message: "文件不存在" });
    }
    const isAdmin = user.effective_role === "admin" || user.permissions?.includes("manage_files");
    const isOwner = file.uploader_id === parseInt(userId);
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ success: false, message: "无权限移动此文件" });
    }
    
    // 普通用户只能移动文件到自己的文件夹
    if (!isAdmin && folderId) {
      const targetFolder = db.prepare("SELECT * FROM folders WHERE id = ?").get(folderId) as any;
      if (targetFolder && targetFolder.owner_id !== parseInt(userId)) {
        return res.status(403).json({ success: false, message: "只能移动文件到自己的文件夹" });
      }
    }
    
    db.prepare("UPDATE files SET folder_id = ? WHERE id = ?").run(folderId || null, fileId);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: "移动文件失败" });
  }
});

// Settings Routes
app.get("/api/settings", (req, res) => {
  try {
    const settings = db.prepare("SELECT key, value FROM app_settings").all() as any[];
    const result: Record<string, string> = {};
    settings.forEach((s) => { result[s.key] = s.value; });
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, message: "获取设置失败" });
  }
});

app.put("/api/settings", (req, res) => {
  const { key, value } = req.body;
  if (!key) {
    return res.status(400).json({ success: false, message: "设置键不能为空" });
  }
  try {
    db.prepare(
      "INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP"
    ).run(key, value, value);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: "保存设置失败" });
  }
});

// Department Management Routes
app.get("/api/departments", (req, res) => {
  try {
    const departments = db.prepare("SELECT * FROM departments ORDER BY id").all();
    res.json(departments);
  } catch (e) {
    res.status(500).json({ success: false, message: "获取部门失败" });
  }
});

app.post("/api/departments", (req, res) => {
  const { name, description } = req.body;
  if (!name?.trim()) {
    return res.status(400).json({ success: false, message: "部门名称不能为空" });
  }
  try {
    const result = db.prepare("INSERT INTO departments (name, description) VALUES (?, ?)").run(name, description || "");
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (e) {
    res.status(500).json({ success: false, message: "创建部门失败" });
  }
});

app.put("/api/departments/:id", (req, res) => {
  const { name, description } = req.body;
  try {
    db.prepare("UPDATE departments SET name = ?, description = ? WHERE id = ?").run(name, description || "", req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: "更新部门失败" });
  }
});

app.delete("/api/departments/:id", (req, res) => {
  try {
    db.prepare("DELETE FROM departments WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: "删除部门失败" });
  }
});

// Group Management Routes
app.get("/api/groups", (req, res) => {
  try {
    const groups = db.prepare(`
      SELECT g.*, d.name as department_name,
        (SELECT COUNT(*) FROM user_groups WHERE group_id = g.id) as member_count
      FROM groups g 
      LEFT JOIN departments d ON g.department_id = d.id 
      ORDER BY g.id
    `).all();
    res.json(groups);
  } catch (e) {
    res.status(500).json({ success: false, message: "获取小组失败" });
  }
});

app.post("/api/groups", (req, res) => {
  const { name, department_id } = req.body;
  if (!name?.trim()) {
    return res.status(400).json({ success: false, message: "小组名称不能为空" });
  }
  try {
    const result = db.prepare("INSERT INTO groups (name, department_id) VALUES (?, ?)").run(name, department_id || null);
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (e) {
    res.status(500).json({ success: false, message: "创建小组失败" });
  }
});

app.put("/api/groups/:id", (req, res) => {
  const { name, department_id } = req.body;
  try {
    db.prepare("UPDATE groups SET name = ?, department_id = ? WHERE id = ?").run(name, department_id || null, req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: "更新小组失败" });
  }
});

app.delete("/api/groups/:id", (req, res) => {
  try {
    db.prepare("DELETE FROM user_groups WHERE group_id = ?").run(req.params.id);
    db.prepare("DELETE FROM groups WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: "删除小组失败" });
  }
});

app.get("/api/groups/:id/users", (req, res) => {
  try {
    const users = db.prepare(`
      SELECT u.id, u.username, u.name, u.avatar, u.avatar_url
      FROM user_groups ug
      JOIN users u ON ug.user_id = u.id
      WHERE ug.group_id = ?
    `).all(req.params.id);
    res.json(users);
  } catch (e) {
    res.status(500).json({ success: false, message: "获取小组用户失败" });
  }
});

app.put("/api/groups/:id/members", (req, res) => {
  const { user_ids } = req.body;
  try {
    db.prepare("DELETE FROM user_groups WHERE group_id = ?").run(req.params.id);
    if (user_ids && user_ids.length > 0) {
      const insert = db.prepare("INSERT INTO user_groups (user_id, group_id) VALUES (?, ?)");
      for (const userId of user_ids) {
        insert.run(userId, req.params.id);
      }
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: "更新小组成员失败" });
  }
});

// Role Management Routes
app.get("/api/roles", (req, res) => {
  try {
    const roles = db.prepare("SELECT * FROM roles ORDER BY id").all() as any[];
    const result = roles.map(r => ({ ...r, permissions: JSON.parse(r.permissions || "[]") }));
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, message: "获取角色失败" });
  }
});

app.post("/api/roles", (req, res) => {
  const { name, description, permissions } = req.body;
  if (!name?.trim()) {
    return res.status(400).json({ success: false, message: "角色名称不能为空" });
  }
  try {
    const result = db.prepare(
      "INSERT INTO roles (name, description, permissions) VALUES (?, ?, ?)"
    ).run(name, description || "", JSON.stringify(permissions || []));
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (e) {
    res.status(500).json({ success: false, message: "创建角色失败" });
  }
});

app.put("/api/roles/:id", (req, res) => {
  const { name, description, permissions } = req.body;
  try {
    if (name !== undefined) {
      db.prepare("UPDATE roles SET name = ? WHERE id = ?").run(name, req.params.id);
    }
    if (description !== undefined) {
      db.prepare("UPDATE roles SET description = ? WHERE id = ?").run(description, req.params.id);
    }
    if (permissions !== undefined) {
      db.prepare("UPDATE roles SET permissions = ? WHERE id = ?").run(JSON.stringify(permissions), req.params.id);
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: "更新角色失败" });
  }
});

app.delete("/api/roles/:id", (req, res) => {
  const role = db.prepare("SELECT name FROM roles WHERE id = ?").get(req.params.id) as any;
  if (role && role.name === "admin") {
    return res.status(400).json({ success: false, message: "不能删除管理员角色" });
  }
  db.prepare("DELETE FROM roles WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// User Management Routes
app.get("/api/users", (req, res) => {
  try {
    const users = db.prepare(`
      SELECT u.id, u.username, u.role, u.name, u.avatar, u.avatar_url, u.department_ids, u.created_at
      FROM users u 
      ORDER BY u.id
    `).all() as any[];
    
    const result = users.map(u => {
      u.password = "";
      const userRoles = db.prepare(`
        SELECT r.id, r.name, r.description 
        FROM user_roles ur 
        JOIN roles r ON ur.role_id = r.id 
        WHERE ur.user_id = ?
      `).all(u.id) as any[];
      u.role_ids = userRoles.map(r => r.id);
      u.role_names = userRoles.map(r => r.description || r.name);
      
      if (u.department_ids) {
        const deptIds = JSON.parse(u.department_ids);
        u.department_ids = deptIds;
        if (deptIds.length > 0) {
          const depts = db.prepare(`SELECT id, name FROM departments WHERE id IN (${deptIds.map(() => '?').join(',')})`).all(...deptIds) as any[];
          u.department_names = depts.map(d => d.name).join(', ');
        } else {
          u.department_names = '';
        }
      } else {
        u.department_ids = [];
      }
      
      const userGroups = db.prepare(`
        SELECT g.id, g.name, d.name as department_name
        FROM user_groups ug 
        JOIN groups g ON ug.group_id = g.id 
        LEFT JOIN departments d ON g.department_id = d.id
        WHERE ug.user_id = ?
      `).all(u.id) as any[];
      u.group_ids = userGroups.map(g => g.id);
      u.group_names = userGroups.map(g => g.name).join(', ');
      
      return u;
    });
    
    res.json(result);
  } catch (e) {
    console.error("[USERS GET] Error:", e);
    res.status(500).json({ success: false, message: "获取用户失败" });
  }
});

app.post("/api/users", (req, res) => {
  const { username, password, name, role, department_ids, role_ids, group_ids, avatar, avatar_url } = req.body;
  if (!username?.trim() || !password?.trim() || !name?.trim()) {
    return res.status(400).json({ success: false, message: "用户名、密码和姓名不能为空" });
  }
  try {
    const avatarUrl = avatar_url || avatar || `https://picsum.photos/seed/${username}/100/100`;
    const deptIds = department_ids ? JSON.stringify(department_ids) : null;
    
    const result = db.prepare(
      "INSERT INTO users (username, password, name, role, department_ids, avatar, avatar_url) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(username, password, name, role || "member", deptIds, avatar || null, avatar_url || null);
    
    const userId = result.lastInsertRowid;
    
    if (role_ids && role_ids.length > 0) {
      const insertRole = db.prepare("INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)");
      for (const roleId of role_ids) {
        insertRole.run(userId, roleId);
      }
    }
    
    if (group_ids && group_ids.length > 0) {
      const insertGroup = db.prepare("INSERT OR IGNORE INTO user_groups (user_id, group_id) VALUES (?, ?)");
      for (const groupId of group_ids) {
        insertGroup.run(userId, groupId);
      }
    }
    
    res.json({ success: true, id: userId });
  } catch (e: any) {
    if (e.message?.includes("UNIQUE")) {
      res.status(400).json({ success: false, message: "用户名已存在" });
    } else {
      console.error("[USER CREATE] Error:", e);
      res.status(500).json({ success: false, message: "创建用户失败" });
    }
  }
});

app.put("/api/users/:id", (req, res) => {
  const { username, password, name, role, department_ids, role_ids, group_ids, avatar, avatar_url } = req.body;
  try {
    if (username) db.prepare("UPDATE users SET username = ? WHERE id = ?").run(username, req.params.id);
    if (password) db.prepare("UPDATE users SET password = ? WHERE id = ?").run(password, req.params.id);
    if (name) db.prepare("UPDATE users SET name = ? WHERE id = ?").run(name, req.params.id);
    if (role) db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, req.params.id);
    if (department_ids !== undefined) {
      const deptIds = department_ids.length > 0 ? JSON.stringify(department_ids) : null;
      db.prepare("UPDATE users SET department_ids = ? WHERE id = ?").run(deptIds, req.params.id);
    }
    if (avatar !== undefined) db.prepare("UPDATE users SET avatar = ? WHERE id = ?").run(avatar, req.params.id);
    if (avatar_url !== undefined) db.prepare("UPDATE users SET avatar_url = ? WHERE id = ?").run(avatar_url || null, req.params.id);
    
    if (role_ids !== undefined) {
      db.prepare("DELETE FROM user_roles WHERE user_id = ?").run(req.params.id);
      if (role_ids.length > 0) {
        const insertRole = db.prepare("INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)");
        for (const roleId of role_ids) {
          insertRole.run(req.params.id, roleId);
        }
      }
    }
    
    if (group_ids !== undefined) {
      db.prepare("DELETE FROM user_groups WHERE user_id = ?").run(req.params.id);
      if (group_ids.length > 0) {
        const insertGroup = db.prepare("INSERT OR IGNORE INTO user_groups (user_id, group_id) VALUES (?, ?)");
        for (const groupId of group_ids) {
          insertGroup.run(req.params.id, groupId);
        }
      }
    }
    
    res.json({ success: true });
  } catch (e) {
    console.error("[USER UPDATE] Error:", e);
    res.status(500).json({ success: false, message: "更新用户失败" });
  }
});

app.delete("/api/users/:id", (req, res) => {
  try {
    db.prepare("DELETE FROM user_roles WHERE user_id = ?").run(req.params.id);
    db.prepare("DELETE FROM user_groups WHERE user_id = ?").run(req.params.id);
    db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: "删除用户失败" });
  }
});

app.post("/api/avatar/upload", upload.single("avatar"), (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, message: "请选择头像文件" });
    }
    res.json({
      success: true,
      url: `/uploads/${file.filename}`,
      filename: file.filename
    });
  } catch (e) {
    console.error("[AVATAR UPLOAD] Error:", e);
    res.status(500).json({ success: false, message: "上传头像失败" });
  }
});

app.get("/api/users/:id/groups", (req, res) => {
  try {
    const groups = db.prepare(`
      SELECT g.*, d.name as department_name
      FROM user_groups ug 
      JOIN groups g ON ug.group_id = g.id 
      LEFT JOIN departments d ON g.department_id = d.id
      WHERE ug.user_id = ?
    `).all(req.params.id);
    res.json(groups);
  } catch (e) {
    res.status(500).json({ success: false, message: "获取用户组失败" });
  }
});

app.post("/api/users/:id/groups", (req, res) => {
  const { group_ids } = req.body;
  try {
    if (group_ids && Array.isArray(group_ids)) {
      db.prepare("DELETE FROM user_groups WHERE user_id = ?").run(req.params.id);
      const insert = db.prepare("INSERT OR IGNORE INTO user_groups (user_id, group_id) VALUES (?, ?)");
      for (const groupId of group_ids) {
        insert.run(req.params.id, groupId);
      }
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: "更新用户组失败" });
  }
});

app.get("/api/my-organization", (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ success: false, message: "缺少用户ID" });
  }
  try {
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as any;
    if (!user) {
      return res.status(404).json({ success: false, message: "用户不存在" });
    }
    
    const departments = user.department_ids ? JSON.parse(user.department_ids) : [];
    let deptList = [];
    if (departments.length > 0) {
      deptList = db.prepare(`SELECT * FROM departments WHERE id IN (${departments.map(() => '?').join(',')})`).all(...departments);
    }
    
    const groups = db.prepare(`
      SELECT g.*, d.name as department_name
      FROM user_groups ug 
      JOIN groups g ON ug.group_id = g.id 
      LEFT JOIN departments d ON g.department_id = d.id
      WHERE ug.user_id = ?
    `).all(userId);
    
    const roles = db.prepare(`
      SELECT r.* FROM user_roles ur 
      JOIN roles r ON ur.role_id = r.id 
      WHERE ur.user_id = ?
    `).all(userId);
    
    res.json({
      success: true,
      user: { id: user.id, name: user.name, username: user.username },
      departments: deptList,
      groups: groups,
      roles: roles
    });
  } catch (e) {
    console.error("[MY ORG] Error:", e);
    res.status(500).json({ success: false, message: "获取组织信息失败" });
  }
});

// Folder Routes
app.get("/api/folders", (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.json({ success: true, folders: [] });
    }

    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as any;
    if (!user) {
      return res.json({ success: true, folders: [] });
    }

    const userRoles = db.prepare("SELECT r.name FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = ?").all(userId) as any[];
    const isAdmin = user.role === "admin" || userRoles.some((r: any) => r.name === "admin");
    
    let folders;
    
    if (isAdmin) {
      folders = db.prepare(`
        SELECT f.*, u.name as owner_name 
        FROM folders f 
        LEFT JOIN users u ON f.owner_id = u.id 
        ORDER BY f.created_at DESC
      `).all();
    } else {
      const userGroups = db.prepare("SELECT group_id FROM user_groups WHERE user_id = ?").all(userId) as any[];
      const userGroupIds = userGroups.map((g: any) => g.group_id);
      
      const userDepts = user.department_ids ? JSON.parse(user.department_ids) : [];
      
      const roleIds = db.prepare(`
        SELECT role_id FROM user_roles WHERE user_id = ?
      `).all(userId) as any[];
      const userRoleIds = roleIds.map((r: any) => r.role_id);

      folders = db.prepare(`
        SELECT f.*, u.name as owner_name 
        FROM folders f 
        LEFT JOIN users u ON f.owner_id = u.id
        WHERE f.is_public = 1 
           OR f.owner_id = ?
           OR (f.role_ids IS NOT NULL AND EXISTS (
               SELECT 1 FROM json_each(f.role_ids) WHERE CAST(json_each.value AS INTEGER) IN (${userRoleIds.map(() => "?").join(",") || "0"})
           ))
           OR (f.group_ids IS NOT NULL AND EXISTS (
               SELECT 1 FROM json_each(f.group_ids) WHERE CAST(json_each.value AS INTEGER) IN (${userGroupIds.map(() => "?").join(",") || "0"})
           ))
           OR (f.department_ids IS NOT NULL AND EXISTS (
               SELECT 1 FROM json_each(f.department_ids) WHERE CAST(json_each.value AS INTEGER) IN (${userDepts.map(() => "?").join(",") || "0"})
           ))
        ORDER BY f.created_at DESC
      `).all(user.id, ...userRoleIds, ...userGroupIds, ...userDepts);
    }

    res.json({ success: true, folders });
  } catch (e) {
    console.error("[FOLDERS GET] Error:", e);
    res.status(500).json({ success: false, message: "获取文件夹失败" });
  }
});

app.post("/api/folders", (req, res) => {
  const { name, parent_id, role_ids, group_ids, department_ids, owner_id, is_public } = req.body;
  if (!name?.trim()) {
    return res.status(400).json({ success: false, message: "文件夹名称不能为空" });
  }
  try {
    const result = db.prepare(
      "INSERT INTO folders (name, parent_id, role_ids, group_ids, department_ids, owner_id, is_public) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(
      name,
      parent_id || null,
      role_ids ? JSON.stringify(role_ids) : null,
      group_ids ? JSON.stringify(group_ids) : null,
      department_ids ? JSON.stringify(department_ids) : null,
      owner_id || null,
      is_public ? 1 : 0
    );
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (e) {
    res.status(500).json({ success: false, message: "创建文件夹失败" });
  }
});

app.put("/api/folders/:id", (req, res) => {
  const { name, parentId, role_ids, group_ids, department_ids, is_public } = req.body;
  const { userId } = req.query;
  
  if (!userId) {
    return res.status(401).json({ success: false, message: "未授权" });
  }
  
  try {
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as any;
    const folder = db.prepare("SELECT * FROM folders WHERE id = ?").get(req.params.id) as any;
    
    if (!folder) {
      return res.status(404).json({ success: false, message: "文件夹不存在" });
    }
    
    // Check effective_role for admin status
    const isAdmin = user.effective_role === "admin" || user.permissions?.includes("manage_folders");
    const isOwner = folder.owner_id === parseInt(userId as string);
    
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ success: false, message: "无权限编辑此文件夹" });
    }
    
    if (name !== undefined) {
      db.prepare("UPDATE folders SET name = ? WHERE id = ?").run(name, req.params.id);
    }
    if (parentId !== undefined) {
      // 普通用户只能移动文件夹到自己创建的文件夹
      if (!isAdmin && parentId !== null) {
        const targetFolder = db.prepare("SELECT * FROM folders WHERE id = ?").get(parentId) as any;
        if (targetFolder && targetFolder.owner_id !== parseInt(userId as string)) {
          return res.status(403).json({ success: false, message: "只能移动文件夹到自己的文件夹" });
        }
      }
      db.prepare("UPDATE folders SET parent_id = ? WHERE id = ?").run(parentId, req.params.id);
    }
    if (role_ids !== undefined) {
      db.prepare("UPDATE folders SET role_ids = ? WHERE id = ?").run(
        role_ids ? JSON.stringify(role_ids) : null,
        req.params.id
      );
    }
    if (group_ids !== undefined) {
      db.prepare("UPDATE folders SET group_ids = ? WHERE id = ?").run(
        group_ids ? JSON.stringify(group_ids) : null,
        req.params.id
      );
    }
    if (department_ids !== undefined) {
      db.prepare("UPDATE folders SET department_ids = ? WHERE id = ?").run(
        department_ids ? JSON.stringify(department_ids) : null,
        req.params.id
      );
    }
    if (is_public !== undefined) {
      db.prepare("UPDATE folders SET is_public = ? WHERE id = ?").run(
        is_public ? 1 : 0,
        req.params.id
      );
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: "更新文件夹失败" });
  }
});

app.delete("/api/files/:id", (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(401).json({ success: false, message: "未授权" });
    }
    
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as any;
    const file = db.prepare("SELECT file_url, uploader_id FROM files WHERE id = ?").get(req.params.id) as any;
    
    if (!file) {
      return res.status(404).json({ success: false, message: "文件不存在" });
    }
    
    const isAdmin = user.effective_role === "admin" || user.permissions?.includes("manage_files");
    const isOwner = file.uploader_id === parseInt(userId as string);
    
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ success: false, message: "无权限删除此文件" });
    }
    
    if (file.file_url) {
      const filePath = path.join(__dirname, file.file_url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    db.prepare("DELETE FROM files WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: "删除文件失败" });
  }
});

// Serve uploaded files
app.use("/uploads", express.static(uploadDir));

// Serve index.html for all other routes (SPA)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

function getFileType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(ext))
    return "image";
  if (["mp4", "avi", "mov", "wmv", "flv", "mkv", "webm"].includes(ext))
    return "video";
  if (["mp3", "wav", "ogg", "flac", "aac", "m4a"].includes(ext)) return "audio";
  if (["pdf"].includes(ext)) return "pdf";
  if (["doc", "docx"].includes(ext)) return "word";
  if (["xls", "xlsx"].includes(ext)) return "excel";
  if (["ppt", "pptx"].includes(ext)) return "ppt";
  if (["txt", "md", "json", "xml", "html", "css", "js", "ts"].includes(ext))
    return "text";
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return "archive";
  return "other";
}

app.listen(PORT, () => {
  console.log(`[START] Server running on http://localhost:${PORT}`);
  console.log(`[START] Database: edu_transfer.db`);
  console.log(`[START] Default admin: admin / admin123`);
});
