# Smart Campus Management System

#### Description
Campus management system

---

## Development Environment (Hot Reload)

```bash
cd /Users/xxxx/educontrol---智慧校园管理系统
npm run dev
```

Visit http://localhost:3000

---

## Deployment Guide

### Option 1: Using the Deployer (Recommended)

1. **Build frontend + bundle backend**
   ```bash
   cd /Users/xxxx/educontrol---智慧校园管理系统
   ./build-deploy.sh
   ```

2. **Deploy using the app**
   - Open the deployer: `/Users/xxxx/edu-deploy/src-tauri/target/release/bundle/macos/智慧校园发布器.app`
   - Select project folder: `/Users/xxxx/Downloads/educontrol---智慧校园管理系统`
   - Click "Deploy"

### Option 2: Manual Deployment

1. **Build frontend**
   ```bash
   npm run build
   ```

2. **Bundle backend**
   ```bash
   npx esbuild server.ts --bundle --platform=node --format=esm --outfile=working-server.js \
     --external:better-sqlite3 --external:multer --external:express --external:xlsx --external:dotenv
   ```

3. **Start server**
   ```bash
   node working-server.js
   ```

---

## Build Script

`build-deploy.sh` executes:
1. `npm run build` - Build React frontend to dist folder
2. `npx esbuild` - Bundle server.ts into working-server.js

The generated `working-server.js` contains the complete backend API and can be run directly with Node.

---

## Directory Structure

```
├── server.ts          # Backend source (TypeScript)
├── working-server.js # Bundled backend (for deployment)
├── dist/             # Frontend build output
├── build-deploy.sh   # One-click build script
├── edu_control.db   # SQLite database
└── uploads/         # Uploaded files directory
```

---

## Notes

- After modifying code, run `build-deploy.sh` again before deploying
- `working-server.js` must be in the same directory as the `dist` folder
- Default port: 3000
