# Nginx + 内网穿透部署操作手册

> 本文档覆盖 Nginx 服务管理、内网穿透配置、前端发布流程、日常运维的完整操作指南。
> 所有命令均在 PowerShell 中执行。

---

## 一、环境信息

| 项目 | 值 |
|------|-----|
| Nginx 安装路径 | `C:\nginx-1.30.2` |
| Nginx 配置文件 | `C:\nginx-1.30.2\conf\nginx.conf` |
| 项目根目录 | `D:\PersonalFiles\WebStormProjects\chat_frontend` |
| 静态资源目录 | `D:\PersonalFiles\WebStormProjects\chat_frontend\dist` |
| 后端地址 | `http://127.0.0.1:8080` |
| Nginx 监听端口 | `80` |
| 内网穿透域名 | `k697a578.natappfree.cc`（natapp） |

---

## 二、系统架构图

```
外网用户浏览器
    │ http://k697a578.natappfree.cc
    ▼
内网穿透工具（natapp）
    │ 端口映射
    ▼
Nginx（本机 :80）
    ├── / 静态文件         → dist/index.html（SPA 兜底）
    ├── /assets/*          → dist/assets/（永久缓存）
    ├── /api/*             → 反向代理 → localhost:8080/api/*
    └── /ws/*              → WebSocket 代理 → localhost:8080/ws/*
```

---

## 三、Nginx 服务管理

> **重要**：Windows 版 Nginx 没有 daemon 模式，启动后会打开一个控制台窗口。
> 使用 `Start-Process -WindowStyle Hidden` 可以后台运行，但停止时需用信号命令。

### 3.1 启动 Nginx

**前提条件**：
- 端口 80 未被其他服务占用（如 IIS）
- `conf/nginx.conf` 配置文件存在且语法正确

**步骤 1：检测端口是否被占用**

```powershell
netstat -ano | findstr ":80 "
```

- **无输出** → 端口空闲，可以继续
- **有输出** → 端口被占用，记下最后一列的 PID，执行 `tasklist | findstr "PID号"` 查看是什么程序

**步骤 2：检测配置文件语法**

```powershell
cd C:\nginx-1.30.2
.\nginx.exe -t
```

期望输出：
```
nginx: the configuration file C:\nginx-1.30.2/conf/nginx.conf syntax is ok
nginx: configuration file C:\nginx-1.30.2/conf/nginx.conf test is successful
```

> 注意：PowerShell 可能将此输出标红（`NativeCommandError`），这是因为 Nginx 输出到 stderr，不代表实际错误。只要看到 `syntax is ok` 和 `test is successful` 就是正常的。

**步骤 3：启动 Nginx**

```powershell
cd C:\nginx-1.30.2
Start-Process -FilePath ".\nginx.exe" -WorkingDirectory "C:\nginx-1.30.2" -WindowStyle Hidden
```

**步骤 4：验证启动成功**

```powershell
Get-Process nginx -ErrorAction SilentlyContinue | Select-Object Id, ProcessName
```

期望输出（应有 2 个进程：master + worker）：
```
   Id ProcessName
   -- -----------
12345 nginx
12346 nginx
```

**步骤 5：验证 HTTP 响应**

```powershell
Invoke-WebRequest -Uri "http://localhost" -UseBasicParsing | Select-Object StatusCode
```

期望输出：
```
StatusCode
----------
       200
```

---

### 3.2 停止 Nginx

Nginx 提供了三种停止方式，按场景选择：

| 方式 | 命令 | 说明 | 适用场景 |
|------|------|------|----------|
| 平滑停止 | `.\nginx.exe -s quit` | 处理完所有当前请求后关闭 | **日常操作首选** |
| 快速停止 | `.\nginx.exe -s stop` | 立即中断所有请求并关闭 | 需要快速停止时 |
| 强制终止 | `taskkill /F /IM nginx.exe` | 强制杀进程 | Nginx 无响应/异常时 |

**平滑停止（推荐）**：

```powershell
cd C:\nginx-1.30.2
.\nginx.exe -s quit
```

**验证已停止**：

```powershell
Get-Process nginx -ErrorAction SilentlyContinue
```

- **无输出** → 已完全停止
- **仍有输出** → 等待几秒后重试；若仍不停止，使用 `taskkill /F /IM nginx.exe` 强制终止

**强制终止（异常情况）**：

```powershell
taskkill /F /IM nginx.exe
```

