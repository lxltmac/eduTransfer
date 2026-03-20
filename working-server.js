// server.ts
import express from "express";
import Database from "better-sqlite3";
import path from "path";
import multer from "multer";
import * as fs from "fs";
import { fileURLToPath } from "url";
import * as crypto from "crypto";
import * as XLSX from "xlsx";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
var storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const originalName = Buffer.from(file.originalname, "latin1").toString("utf8");
    const sanitizedName = originalName.replace(/[<>:"/\\|?*]/g, "").replace(/\s+/g, "_");
    console.log("[MULTER] Original filename:", originalName);
    console.log("[MULTER] Sanitized filename:", sanitizedName);
    cb(null, uniqueSuffix + "-" + sanitizedName);
  }
});
var limits = {
  fieldNameSize: 200,
  fieldSize: 10 * 1024 * 1024,
  // 10MB
  files: 10,
  fileFieldSize: 10 * 1024 * 1024
};
var upload = multer({
  storage,
  limits,
  fileFilter: (req, file, cb) => {
    cb(null, true);
  },
  preservePath: true
});
var db = new Database("edu_control.db");
db.exec(`
  CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    permissions TEXT NOT NULL -- JSON array of strings
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'teacher', -- admin, teacher, student
    name TEXT NOT NULL,
    avatar TEXT,
    student_id INTEGER,
    FOREIGN KEY(student_id) REFERENCES students(id)
  );

  CREATE TABLE IF NOT EXISTS classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    grade TEXT,
    student_count INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    student_id TEXT UNIQUE,
    class_id INTEGER,
    group_id INTEGER,
    FOREIGN KEY(class_id) REFERENCES classes(id)
  );

  CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    class_id INTEGER,
    FOREIGN KEY(class_id) REFERENCES classes(id)
  );

  CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_url TEXT,
    file_size INTEGER,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    uploader_name TEXT,
    uploader_username TEXT,
    folder_id INTEGER,
    role_ids TEXT,
    group_ids TEXT,
    FOREIGN KEY(student_id) REFERENCES students(id),
    FOREIGN KEY(folder_id) REFERENCES folders(id)
  );

  CREATE TABLE IF NOT EXISTS folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    parent_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    role_ids TEXT,
    group_ids TEXT,
    FOREIGN KEY(parent_id) REFERENCES folders(id)
  );
`);
try {
  const filesColumns = db.prepare("PRAGMA table_info(files)").all();
  const filesColumnNames = filesColumns.map((c) => c.name);
  if (!filesColumnNames.includes("role_ids")) {
    console.log("[MIGRATION] Adding role_ids to files table");
    db.exec("ALTER TABLE files ADD COLUMN role_ids TEXT");
  }
  if (!filesColumnNames.includes("group_ids")) {
    console.log("[MIGRATION] Adding group_ids to files table");
    db.exec("ALTER TABLE files ADD COLUMN group_ids TEXT");
  }
  const foldersColumns = db.prepare("PRAGMA table_info(folders)").all();
  const foldersColumnNames = foldersColumns.map((c) => c.name);
  if (!foldersColumnNames.includes("role_ids")) {
    console.log("[MIGRATION] Adding role_ids to folders table");
    db.exec("ALTER TABLE folders ADD COLUMN role_ids TEXT");
  }
  if (!foldersColumnNames.includes("group_ids")) {
    console.log("[MIGRATION] Adding group_ids to folders table");
    db.exec("ALTER TABLE folders ADD COLUMN group_ids TEXT");
  }
  console.log("[MIGRATION] Permission columns added successfully");
} catch (e) {
  console.log("[MIGRATION] Permission columns already exist or error:", e);
}
try {
  const menusTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='menus'").get();
  if (!menusTableExists) {
    console.log("[MIGRATION] Creating menus table...");
    db.exec(`
      CREATE TABLE menus (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        route TEXT,
        icon TEXT,
        parent_id INTEGER,
        order_index INTEGER DEFAULT 0,
        enabled INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(parent_id) REFERENCES menus(id)
      );
    `);
    const defaultMenus = [
      { name: "\u4EEA\u8868\u76D8", route: "/dashboard", icon: "LayoutDashboard", order_index: 1 },
      { name: "\u73ED\u7EA7\u7BA1\u7406", route: "/classes", icon: "Users", order_index: 2 },
      { name: "\u6587\u4EF6\u7BA1\u7406", route: "/files", icon: "Folder", order_index: 3 },
      { name: "\u5206\u7EC4\u7BA1\u7406", route: "/groups", icon: "UserGroup", order_index: 4 },
      { name: "\u8D26\u53F7\u7BA1\u7406", route: "/accounts", icon: "UserCog", order_index: 5 },
      { name: "\u89D2\u8272\u6743\u9650", route: "/roles", icon: "Shield", order_index: 6 },
      { name: "\u9875\u9762\u7BA1\u7406", route: "/menu", icon: "Menu", order_index: 7 }
    ];
    const insertMenu = db.prepare("INSERT INTO menus (name, route, icon, order_index) VALUES (?, ?, ?, ?)");
    for (const m of defaultMenus) {
      insertMenu.run(m.name, m.route, m.icon, m.order_index);
    }
  }
  const settingsTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='settings'").get();
  if (!settingsTableExists) {
    console.log("[MIGRATION] Creating settings table...");
    db.exec(`
      CREATE TABLE settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    const defaultSettings = [
      { key: "site_name", value: "EduControl" },
      { key: "site_subtitle", value: "Teacher Portal" },
      { key: "theme_color", value: "#3B82F6" }
    ];
    const insertSetting = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)");
    for (const s of defaultSettings) {
      insertSetting.run(s.key, s.value);
    }
  }
  const foldersTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='folders'").get();
  if (!foldersTableExists) {
    console.log("[MIGRATION] Creating folders table...");
    db.exec(`
      CREATE TABLE folders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        parent_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(parent_id) REFERENCES folders(id)
      );
    `);
  }
  const filesColumns = db.prepare("PRAGMA table_info(files)").all();
  const hasFolderId = filesColumns.some((col) => col.name === "folder_id");
  if (!hasFolderId) {
    console.log("[MIGRATION] Adding folder_id column to files table...");
    db.exec("ALTER TABLE files ADD COLUMN folder_id INTEGER REFERENCES folders(id)");
  }
} catch (e) {
  console.error("[MIGRATION] Error:", e);
}
var roleCount = db.prepare("SELECT COUNT(*) as count FROM roles").get().count;
if (roleCount === 0) {
  db.prepare("INSERT INTO roles (name, description, permissions) VALUES (?, ?, ?)").run(
    "admin",
    "\u7CFB\u7EDF\u7BA1\u7406\u5458\uFF0C\u62E5\u6709\u6240\u6709\u6743\u9650",
    JSON.stringify(["view_dashboard", "manage_classes", "manage_files", "manage_groups", "manage_users", "manage_roles"])
  );
  db.prepare("INSERT INTO roles (name, description, permissions) VALUES (?, ?, ?)").run(
    "teacher",
    "\u666E\u901A\u6559\u5E08\uFF0C\u8D1F\u8D23\u73ED\u7EA7\u548C\u5B66\u751F\u6587\u4EF6\u7BA1\u7406",
    JSON.stringify(["view_dashboard", "manage_classes", "manage_files", "manage_groups"])
  );
  db.prepare("INSERT INTO roles (name, description, permissions) VALUES (?, ?, ?)").run(
    "student",
    "\u5B66\u751F\u89D2\u8272\uFF0C\u4EC5\u80FD\u67E5\u770B\u672C\u7EC4\u6587\u4EF6\u5E76\u4E0A\u4F20",
    JSON.stringify(["manage_files"])
  );
}
var studentCount = db.prepare("SELECT COUNT(*) as count FROM students").get().count;
if (studentCount === 0) {
  const classId = db.prepare("INSERT INTO classes (name, grade, student_count) VALUES (?, ?, ?)").run("\u9AD8\u4E8C1\u73ED", "\u9AD8\u4E8C", 3).lastInsertRowid;
  const s1 = db.prepare("INSERT INTO students (name, student_id, class_id) VALUES (?, ?, ?)").run("\u738B\u5C0F\u660E", "S001", classId).lastInsertRowid;
  const s2 = db.prepare("INSERT INTO students (name, student_id, class_id) VALUES (?, ?, ?)").run("\u674E\u534E", "S002", classId).lastInsertRowid;
  const s3 = db.prepare("INSERT INTO students (name, student_id, class_id) VALUES (?, ?, ?)").run("\u5F20\u4E09", "S003", classId).lastInsertRowid;
  db.prepare("INSERT INTO files (student_id, name, file_type, file_url, file_size) VALUES (?, ?, ?, ?, ?)").run(s1, "\u82F1\u8BED\u53E3\u8BED\u7EC3\u4E60.mp3", "audio", "#", 1024 * 1024 * 5);
  db.prepare("INSERT INTO files (student_id, name, file_type, file_url, file_size) VALUES (?, ?, ?, ?, ?)").run(s2, "\u6570\u5B66\u5EFA\u6A21\u62A5\u544A.ppt", "ppt", "#", 1024 * 1024 * 12);
  db.prepare("INSERT INTO files (student_id, name, file_type, file_url, file_size) VALUES (?, ?, ?, ?, ?)").run(s3, "\u7269\u7406\u5B9E\u9A8C\u603B\u7ED3.pdf", "pdf", "#", 1024 * 1024 * 2);
  db.prepare("INSERT INTO files (student_id, name, file_type, file_url, file_size) VALUES (?, ?, ?, ?, ?)").run(s1, "\u6821\u56ED\u98CE\u666F\u6444\u5F71.jpg", "image", "#", 1024 * 1024 * 3);
  db.prepare("INSERT INTO files (student_id, name, file_type, file_url, file_size) VALUES (?, ?, ?, ?, ?)").run(s2, "\u73ED\u4F1A\u6F14\u8BB2\u89C6\u9891.mp4", "video", "#", 1024 * 1024 * 45);
}
db.exec(`
  INSERT OR IGNORE INTO users (username, password, role, name, avatar) 
  VALUES ('admin', 'admin123', 'admin', '\u7CFB\u7EDF\u7BA1\u7406\u5458', 'https://picsum.photos/seed/admin/100/100');
`);
var studentUserCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'student'").get().count;
if (studentUserCount === 0) {
  db.prepare("INSERT OR IGNORE INTO users (username, password, role, name, avatar, student_id) VALUES (?, ?, ?, ?, ?, ?)").run("xiaoming", "123456", "student", "\u738B\u5C0F\u660E", "https://picsum.photos/seed/xiaoming/100/100", 1);
  db.prepare("INSERT OR IGNORE INTO users (username, password, role, name, avatar, student_id) VALUES (?, ?, ?, ?, ?, ?)").run("lihua", "123456", "student", "\u674E\u534E", "https://picsum.photos/seed/lihua/100/100", 2);
}
var groupCount = db.prepare("SELECT COUNT(*) as count FROM groups").get().count;
if (groupCount === 0) {
  const groupId = db.prepare("INSERT INTO groups (name, class_id) VALUES (?, ?)").run("\u53E3\u8BED\u7EC3\u4E60\u5C0F\u7EC4", 1).lastInsertRowid;
  db.prepare("UPDATE students SET group_id = ? WHERE id IN (1, 2)").run(groupId);
}
async function startServer() {
  console.log("[START] Initializing server...");
  console.log("[START] Upload dir:", uploadDir);
  const app = express();
  const PORT = 3e3;
  app.use(express.json());
  app.use("/uploads", express.static(uploadDir));
  console.log("[START] Middleware configured");
  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare(`
      SELECT u.id, u.username, u.role, u.name, u.avatar, u.student_id, r.permissions 
      FROM users u
      LEFT JOIN roles r ON u.role = r.name
      WHERE u.username = ? AND u.password = ?
    `).get(username, password);
    if (user) {
      user.permissions = JSON.parse(user.permissions || "[]");
      res.json({ success: true, user });
    } else {
      res.status(401).json({ success: false, message: "\u7528\u6237\u540D\u6216\u5BC6\u7801\u9519\u8BEF" });
    }
  });
  app.get("/api/roles", (req, res) => {
    const roles = db.prepare("SELECT * FROM roles").all();
    roles.forEach((r) => r.permissions = JSON.parse(r.permissions));
    res.json(roles);
  });
  app.post("/api/roles", (req, res) => {
    const { name, description, permissions } = req.body;
    try {
      db.prepare("INSERT INTO roles (name, description, permissions) VALUES (?, ?, ?)").run(name, description, JSON.stringify(permissions));
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ success: false, message: "\u89D2\u8272\u540D\u5DF2\u5B58\u5728" });
    }
  });
  app.put("/api/roles/:id", (req, res) => {
    const { name, description, permissions } = req.body;
    try {
      const existingRole = db.prepare("SELECT name FROM roles WHERE id = ?").get(req.params.id);
      if (existingRole && (existingRole.name === "admin" || existingRole.name === "teacher")) {
        return res.status(400).json({ success: false, message: "\u7CFB\u7EDF\u9884\u8BBE\u89D2\u8272\u4E0D\u53EF\u4FEE\u6539" });
      }
      db.prepare("UPDATE roles SET name = ?, description = ?, permissions = ? WHERE id = ?").run(name, description, JSON.stringify(permissions), req.params.id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ success: false, message: "\u66F4\u65B0\u5931\u8D25" });
    }
  });
  app.delete("/api/roles/:id", (req, res) => {
    const role = db.prepare("SELECT name FROM roles WHERE id = ?").get(req.params.id);
    if (role && (role.name === "admin" || role.name === "teacher")) {
      return res.status(400).json({ success: false, message: "\u7CFB\u7EDF\u9884\u8BBE\u89D2\u8272\u4E0D\u53EF\u5220\u9664" });
    }
    db.prepare("DELETE FROM roles WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });
  app.get("/api/users", (req, res) => {
    const users = db.prepare("SELECT id, username, role, name, avatar, student_id FROM users").all();
    res.json(users);
  });
  app.post("/api/users", (req, res) => {
    const { username, password, role, name, avatar } = req.body;
    try {
      db.prepare("INSERT INTO users (username, password, role, name, avatar) VALUES (?, ?, ?, ?, ?)").run(username, password, role, name, avatar);
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ success: false, message: "\u7528\u6237\u540D\u5DF2\u5B58\u5728" });
    }
  });
  app.put("/api/users/:id", (req, res) => {
    const { name, role, avatar, password } = req.body;
    try {
      if (password && password.length > 0) {
        const hashedPassword = crypto.createHash("md5").update(password).digest("hex");
        db.prepare("UPDATE users SET name = ?, role = ?, avatar = ?, password = ? WHERE id = ?").run(name, role, avatar, hashedPassword, req.params.id);
      } else {
        db.prepare("UPDATE users SET name = ?, role = ?, avatar = ? WHERE id = ?").run(name, role, avatar, req.params.id);
      }
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ success: false, message: "\u66F4\u65B0\u5931\u8D25" });
    }
  });
  app.delete("/api/users/:id", (req, res) => {
    db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });
  app.post("/api/users/import", upload.single("file"), (req, res) => {
    console.log("[USER IMPORT] Starting import...");
    const file = req.file;
    if (!file) {
      console.log("[USER IMPORT] No file received");
      return res.status(400).json({ success: false, message: "\u8BF7\u9009\u62E9\u6587\u4EF6" });
    }
    console.log("[USER IMPORT] File received:", file.originalname, file.size);
    try {
      const fileName = file.originalname.toLowerCase();
      let data;
      if (fileName.endsWith(".csv") || fileName.endsWith(".txt")) {
        const text = fs.readFileSync(file.path, "utf8");
        const lines = text.split(/\r?\n/).filter((line) => line.trim());
        data = lines.map((line) => {
          let parts = line.split("	");
          if (parts.length === 1) parts = line.split(",");
          return parts.map((p) => p.trim().replace(/^"|"$/g, ""));
        });
      } else {
        const fileContent = fs.readFileSync(file.path);
        const workbook = XLSX.read(fileContent, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        data = jsonData.map((row) => {
          if (Array.isArray(row)) return row;
          return Object.values(row || {});
        });
      }
      console.log("[USER IMPORT] Parsed rows:", data.length);
      if (data.length < 2) {
        return res.status(400).json({ success: false, message: "\u6587\u4EF6\u4E3A\u7A7A\u6216\u683C\u5F0F\u9519\u8BEF" });
      }
      const rows = data.slice(1);
      let count = 0;
      const insertUser = db.prepare("INSERT OR IGNORE INTO users (username, password, role, name, avatar) VALUES (?, ?, ?, ?, ?)");
      rows.forEach((row) => {
        if (!row || !Array.isArray(row)) return;
        const username = String(row[0] || "").trim();
        const password = String(row[1] || "123456").trim();
        const name = String(row[2] || "").trim();
        const role = row[3] ? String(row[3]).trim().toLowerCase() : "student";
        if (!username || !name) return;
        const normalizedRole = role === "\u7BA1\u7406\u5458" || role === "admin" ? "admin" : role === "\u6559\u5E08" || role === "teacher" ? "teacher" : "student";
        try {
          insertUser.run(
            username,
            password,
            normalizedRole,
            name,
            `https://picsum.photos/seed/${username}/100/100`
          );
          count++;
        } catch (e) {
          console.log("[USER IMPORT] Skip duplicate:", username);
        }
      });
      console.log("[USER IMPORT] Success:", count, "users");
      res.json({
        success: true,
        count,
        message: `\u6210\u529F\u5BFC\u5165 ${count} \u4E2A\u8D26\u53F7`
      });
    } catch (error) {
      console.error("[USER IMPORT] Error:", error);
      res.status(500).json({
        success: false,
        message: "\u5BFC\u5165\u5931\u8D25: " + error.message
      });
    }
  });
  app.get("/api/classes", (req, res) => {
    const classes = db.prepare("SELECT * FROM classes").all();
    res.json(classes);
  });
  app.delete("/api/classes/:id", (req, res) => {
    const classId = req.params.id;
    try {
      const students = db.prepare("SELECT id FROM students WHERE class_id = ?").all(classId);
      const studentIds = students.map((s) => s.id);
      if (studentIds.length > 0) {
        db.prepare("UPDATE users SET student_id = NULL WHERE student_id IN (" + studentIds.join(",") + ")").run();
        db.prepare("DELETE FROM files WHERE student_id IN (" + studentIds.join(",") + ")").run();
      }
      db.prepare("DELETE FROM students WHERE class_id = ?").run(classId);
      db.prepare("DELETE FROM groups WHERE class_id = ?").run(classId);
      db.prepare("DELETE FROM classes WHERE id = ?").run(classId);
      res.json({ success: true });
    } catch (e) {
      console.error("[DELETE CLASS] Error:", e);
      res.status(500).json({ success: false, message: "\u5220\u9664\u73ED\u7EA7\u5931\u8D25" });
    }
  });
  app.post("/api/classes/import", upload.single("file"), (req, res) => {
    console.log("[IMPORT] Starting import...");
    const file = req.file;
    if (!file) {
      console.log("[IMPORT] No file received");
      return res.status(400).json({ success: false, message: "\u8BF7\u9009\u62E9\u6587\u4EF6" });
    }
    console.log("[IMPORT] File received:", file.originalname, file.size);
    try {
      const fileName = file.originalname.toLowerCase();
      let data;
      console.log("[IMPORT] File name:", fileName);
      if (fileName.endsWith(".csv") || fileName.endsWith(".txt")) {
        const text = fs.readFileSync(file.path, "utf8");
        const lines = text.split(/\r?\n/).filter((line) => line.trim());
        data = lines.map((line) => {
          let parts = line.split("	");
          if (parts.length === 1) parts = line.split(",");
          return parts.map((p) => p.trim().replace(/^"|"$/g, ""));
        });
      } else {
        const fileContent = fs.readFileSync(file.path);
        const workbook = XLSX.read(fileContent, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        data = jsonData.map((row) => {
          if (Array.isArray(row)) return row;
          return Object.values(row || {});
        });
      }
      console.log("[IMPORT] Parsed rows:", data.length);
      console.log("[IMPORT] First 5 rows:", JSON.stringify(data.slice(0, 5)));
      console.log("[IMPORT] Last 3 rows:", JSON.stringify(data.slice(-3)));
      if (data.length < 2) {
        return res.status(400).json({ success: false, message: "\u6587\u4EF6\u4E3A\u7A7A\u6216\u683C\u5F0F\u9519\u8BEF" });
      }
      const rows = data.slice(1);
      const classMap = /* @__PURE__ */ new Map();
      rows.forEach((row) => {
        if (!row || !Array.isArray(row)) return;
        const className = String(row[0] || "").trim();
        const studentName = String(row[1] || "").trim();
        const studentAccount = row[2] ? String(row[2]).trim() : "";
        const password = row[3] ? String(row[3]).trim() : "123456";
        const permission = row[4] ? String(row[4]).trim() : "\u5B66\u751F";
        const groupName = row[5] ? String(row[5]).trim() : "";
        if (!className || !studentName) return;
        if (!classMap.has(className)) {
          classMap.set(className, []);
        }
        classMap.get(className).push({
          name: studentName,
          account: studentAccount,
          password,
          permission,
          groupName
        });
      });
      console.log("[IMPORT] Classes found:", classMap.size);
      let classCount = 0;
      let studentCount2 = 0;
      const insertClass = db.prepare("INSERT INTO classes (name, grade, student_count) VALUES (?, ?, ?)");
      const insertStudent = db.prepare("INSERT INTO students (name, student_id, class_id) VALUES (?, ?, ?)");
      const insertUser = db.prepare("INSERT OR IGNORE INTO users (username, password, role, name, avatar, student_id) VALUES (?, ?, ?, ?, ?, ?)");
      const importTransaction = db.transaction(() => {
        classMap.forEach((students, className) => {
          const gradeMatch = className.match(/^([一二三四五六七八九零\d]+年级|高[一二三]?[班]?|初[一二三]?)/);
          const grade = gradeMatch ? gradeMatch[1] : "";
          let classId;
          const existingClass = db.prepare("SELECT id FROM classes WHERE name = ?").get(className);
          if (existingClass) {
            classId = existingClass.id;
            const oldStudents = db.prepare("SELECT id FROM students WHERE class_id = ?").all(classId);
            const oldIds = oldStudents.map((s) => s.id);
            if (oldIds.length > 0) {
              db.prepare("UPDATE users SET student_id = NULL WHERE student_id IN (" + oldIds.join(",") + ")").run();
              db.prepare("DELETE FROM files WHERE student_id IN (" + oldIds.join(",") + ")").run();
            }
            db.prepare("DELETE FROM students WHERE class_id = ?").run(classId);
            db.prepare("DELETE FROM groups WHERE class_id = ?").run(classId);
            db.prepare("UPDATE classes SET student_count = ? WHERE id = ?").run(students.length, classId);
          } else {
            const result = insertClass.run(className, grade, students.length);
            classId = result.lastInsertRowid;
            classCount++;
          }
          const groupMap = /* @__PURE__ */ new Map();
          students.forEach((s) => {
            if (s.groupName && !groupMap.has(s.groupName)) {
              const groupResult = db.prepare("INSERT INTO groups (name, class_id) VALUES (?, ?)").run(s.groupName, classId);
              groupMap.set(s.groupName, groupResult.lastInsertRowid);
            }
          });
          students.forEach((s, idx) => {
            const studentIdCode = `${classId}-${idx + 1}`;
            insertStudent.run(s.name, studentIdCode, classId);
            const studentDbId = db.prepare("SELECT id FROM students WHERE student_id = ?").get(studentIdCode);
            if (s.account) {
              insertUser.run(
                s.account,
                s.password,
                s.permission === "\u6559\u5E08" ? "teacher" : "student",
                s.name,
                `https://picsum.photos/seed/${s.account}/100/100`,
                studentDbId?.id || null
              );
            }
            if (s.groupName && groupMap.has(s.groupName)) {
              db.prepare("UPDATE students SET group_id = ? WHERE student_id = ?").run(groupMap.get(s.groupName), studentIdCode);
            }
            studentCount2++;
          });
        });
      });
      importTransaction();
      console.log("[IMPORT] Success:", classCount, "classes,", studentCount2, "students");
      res.json({
        success: true,
        classCount,
        studentCount: studentCount2,
        message: `\u6210\u529F\u5BFC\u5165 ${classCount} \u4E2A\u73ED\u7EA7\uFF0C${studentCount2} \u540D\u5B66\u751F`
      });
    } catch (error) {
      console.error("[IMPORT] Error:", error);
      res.status(500).json({
        success: false,
        message: "\u5BFC\u5165\u5931\u8D25: " + error.message
      });
    }
  });
  app.get("/api/files", (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.json([]);
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
    if (!user) return res.json([]);
    let query = `
      SELECT f.*, st.name as student_name, c.name as class_name 
      FROM files f
      JOIN students st ON f.student_id = st.id
      JOIN classes c ON st.class_id = c.id
    `;
    let params = [];
    let whereClause = "";
    if (user.role === "admin" || user.role === "teacher") {
      query += " ORDER BY f.uploaded_at DESC";
    } else if (user.role === "student" && user.student_id) {
      const student = db.prepare("SELECT group_id FROM students WHERE id = ?").get(user.student_id);
      const userGroupId = student?.group_id || null;
      const conditions = [
        "(f.role_ids IS NULL AND f.group_ids IS NULL)",
        "(f.role_ids LIKE '%student%')",
        "(f.student_id = ?)"
      ];
      params.push(user.student_id);
      if (userGroupId) {
        conditions.push("(EXISTS (SELECT 1 FROM json_each(f.group_ids) WHERE json_each.value = ?))");
        params.push(userGroupId);
      }
      whereClause = " WHERE " + conditions.join(" OR ");
      query += whereClause + " ORDER BY f.uploaded_at DESC";
    } else {
      return res.json([]);
    }
    const files = db.prepare(query).all(...params);
    res.json(files);
  });
  app.post("/api/files", upload.single("file"), (req, res) => {
    console.log("[UPLOAD] Content-Type:", req.get("Content-Type"));
    console.log("[UPLOAD] Headers:", req.headers);
    console.log("[UPLOAD] Body keys:", Object.keys(req.body));
    console.log("[UPLOAD] Body values:", req.body);
    const { studentId, fileType, role_ids, group_ids } = req.body;
    const file = req.file;
    console.log("[UPLOAD] Extracted values:", { studentId, fileType, role_ids, group_ids });
    console.log("[UPLOAD] File info:", { filename: file?.filename, originalname: file?.originalname });
    if (!file) {
      console.log("[UPLOAD] No file received");
      return res.status(400).json({ success: false, message: "\u672A\u9009\u62E9\u6587\u4EF6" });
    }
    const name = Buffer.from(file.originalname, "latin1").toString("utf8");
    const fileSize = file.size;
    const fileUrl = `/uploads/${file.filename}`;
    console.log("[UPLOAD] File processing:", { name, fileSize, fileUrl });
    const uploader = db.prepare("SELECT u.username, u.name FROM users u WHERE u.student_id = ?").get(studentId);
    console.log("[UPLOAD] Uploader:", uploader);
    console.log("[UPLOAD] About to insert:", { studentId, name, fileType, fileUrl, fileSize, uploaderName: uploader?.name || "\u672A\u77E5", uploaderUsername: uploader?.username || "unknown" });
    try {
      const roleIdsJson = role_ids ? JSON.stringify(role_ids) : null;
      const groupIdsJson = group_ids ? JSON.stringify(group_ids) : null;
      const result = db.prepare("INSERT INTO files (student_id, name, file_type, file_url, file_size, uploader_name, uploader_username, role_ids, group_ids) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(studentId, name, fileType, fileUrl, fileSize, uploader?.name || "\u672A\u77E5", uploader?.username || "unknown", roleIdsJson, groupIdsJson);
      console.log("[UPLOAD] Success:", result);
      res.json({ success: true });
    } catch (e) {
      console.error("[UPLOAD] Error:", e);
      res.status(500).json({ success: false, message: "\u4E0A\u4F20\u5931\u8D25" });
    }
  });
  app.delete("/api/files/:id", (req, res) => {
    db.prepare("DELETE FROM files WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });
  app.post("/api/files/batch-delete", (req, res) => {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "\u8BF7\u9009\u62E9\u8981\u5220\u9664\u7684\u6587\u4EF6" });
    }
    try {
      const deleteStmt = db.prepare("DELETE FROM files WHERE id = ?");
      const deleteMany = db.transaction((fileIds) => {
        for (const id of fileIds) deleteStmt.run(id);
      });
      deleteMany(ids);
      res.json({ success: true, message: `\u6210\u529F\u5220\u9664 ${ids.length} \u4E2A\u6587\u4EF6` });
    } catch (e) {
      console.error("[BATCH DELETE] Error:", e);
      res.status(500).json({ success: false, message: "\u6279\u91CF\u5220\u9664\u5931\u8D25" });
    }
  });
  app.post("/api/files/move", (req, res) => {
    const { fileId, fileIds, folderId, targetFolderId } = req.body;
    const fileIdList = fileIds || (fileId ? [fileId] : []);
    const targetId = folderId ?? targetFolderId;
    if (!fileIdList || !Array.isArray(fileIdList) || fileIdList.length === 0) {
      return res.status(400).json({ success: false, message: "\u8BF7\u9009\u62E9\u8981\u79FB\u52A8\u7684\u6587\u4EF6" });
    }
    try {
      const moveStmt = db.prepare("UPDATE files SET folder_id = ? WHERE id = ?");
      const moveMany = db.transaction((ids) => {
        for (const id of ids) moveStmt.run(targetId, id);
      });
      moveMany(fileIdList);
      res.json({ success: true, message: `\u6210\u529F\u79FB\u52A8 ${fileIdList.length} \u4E2A\u6587\u4EF6` });
    } catch (e) {
      console.error("[FILE MOVE] Error:", e);
      res.status(500).json({ success: false, message: "\u79FB\u52A8\u6587\u4EF6\u5931\u8D25" });
    }
  });
  app.get("/api/folders", (req, res) => {
    try {
      const { userId } = req.query;
      if (!userId) {
        return res.json({ success: true, folders: [] });
      }
      const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
      if (!user) {
        return res.json({ success: true, folders: [] });
      }
      let folders;
      if (user.role === "admin" || user.role === "teacher") {
        folders = db.prepare("SELECT * FROM folders ORDER BY created_at DESC").all();
      } else if (user.role === "student" && user.student_id) {
        const student = db.prepare("SELECT group_id FROM students WHERE id = ?").get(user.student_id);
        const userGroupId = student?.group_id || null;
        folders = db.prepare(`
          SELECT DISTINCT f.* FROM folders f
          WHERE (f.role_ids IS NULL AND f.group_ids IS NULL)
             OR (f.role_ids LIKE '%student%')
             OR EXISTS (SELECT 1 FROM json_each(f.group_ids) WHERE json_each.value = ?)
          ORDER BY f.created_at DESC
        `).all(userGroupId);
      } else {
        folders = [];
      }
      res.json({ success: true, folders });
    } catch (e) {
      console.error("[FOLDERS GET] Error:", e);
      res.status(500).json({ success: false, message: "\u83B7\u53D6\u6587\u4EF6\u5939\u5931\u8D25" });
    }
  });
  app.post("/api/folders", (req, res) => {
    const { name, parent_id, role_ids, group_ids } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "\u6587\u4EF6\u5939\u540D\u79F0\u4E0D\u80FD\u4E3A\u7A7A" });
    }
    try {
      const roleIdsJson = role_ids ? JSON.stringify(role_ids) : null;
      const groupIdsJson = group_ids ? JSON.stringify(group_ids) : null;
      const result = db.prepare("INSERT INTO folders (name, parent_id, role_ids, group_ids) VALUES (?, ?, ?, ?)").run(
        name.trim(),
        parent_id || null,
        roleIdsJson,
        groupIdsJson
      );
      res.json({ success: true, folderId: result.lastInsertRowid });
    } catch (e) {
      console.error("[FOLDER CREATE] Error:", e);
      res.status(500).json({ success: false, message: "\u521B\u5EFA\u6587\u4EF6\u5939\u5931\u8D25" });
    }
  });
  app.put("/api/folders/:id", (req, res) => {
    const { name, parentId, role_ids, group_ids } = req.body;
    console.log("[FOLDER UPDATE] name:", name, "parentId:", parentId, "role_ids:", role_ids, "group_ids:", group_ids);
    try {
      if (role_ids !== void 0 || group_ids !== void 0) {
        const roleIdsJson = role_ids ? JSON.stringify(role_ids) : null;
        const groupIdsJson = group_ids ? JSON.stringify(group_ids) : null;
        db.prepare("UPDATE folders SET role_ids = ?, group_ids = ? WHERE id = ?").run(roleIdsJson, groupIdsJson, req.params.id);
      }
      if (parentId !== void 0 && parentId !== null) {
        db.prepare("UPDATE folders SET parent_id = ? WHERE id = ?").run(parentId, req.params.id);
      }
      if (name && name.trim()) {
        db.prepare("UPDATE folders SET name = ? WHERE id = ?").run(name.trim(), req.params.id);
      }
      res.json({ success: true });
    } catch (e) {
      console.error("[FOLDER UPDATE] Error:", e);
      res.status(500).json({ success: false, message: "\u66F4\u65B0\u6587\u4EF6\u5939\u5931\u8D25" });
    }
  });
  app.delete("/api/folders/:id", (req, res) => {
    try {
      const folderId = req.params.id;
      db.prepare("UPDATE files SET folder_id = NULL WHERE folder_id = ?").run(folderId);
      db.prepare("UPDATE folders SET parent_id = NULL WHERE parent_id = ?").run(folderId);
      db.prepare("DELETE FROM folders WHERE id = ?").run(folderId);
      res.json({ success: true });
    } catch (e) {
      console.error("[FOLDER DELETE] Error:", e);
      res.status(500).json({ success: false, message: "\u5220\u9664\u6587\u4EF6\u5939\u5931\u8D25" });
    }
  });
  app.post("/api/folders/batch-delete", (req, res) => {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "\u8BF7\u9009\u62E9\u8981\u5220\u9664\u7684\u6587\u4EF6\u5939" });
    }
    try {
      const deleteFolderStmt = db.prepare("DELETE FROM folders WHERE id = ?");
      const updateFilesStmt = db.prepare("UPDATE files SET folder_id = NULL WHERE folder_id = ?");
      const updateFoldersStmt = db.prepare("UPDATE folders SET parent_id = NULL WHERE parent_id = ?");
      const deleteMany = db.transaction((folderIds) => {
        for (const id of folderIds) {
          updateFilesStmt.run(id);
          updateFoldersStmt.run(id);
          deleteFolderStmt.run(id);
        }
      });
      deleteMany(ids);
      res.json({ success: true, message: `\u6210\u529F\u5220\u9664 ${ids.length} \u4E2A\u6587\u4EF6\u5939` });
    } catch (e) {
      console.error("[FOLDERS BATCH DELETE] Error:", e);
      res.status(500).json({ success: false, message: "\u6279\u91CF\u5220\u9664\u6587\u4EF6\u5939\u5931\u8D25" });
    }
  });
  app.post("/api/folders/move", (req, res) => {
    const { folderIds, targetId } = req.body;
    if (!folderIds || !Array.isArray(folderIds) || folderIds.length === 0) {
      return res.status(400).json({ success: false, message: "\u8BF7\u9009\u62E9\u8981\u79FB\u52A8\u7684\u6587\u4EF6\u5939" });
    }
    try {
      const moveStmt = db.prepare("UPDATE folders SET parent_id = ? WHERE id = ?");
      const moveMany = db.transaction((ids) => {
        for (const id of ids) {
          if (id !== targetId) {
            moveStmt.run(targetId, id);
          }
        }
      });
      moveMany(folderIds);
      res.json({ success: true, message: `\u6210\u529F\u79FB\u52A8 ${folderIds.length} \u4E2A\u6587\u4EF6\u5939` });
    } catch (e) {
      console.error("[FOLDER MOVE] Error:", e);
      res.status(500).json({ success: false, message: "\u79FB\u52A8\u6587\u4EF6\u5939\u5931\u8D25" });
    }
  });
  app.get("/api/menu", (req, res) => {
    try {
      const menus = db.prepare("SELECT * FROM menus ORDER BY order_index").all();
      res.json(Array.isArray(menus) ? menus : []);
    } catch (e) {
      console.error("[MENU GET] Error:", e);
      res.json([]);
    }
  });
  app.post("/api/menu", (req, res) => {
    const { name, route, icon, parent_id, order_index, enabled } = req.body;
    try {
      const result = db.prepare("INSERT INTO menus (name, route, icon, parent_id, order_index, enabled) VALUES (?, ?, ?, ?, ?, ?)").run(name, route, icon, parent_id, order_index, enabled ? 1 : 0);
      res.json({ success: true, id: result.lastInsertRowid });
    } catch (e) {
      console.error("[MENU CREATE] Error:", e);
      res.status(500).json({ success: false, message: "\u521B\u5EFA\u83DC\u5355\u5931\u8D25" });
    }
  });
  app.put("/api/menu", (req, res) => {
    const { id, name, route, icon, parent_id, order_index, enabled } = req.body;
    try {
      db.prepare("UPDATE menus SET name = ?, route = ?, icon = ?, parent_id = ?, order_index = ?, enabled = ? WHERE id = ?").run(name, route, icon, parent_id, order_index, enabled ? 1 : 0, id);
      res.json({ success: true });
    } catch (e) {
      console.error("[MENU UPDATE] Error:", e);
      res.status(500).json({ success: false, message: "\u66F4\u65B0\u83DC\u5355\u5931\u8D25" });
    }
  });
  app.delete("/api/menu", (req, res) => {
    const { id } = req.body;
    try {
      db.prepare("DELETE FROM menus WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (e) {
      console.error("[MENU DELETE] Error:", e);
      res.status(500).json({ success: false, message: "\u5220\u9664\u83DC\u5355\u5931\u8D25" });
    }
  });
  app.get("/api/groups", (req, res) => {
    const { classId } = req.query;
    if (!classId) return res.json([]);
    const groups = db.prepare("SELECT * FROM groups WHERE class_id = ?").all(classId);
    res.json(groups);
  });
  app.get("/api/groups/:classId", (req, res) => {
    const groups = db.prepare("SELECT * FROM groups WHERE class_id = ?").all(req.params.classId);
    res.json(groups);
  });
  app.get("/api/groups/:groupId/students", (req, res) => {
    const students = db.prepare("SELECT id, name, student_id FROM students WHERE group_id = ?").all(req.params.groupId);
    res.json(students);
  });
  app.get("/api/classes/:classId/students", (req, res) => {
    const students = db.prepare("SELECT id, name, student_id, group_id FROM students WHERE class_id = ?").all(req.params.classId);
    res.json(students);
  });
  app.post("/api/groups", (req, res) => {
    const { name, classId, studentIds } = req.body;
    try {
      const info = db.prepare("INSERT INTO groups (name, class_id) VALUES (?, ?)").run(name, classId);
      const groupId = info.lastInsertRowid;
      if (studentIds && studentIds.length > 0) {
        const updateStudent = db.prepare("UPDATE students SET group_id = ? WHERE id = ?");
        const updateMany = db.transaction((ids) => {
          for (const id of ids) updateStudent.run(groupId, id);
        });
        updateMany(studentIds);
      }
      res.json({ success: true, groupId });
    } catch (e) {
      console.error("[GROUP CREATE] Error:", e);
      res.status(500).json({ success: false, message: "\u521B\u5EFA\u5206\u7EC4\u5931\u8D25" });
    }
  });
  app.put("/api/groups/:groupId", (req, res) => {
    const { name, studentIds } = req.body;
    console.log("[GROUP UPDATE] Request:", req.body, "groupId:", req.params.groupId);
    try {
      if (name !== void 0) {
        db.prepare("UPDATE groups SET name = ? WHERE id = ?").run(name, req.params.groupId);
      }
      if (studentIds !== void 0) {
        db.prepare("UPDATE students SET group_id = NULL WHERE group_id = ?").run(req.params.groupId);
        if (studentIds.length > 0) {
          const updateStudent = db.prepare("UPDATE students SET group_id = ? WHERE id = ?");
          for (const id of studentIds) {
            updateStudent.run(req.params.groupId, id);
          }
        }
      }
      res.json({ success: true });
    } catch (e) {
      console.error("[GROUP UPDATE] Error:", e);
      res.status(500).json({ success: false, message: "\u66F4\u65B0\u5206\u7EC4\u5931\u8D25" });
    }
  });
  app.delete("/api/groups/:groupId", (req, res) => {
    try {
      db.prepare("UPDATE students SET group_id = NULL WHERE group_id = ?").run(req.params.groupId);
      db.prepare("DELETE FROM groups WHERE id = ?").run(req.params.groupId);
      res.json({ success: true });
    } catch (e) {
      console.error("[GROUP DELETE] Error:", e);
      res.status(500).json({ success: false, message: "\u5220\u9664\u5206\u7EC4\u5931\u8D25" });
    }
  });
  app.get("/api/students", (req, res) => {
    const { classId } = req.query;
    if (!classId) return res.json([]);
    const students = db.prepare("SELECT id, name, student_id, group_id FROM students WHERE class_id = ?").all(classId);
    res.json(students);
  });
  app.post("/api/students", (req, res) => {
    const { classId, name, studentId } = req.body;
    try {
      const result = db.prepare("INSERT INTO students (class_id, name, student_id) VALUES (?, ?, ?)").run(classId, name, studentId);
      db.prepare("UPDATE classes SET student_count = student_count + 1 WHERE id = ?").run(classId);
      res.json({ success: true, studentId: result.lastInsertRowid });
    } catch (e) {
      console.error("[STUDENT CREATE] Error:", e);
      res.status(500).json({ success: false, message: "\u6DFB\u52A0\u5B66\u751F\u5931\u8D25" });
    }
  });
  app.put("/api/students/:id", (req, res) => {
    const { name, studentId } = req.body;
    try {
      db.prepare("UPDATE students SET name = ?, student_id = ? WHERE id = ?").run(name, studentId, req.params.id);
      res.json({ success: true });
    } catch (e) {
      console.error("[STUDENT UPDATE] Error:", e);
      res.status(500).json({ success: false, message: "\u66F4\u65B0\u5B66\u751F\u5931\u8D25" });
    }
  });
  app.delete("/api/students/:id", (req, res) => {
    try {
      const student = db.prepare("SELECT class_id FROM students WHERE id = ?").get(req.params.id);
      if (student) {
        db.prepare("DELETE FROM students WHERE id = ?").run(req.params.id);
        db.prepare("UPDATE classes SET student_count = student_count - 1 WHERE id = ?").run(student.class_id);
      }
      res.json({ success: true });
    } catch (e) {
      console.error("[STUDENT DELETE] Error:", e);
      res.status(500).json({ success: false, message: "\u5220\u9664\u5B66\u751F\u5931\u8D25" });
    }
  });
  app.get("/api/settings", (req, res) => {
    try {
      const settings = db.prepare("SELECT * FROM settings").all();
      const settingsObj = {};
      settings.forEach((s) => {
        settingsObj[s.key] = s.value;
      });
      res.json(settingsObj);
    } catch (e) {
      console.error("[SETTINGS GET] Error:", e);
      res.status(500).json({ error: "\u83B7\u53D6\u8BBE\u7F6E\u5931\u8D25" });
    }
  });
  app.put("/api/settings", (req, res) => {
    const { key, value } = req.body;
    if (!key) return res.status(400).json({ error: "\u7F3A\u5C11 key \u53C2\u6570" });
    try {
      db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)").run(key, value);
      res.json({ success: true });
    } catch (e) {
      console.error("[SETTINGS UPDATE] Error:", e);
      res.status(500).json({ error: "\u66F4\u65B0\u8BBE\u7F6E\u5931\u8D25" });
    }
  });
  console.log("[START] Using static files...");
  app.use(express.static(path.join(__dirname, "dist"), { index: ["index.html"] }));
  app.get("*", (req, res) => {
    console.log(`[ROUTE] Catch-all route for: ${req.path}`);
    res.sendFile(path.join(__dirname, "dist", "index.html"));
  });
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`\u2705 Server running on http://localhost:${PORT}`);
    console.log(`\u{1F4F1} Frontend: http://localhost:${PORT}`);
    console.log(`\u{1F4CA} API: http://localhost:${PORT}/api/*`);
  });
  server.on("error", (err) => {
    console.error("[START] Server error:", err);
  });
}
startServer().catch((err) => {
  console.error("Server startup error:", err);
  process.exit(1);
});
console.log("Server script loaded");
