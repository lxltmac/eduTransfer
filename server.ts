import express from "express";
import path from "path";
import multer from "multer";
import * as fs from "fs";
import { fileURLToPath } from "url";
import * as XLSX from "xlsx";
import { asyncQuery, asyncQueryOne, asyncRun, asyncExec, initDatabase, isProduction } from "./src/lib/db.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    const originalName = Buffer.from(file.originalname, "latin1").toString("utf8");
    const sanitizedName = originalName.replace(/[<>:"|?*]/g, "").replace(/\s+/g, "_");
    cb(null, uniqueSuffix + "-" + sanitizedName);
  },
});

const limits = { fieldNameSize: 200, fieldSize: 10 * 1024 * 1024, files: 10, fileFieldSize: 10 * 1024 * 1024 };
const upload = multer({ storage, limits });

async function startServer() {
  console.log("[START] Init...");
  const app = express();
  app.use(express.json());
  app.use("/uploads", express.static(uploadDir));

  await initDatabase();

  // PostgreSQL uses SERIAL + TIMESTAMP, SQLite uses AUTOINCREMENT + DATETIME
  console.log("[DEBUG] isProduction:", isProduction);
  const idColumnType = isProduction ? "SERIAL PRIMARY KEY" : "INTEGER PRIMARY KEY AUTOINCREMENT";
  const timestampType = isProduction ? "TIMESTAMP" : "DATETIME";
  console.log("[DEBUG] timestampType:", timestampType);
  
  const createTablesSQL = `
    CREATE TABLE IF NOT EXISTS departments (
      id ${idColumnType},
      name TEXT NOT NULL,
      description TEXT,
      created_at ${timestampType} DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS roles (
      id ${idColumnType},
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      permissions TEXT NOT NULL,
      created_at ${timestampType} DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS users (
      id ${idColumnType},
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'member',
      name TEXT NOT NULL,
      avatar TEXT,
      avatar_url TEXT,
      department_id INTEGER,
      department_ids TEXT,
      created_at ${timestampType} DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS groups (
      id ${idColumnType},
      name TEXT NOT NULL,
      department_id INTEGER,
      created_at ${timestampType} DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS folders (
      id ${idColumnType},
      name TEXT NOT NULL,
      parent_id INTEGER,
      created_at ${timestampType} DEFAULT CURRENT_TIMESTAMP,
      role_ids TEXT,
      group_ids TEXT,
      department_ids TEXT,
      owner_id INTEGER,
      is_public INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS files (
      id ${idColumnType},
      name TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_url TEXT,
      file_size INTEGER,
      upload_time ${timestampType} DEFAULT CURRENT_TIMESTAMP,
      uploader_name TEXT,
      uploader_username TEXT,
      uploader_id INTEGER,
      folder_id INTEGER,
      role_ids TEXT,
      group_ids TEXT,
      department_ids TEXT
    );
    CREATE TABLE IF NOT EXISTS user_roles (
      id ${idColumnType},
      user_id INTEGER NOT NULL,
      role_id INTEGER NOT NULL,
      created_at ${timestampType} DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS user_groups (
      id ${idColumnType},
      user_id INTEGER NOT NULL,
      group_id INTEGER NOT NULL,
      created_at ${timestampType} DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS app_settings (
      id ${idColumnType},
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      updated_at ${timestampType} DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await asyncExec(createTablesSQL);

  const roleCount = (await asyncQueryOne("SELECT COUNT(*) as count FROM roles"))?.count || 0;
  if (roleCount === 0) {
    await asyncRun("INSERT INTO roles (name, description, permissions) VALUES (?, ?, ?)", ["admin", "系统管理员", JSON.stringify(["view_dashboard", "manage_departments", "manage_users", "manage_groups", "manage_folders", "manage_files", "manage_roles", "manage_settings", "upload_files", "download_files", "access_files", "view_folders"])]);
    await asyncRun("INSERT INTO roles (name, description, permissions) VALUES (?, ?, ?)", ["manager", "部门管理员", JSON.stringify(["view_dashboard", "manage_own_department", "manage_own_groups", "manage_own_folders", "upload_files", "download_files", "manage_folders", "access_files", "view_folders", "manage_files", "manage_groups"])]);
    await asyncRun("INSERT INTO roles (name, description, permissions) VALUES (?, ?, ?)", ["member", "普通成员", JSON.stringify(["view_folders", "upload_files", "download_files", "access_files"])]);
  }

  const userCount = (await asyncQueryOne("SELECT COUNT(*) as count FROM users"))?.count || 0;
  if (userCount === 0) {
    await asyncRun("INSERT INTO users (username, password, role, name, avatar) VALUES (?, ?, ?, ?, ?)", ["admin", "admin123", "admin", "系统管理员", "https://picsum.photos/seed/admin/100/100"]);
  }

  app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;
    const user = await asyncQueryOne("SELECT * FROM users WHERE username = ? AND password = ?", [username, password]);
    if (user) res.json({ success: true, user });
    else res.status(401).json({ success: false, message: "用户名或密码错误" });
  });

  app.get("/api/files", async (req, res) => {
    const { userId, folder_id } = req.query;
    if (!userId) return res.json([]);
    const user = await asyncQueryOne("SELECT * FROM users WHERE id = ?", [userId]);
    if (!user) return res.json([]);
    let query = "SELECT * FROM files";
    const params: any[] = [];
    if (folder_id) {
      query += " WHERE folder_id = ?";
      params.push(folder_id);
    }
    query += " ORDER BY upload_time DESC";
    res.json(await asyncQuery(query, params));
  });

  app.post("/api/files", upload.single("file"), async (req, res) => {
    const file = req.file;
    if (!file) return res.status(400).json({ success: false, message: "未选择文件" });
    const { studentId, fileType, role_ids, group_ids, department_ids, uploader_id } = req.body;
    const name = Buffer.from(file.originalname, "latin1").toString("utf8");
    await asyncRun("INSERT INTO files (student_id, name, file_type, file_url, file_size, role_ids, group_ids, department_ids, uploader_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", 
      [studentId, name, fileType, `/uploads/${file.filename}`, file.size, role_ids || "[]", group_ids || "[]", department_ids || "[]", uploader_id || null]);
    res.json({ success: true });
  });

  app.post("/api/files/upload", upload.single("file"), async (req, res) => {
    const file = req.file;
    if (!file) return res.status(400).json({ success: false, message: "未选择文件" });
    const { studentId, fileType, role_ids, group_ids, department_ids, uploader_id } = req.body;
    const name = Buffer.from(file.originalname, "latin1").toString("utf8");
    await asyncRun("INSERT INTO files (student_id, name, file_type, file_url, file_size, role_ids, group_ids, department_ids, uploader_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", 
      [studentId, name, fileType, `/uploads/${file.filename}`, file.size, role_ids || "[]", group_ids || "[]", department_ids || "[]", uploader_id || null]);
    res.json({ success: true });
  });

  app.delete("/api/files/:id", async (req, res) => {
    await asyncRun("DELETE FROM files WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  });

  app.post("/api/groups", async (req, res) => {
    const { name, department_id, userId } = req.body;
    const result = await asyncRun("INSERT INTO groups (name, department_id) VALUES (?, ?)", [name, department_id || null]);
    res.json({ success: true, id: result.lastID });
  });

  app.get("/api/users", async (req, res) => {
    res.json(await asyncQuery("SELECT id, username, role, name, avatar FROM users"));
  });

  app.post("/api/users", async (req, res) => {
    const { username, password, role, name, avatar } = req.body;
    try {
      await asyncRun("INSERT INTO users (username, password, role, name, avatar) VALUES (?, ?, ?, ?, ?)", [username, password, role, name, avatar]);
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ success: false, message: "用户名已存在" });
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    const { name, role, avatar, password } = req.body;
    try {
      if (password && password.length > 0) {
        await asyncRun("UPDATE users SET name = ?, role = ?, avatar = ?, password = ? WHERE id = ?", [name, role, avatar, password, req.params.id]);
      } else {
        await asyncRun("UPDATE users SET name = ?, role = ?, avatar = ? WHERE id = ?", [name, role, avatar, req.params.id]);
      }
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ success: false, message: "更新失败" });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    await asyncRun("DELETE FROM users WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  });

  app.get("/api/roles", async (req, res) => {
    const roles = await asyncQuery("SELECT * FROM roles");
    roles.forEach((r: any) => r.permissions = JSON.parse(r.permissions));
    res.json(roles);
  });

  app.post("/api/roles", async (req, res) => {
    const { name, description, permissions } = req.body;
    await asyncRun("INSERT INTO roles (name, description, permissions) VALUES (?, ?, ?)", [name, description, JSON.stringify(permissions)]);
    res.json({ success: true });
  });

  app.put("/api/roles/:id", async (req, res) => {
    const { name, description, permissions } = req.body;
    await asyncRun("UPDATE roles SET name = ?, description = ?, permissions = ? WHERE id = ?", [name, description, JSON.stringify(permissions), req.params.id]);
    res.json({ success: true });
  });

  app.delete("/api/roles/:id", async (req, res) => {
    await asyncRun("DELETE FROM roles WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  });

  app.get("/api/departments", async (req, res) => {
    res.json(await asyncQuery("SELECT * FROM departments ORDER BY id"));
  });

  app.post("/api/departments", async (req, res) => {
    const { name, description } = req.body;
    const result = await asyncRun("INSERT INTO departments (name, description) VALUES (?, ?)", [name, description || ""]);
    res.json({ success: true, id: result.lastID });
  });

  app.put("/api/departments/:id", async (req, res) => {
    const { name, description } = req.body;
    await asyncRun("UPDATE departments SET name = ?, description = ? WHERE id = ?", [name, description || "", req.params.id]);
    res.json({ success: true });
  });

  app.delete("/api/departments/:id", async (req, res) => {
    await asyncRun("DELETE FROM departments WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  });

  app.get("/api/folders", async (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.json([]);
    const user = await asyncQueryOne("SELECT * FROM users WHERE id = ?", [userId]);
    if (!user) return res.json([]);
    let folders;
    if (user.role === "admin") {
      folders = await asyncQuery("SELECT * FROM folders ORDER BY created_at DESC");
    } else if (user.role === "manager") {
      folders = await asyncQuery("SELECT * FROM folders ORDER BY created_at DESC");
    } else {
      folders = await asyncQuery("SELECT * FROM folders ORDER BY created_at DESC");
    }
    res.json(folders);
  });

  app.post("/api/folders", async (req, res) => {
    const { name, parent_id, role_ids, group_ids, department_ids, userId } = req.body;
    const result = await asyncRun("INSERT INTO folders (name, parent_id, role_ids, group_ids, department_ids, creator_id) VALUES (?, ?, ?, ?, ?, ?)", [name.trim(), parent_id || null, role_ids || "[]", group_ids || "[]", department_ids || "[]", userId]);
    res.json({ success: true, id: result.lastID });
  });

  app.put("/api/folders/:id", async (req, res) => {
    const { name, parent_id, role_ids, group_ids, department_ids } = req.body;
    if (name) await asyncRun("UPDATE folders SET name = ? WHERE id = ?", [name.trim(), req.params.id]);
    if (parent_id !== undefined) await asyncRun("UPDATE folders SET parent_id = ? WHERE id = ?", [parent_id, req.params.id]);
    if (role_ids !== undefined) await asyncRun("UPDATE folders SET role_ids = ? WHERE id = ?", [JSON.stringify(role_ids), req.params.id]);
    if (group_ids !== undefined) await asyncRun("UPDATE folders SET group_ids = ? WHERE id = ?", [JSON.stringify(group_ids), req.params.id]);
    if (department_ids !== undefined) await asyncRun("UPDATE folders SET department_ids = ? WHERE id = ?", [JSON.stringify(department_ids), req.params.id]);
    res.json({ success: true });
  });

  app.delete("/api/folders/:id", async (req, res) => {
    await asyncRun("DELETE FROM files WHERE folder_id = ?", [req.params.id]);
    await asyncRun("DELETE FROM folders WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  });

  app.get("/api/groups", async (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.json([]);
    const user = await asyncQueryOne("SELECT * FROM users WHERE id = ?", [userId]);
    if (!user) return res.json([]);
    if (user.role === "admin") {
      res.json(await asyncQuery("SELECT * FROM groups"));
    } else {
      res.json(await asyncQuery("SELECT * FROM groups"));
    }
  });

  app.get("/api/groups/:groupId/users", async (req, res) => {
    const users = await asyncQuery("SELECT u.id, u.username, u.name, u.avatar FROM users u JOIN user_groups ug ON u.id = ug.user_id WHERE ug.group_id = ?", [req.params.groupId]);
    res.json(users);
  });

  app.post("/api/groups/:id/members", async (req, res) => {
    const { userIds } = req.body;
    for (const uid of userIds) {
      await asyncRun("INSERT OR IGNORE INTO user_groups (user_id, group_id) VALUES (?, ?)", [uid, req.params.id]);
    }
    res.json({ success: true });
  });

  app.delete("/api/groups/:id/members", async (req, res) => {
    const { userId } = req.query;
    if (userId) {
      await asyncRun("DELETE FROM user_groups WHERE group_id = ? AND user_id = ?", [req.params.id, userId]);
    }
    res.json({ success: true });
  });

  app.put("/api/groups/:groupId", async (req, res) => {
    const { name, department_id } = req.body;
    await asyncRun("UPDATE groups SET name = ?, department_id = ? WHERE id = ?", [name, department_id || null, req.params.groupId]);
    res.json({ success: true });
  });

  app.delete("/api/groups/:groupId", async (req, res) => {
    await asyncRun("DELETE FROM user_groups WHERE group_id = ?", [req.params.groupId]);
    await asyncRun("DELETE FROM groups WHERE id = ?", [req.params.groupId]);
    res.json({ success: true });
  });

  app.post("/api/files/batch-delete", async (req, res) => {
    const { fileIds } = req.body;
    for (const id of fileIds) {
      await asyncRun("DELETE FROM files WHERE id = ?", [id]);
    }
    res.json({ success: true });
  });

  app.post("/api/files/move", async (req, res) => {
    const { fileId, folderId } = req.body;
    await asyncRun("UPDATE files SET folder_id = ? WHERE id = ?", [folderId || null, fileId]);
    res.json({ success: true });
  });

  app.post("/api/folders/move", async (req, res) => {
    const { folderId, parentId } = req.body;
    await asyncRun("UPDATE folders SET parent_id = ? WHERE id = ?", [parentId || null, folderId]);
    res.json({ success: true });
  });

  app.post("/api/folders/batch-delete", async (req, res) => {
    const { folderIds } = req.body;
    for (const id of folderIds) {
      await asyncRun("DELETE FROM files WHERE folder_id = ?", [id]);
      await asyncRun("DELETE FROM folders WHERE id = ?", [id]);
    }
    res.json({ success: true });
  });

  app.post("/api/avatar/upload", upload.single("file"), async (req, res) => {
    const file = req.file;
    if (!file) return res.status(400).json({ success: false, message: "未选择文件" });
    res.json({ success: true, url: `/uploads/${file.filename}` });
  });

  app.get("/api/settings", async (req, res) => {
    const settings = await asyncQuery("SELECT * FROM settings");
    const obj: any = {};
    settings.forEach((s: any) => obj[s.key] = s.value);
    res.json(obj);
  });

  app.put("/api/settings", async (req, res) => {
    const settings = req.body;
    for (const [key, value] of Object.entries(settings)) {
      await asyncRun("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)", [key, value as string]);
    }
    res.json({ success: true });
  });

  app.get("/api/my-organization", async (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.json({});
    const user = await asyncQueryOne("SELECT * FROM users WHERE id = ?", [userId]);
    if (!user) return res.json({});
    const deptIds = user.department_ids ? JSON.parse(user.department_ids as string) : [];
    if (deptIds.length === 0) return res.json({});
    const departments = await asyncQuery("SELECT * FROM departments WHERE id IN (" + deptIds.map(() => "?").join(",") + ")", deptIds);
    const groups = await asyncQuery("SELECT g.* FROM groups g JOIN departments d ON g.department_id = d.id WHERE d.id IN (" + deptIds.map(() => "?").join(",") + ")", deptIds);
    res.json({ departments, groups });
  });

  app.use(express.static(path.join(__dirname, "dist"), { index: ["index.html"] }));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "dist", "index.html"));
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server: http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