期望输出：
```
成功: 已终止进程 "nginx.exe"，其 PID 为 12345。
成功: 已终止进程 "nginx.exe"，其 PID 为 12346。
```

---

### 3.3 重启 Nginx

Nginx 没有 `restart` 命令，需手动 **先停后启**：

```powershell
cd C:\nginx-1.30.2

# ① 平滑停止
.\nginx.exe -s quit

# ② 等待进程退出（最多 5 秒）
$timeout = 5
while ((Get-Process nginx -ErrorAction SilentlyContinue) -and $timeout -gt 0) {
    Start-Sleep -Seconds 1
    $timeout--
}

# ③ 若仍在运行则强制终止
if (Get-Process nginx -ErrorAction SilentlyContinue) {
    taskkill /F /IM nginx.exe
}

# ④ 检测配置
.\nginx.exe -t

# ⑤ 启动
Start-Process -FilePath ".\nginx.exe" -WorkingDirectory "C:\nginx-1.30.2" -WindowStyle Hidden

# ⑥ 验证
Get-Process nginx -ErrorAction SilentlyContinue | Select-Object Id, ProcessName
```

> **何时需要重启而非 reload？**
> - `reload` 只重载配置，不重启进程
> - 若 Nginx 进程异常（内存泄漏、僵尸进程等），需要完整重启
> - 更换 `listen` 端口号时需要重启（`reload` 不生效）

---

### 3.4 重载配置（不中断服务）

```powershell
cd C:\nginx-1.30.2

# 先检测语法
.\nginx.exe -t

# 语法正确后重载
.\nginx.exe -s reload
```

`-s reload` 的工作原理：
1. master 进程重新读取配置文件
2. 启动新的 worker 进程（使用新配置）
3. 旧的 worker 进程处理完当前请求后优雅退出
4. **已有连接不会中断**

> **何时用 reload？** 修改了 `nginx.conf` 中的 `location`、`upstream`、缓存策略等配置项时。

---

### 3.5 查看日志

```powershell
# 查看最近 20 条访问日志
Get-Content "C:\nginx-1.30.2\logs\access.log" -Tail 20

# 查看最近 20 条错误日志
Get-Content "C:\nginx-1.30.2\logs\error.log" -Tail 20

# 实时追踪访问日志（类似 Linux tail -f）
Get-Content "C:\nginx-1.30.2\logs\access.log" -Wait -Tail 5
```

---

## 四、内网穿透配置

### 4.1 natapp 端口映射

在 natapp 客户端或网页控制台中，配置端口映射：

```
外网端口（随机或指定） → 本机 127.0.0.1:80
```

> 穿透工具映射的是 Nginx 的 **80 端口**，不是 Vite 开发服务器的 5174 端口。

### 4.2 完整启动流程（从零到可访问）

按以下顺序启动所有服务：

```
① 启动后端 Spring Boot（IDEA 或命令行）
   → 确认 http://localhost:8080 可访问

② 构建前端（如果是首次部署或代码有更新）
   cd D:\PersonalFiles\WebStormProjects\chat_frontend
   npm run build
   → 确认 dist/ 目录已生成

③ 启动 Nginx
   Start-Process -FilePath "C:\nginx-1.30.2\nginx.exe" -WindowStyle Hidden
  验证 Nginx 运行中
   Get-Process nginx | Select-Object Id, ProcessName                   ← 确认进程存在

④ 启动 natapp 内网穿透
   → 在 natapp 客户端启动隧道，获得外网域名

⑤ 验证外网访问
   → 手机或其他设备浏览器打开 http://k697a578.natappfree.cc
   → 确认能看到登录页面
```

**每步验证命令**：

```powershell
# 验证后端（期望返回 JSON 或 401）
Invoke-WebRequest -Uri "http://localhost:8080/api/auth/login" -Method POST -ContentType "application/json" -Body '{}' -UseBasicParsing -ErrorAction SilentlyContinue | Select-Object StatusCode
# 401 或 400 表示后端正常运行

# 验证 Nginx 静态文件（期望返回 200）
Invoke-WebRequest -Uri "http://localhost" -UseBasicParsing | Select-Object StatusCode

# 验证 Nginx API 代理（期望返回非 502）
Invoke-WebRequest -Uri "http://localhost/api/auth/login" -Method POST -ContentType "application/json" -Body '{}' -UseBasicParsing -ErrorAction SilentlyContinue | Select-Object StatusCode
# 401/400 = 正常; 502 = 后端未启动
```

### 4.3 完整停止流程

```
① 停止 natapp 内网穿透
   → natapp 客户端点击「停止」或 Ctrl+C
   → 停止后外网用户立即无法访问

② 停止 Nginx
   cd C:\nginx-1.30.2
   .\nginx.exe -s quit
   → Get-Process nginx                    ← 确认已无进程

③ 停止后端 Spring Boot（可选）
   → IDEA 中点击停止按钮或 Ctrl+C
```

> 停止顺序无严格依赖。但建议先停穿透工具，这样外网用户会先看到"无法连接"而不是"502 错误页面"。

---

## 五、前端更新发布流程

### 5.1 发布原理

```
源代码 (src/)
    │ npm run build (Vite 编译 + 压缩 + hash)
    ▼
dist/ 目录 (index.html + assets/*.js + assets/*.css)
    │ Nginx 直接提供静态服务
    ▼
用户浏览器加载
```

- `npm run build` 会**清空并重新生成**整个 `dist/` 目录
- 构建后的 `.js`/`.css` 文件名包含内容 hash（如 `index-a1b2c3.js`）
- 每次代码变更后 hash 变化，浏览器会自动请求新文件，**无需担心缓存问题**

### 5.2 标准发布（2 步，适合小改动）

```powershell
# ① 在项目根目录重新构建
cd D:\PersonalFiles\WebStormProjects\chat_frontend
npm run build
```

构建成功后会看到类似输出：
```
dist/index.html                  0.46 kB │ gzip:  0.30 kB
dist/assets/index-a1b2c3.css    52.34 kB │ gzip: 12.56 kB
dist/assets/index-d4e5f6.js    245.67 kB │ gzip: 78.90 kB
```

```powershell
# ② 重载 Nginx（让 worker 重新读取文件）
cd C:\nginx-1.30.2
.\nginx.exe -s reload
```

> **注意**：虽然 `dist/` 目录被覆盖后 Nginx 通常会立即提供新文件，但 `reload` 能确保 worker 进程状态完全刷新。

### 5.3 带本地验证的发布（推荐，适合重要更新）

```powershell
cd D:\PersonalFiles\WebStormProjects\chat_frontend

# ① 构建
npm run build

# ② 启动本地预览服务器
npm run preview
# Vite 会在 http://localhost:4173 启动一个静态服务器
# 浏览器打开该地址，检查：
#   □ 页面能正常加载
#   □ 登录功能正常
#   □ 聊天消息收发正常
#   □ 样式无错位
# 确认无误后 Ctrl+C 停止预览

# ③ 重载 Nginx
cd C:\nginx-1.30.2
.\nginx.exe -s reload

# ④ 外网验证
# 手机打开 http://k697a578.natappfree.cc
# Ctrl+Shift+R 强制刷新，确认新版本已生效
```

### 5.4 带回滚准备的发布（适合生产环境）

```powershell
cd D:\PersonalFiles\WebStormProjects\chat_frontend

# ① 备份当前 dist
Copy-Item "dist" "dist_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')" -Recurse

# ② 构建
npm run build

# ③ 重载
.\nginx.exe -s reload

# ④ 验证外网
# 如果发现问题，立即回滚：
# Copy-Item "dist_backup_20260610_143000" "dist" -Recurse -Force
# .\nginx.exe -s reload
```

### 5.5 缓存机制说明

| 资源 | Nginx 缓存头 | 用户端效果 | 更新后行为 |
|------|-------------|-----------|------------|
| `index.html` | `no-cache, no-store` | 每次都重新请求 | reload 后立即加载新版 |
| `assets/*.js` | `Cache-Control: public, immutable` | 永久缓存 | hash 变化 = 新 URL = 自动下载 |
| `assets/*.css` | `Cache-Control: public, immutable` | 永久缓存 | 同上 |
| `chat-logo.png` | 无特殊头 | 浏览器默认缓存 | 如需更新需改文件名或加版本号参数 |

### 5.6 发布常见问题

**Q：发布后用户仍看到旧版本？**
- 原因：`index.html` 被浏览器缓存（少数情况）
- 解决：用户按 `Ctrl+Shift+R` 强制刷新
- 根治：Nginx 配置中 `index.html` 已设置 `no-cache`，正常情况下不会出现

**Q：发布后 CSS/JS 404？**
- 原因：旧 hash 文件已被新构建覆盖，但用户的 `index.html` 还是旧版
- 解决：同上，强制刷新获取新的 `index.html`

**Q：`npm run build` 失败？**
- 检查 Node.js 版本：`node -v`（需 >= 18）
- 检查依赖完整性：`npm install` 重新安装
- 查看具体报错信息

---

## 六、日常维护

### 6.1 磁盘空间检查

```powershell
# 检查日志文件大小
Get-ChildItem "C:\nginx-1.30.2\logs" | Select-Object Name, @{N='Size(KB)';E={[math]::Round($_.Length/1KB,1)}}

# 清理旧日志（保留最近 7 天）
Remove-Item "C:\nginx-1.30.2\logs\*.log" -ErrorAction SilentlyContinue
# 注意：Nginx 运行中删日志后需 reload 才能重新创建文件
```

### 6.2 Nginx 配置修改流程

```powershell
# ① 修改项目中的 nginx.conf
#    文件：D:\PersonalFiles\WebStormProjects\chat_frontend\nginx.conf

# ② 复制到 Nginx 目录
Copy-Item "D:\PersonalFiles\WebStormProjects\chat_frontend\nginx.conf" "C:\nginx-1.30.2\conf\nginx.conf" -Force

# ③ 检测语法
cd C:\nginx-1.30.2
.\nginx.exe -t

# ④ 重载
.\nginx.exe -s reload
```

### 6.3 开机自启（可选）

将启动命令添加到 Windows 启动项：
1. `Win + R` → 输入 `shell:startup` → 回车
2. 创建 `start-nginx.bat` 文件，内容：
```bat
@echo off
cd /d C:\nginx-1.30.2
start /b nginx.exe
```

---

## 七、故障排查

### 7.1 常见问题速查

| 现象 | 原因 | 解决 |
|------|------|------|
| `Get-Process nginx` 无输出 | 配置错误或未启动 | `.\nginx.exe -t` 查看报错 |
| 访问返回 502 | 后端未启动 | 启动 Spring Boot |
| 访问返回 403 | `dist/` 为空 | `npm run build` |
| CSS/JS 加载为纯文本 | `mime.types` 缺失 | 确认 `conf/mime.types` 存在 |
| 刷新页面 404 | 无 `try_files` 配置 | 检查 `location /` 配置 |
| WebSocket 连接失败 | 穿透工具不支持长连接 | 检查穿透工具或换用 frp |
| 端口 80 被占用 | IIS/其他服务占用 | 改 `listen 8088` + 穿透映射 8088 |

### 7.2 端口冲突检查

```powershell
netstat -ano | findstr ":80 "
# 若有输出，说明端口被占用，记下 PID 后查进程名：
tasklist | findstr "PID号"
```

### 7.3 外网无法访问排查清单

```
□ Nginx 是否在运行？         → Get-Process nginx
□ 后端是否在运行？           → 访问 http://localhost:8080
□ 穿透工具是否正常？         → 检查穿透工具客户端状态
□ 端口映射是否正确？         → 穿透映射到本机 80 端口
□ 本机防火墙是否放行？       → Windows 防火墙放行 80 端口
□ 浏览器缓存？              → Ctrl+Shift+R 强制刷新
```

---

## 八、安全注意事项

| 风险 | 现状 | 建议 |
|------|------|------|
| 源码泄露 | ✅ 安全（生产构建只暴露编译代码） | — |
| HTTP 明文 | ⚠️ 密码/Token 明文传输 | 穿透工具若支持 HTTPS 则开启 |
| 无访问控制 | ⚠️ 任何人可访问 | 可加 IP 白名单或 Basic Auth |
| 后端暴露 | ✅ 安全（Nginx 代理隔离） | — |

---

## 九、快速参考卡片

```
┌────────────────────────────────────────────────────────────┐
│  Nginx 启动  cd C:\nginx-1.30.2                           │
│            .\nginx.exe -t                                 │
│            Start-Process .\nginx.exe -WindowStyle Hidden   │
│            Get-Process nginx                              │
│                                                            │
│  Nginx 停止  .\nginx.exe -s quit                         │
│            Get-Process nginx     ← 确认已无进程       │
│                                                            │
│  Nginx 重载  .\nginx.exe -t && .\nginx.exe -s reload      │
│                                                            │
│  前端发布    cd D:\...\chat_frontend && npm run build     │
│            cd C:\nginx-1.30.2 && .\nginx.exe -s reload    │
│                                                            │
│  日志位置    C:\nginx-1.30.2\logs\                         │
│  配置文件    C:\nginx-1.30.2\conf\nginx.conf              │
└────────────────────────────────────────────────────────────┘
```

---

**文档版本**: v2.0 | **最后更新**: 2026-06-10
