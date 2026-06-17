# Chat 前端项目架构文档

> **技术栈**: Vue 3 + Vue Router + Pinia + Axios + Element Plus + Vite  
> **创建日期**: 2026-05-27  
> **最后更新**: 2026-06-10

---

## 一、项目目录结构

```
chat_frontend/
├── backend_document/              # 后端 API 文档（后端提供）
│   ├── API_DOCUMENTATION.md       # 完整 API 文档
│   ├── ErrorCode.md               # 错误码说明
│   ├── WEBSOCKET_UPGRADE.md       # WebSocket 升级说明
│   └── ...
│
├── frontend_document/             # 前端开发文档
│   ├── ARCHITECTURE.md            # 项目架构（本文档）
│   ├── COMPONENTS.md              # 组件说明
│   ├── API_GUIDE.md               # API 调用规范
│   ├── STATE_MANAGEMENT.md        # 状态管理说明
│   └── NGINX_DEPLOYMENT.md        # Nginx + 内网穿透部署
│
├── src/
│   ├── api/                       # API 接口层
│   │   ├── request.js             # Axios 封装（拦截器、错误处理）
│   │   ├── auth.js                # 认证接口（登录、注册、登出）
│   │   ├── user.js                # 用户接口（资料、搜索）
│   │   ├── friend.js              # 好友接口（列表、消息、聊天记录）
│   │   └── heartbeat.js           # 心跳接口
│   │
│   ├── assets/                    # 静态资源
│   │   ├── shared.css             # 共享设计令牌（色彩、控件、动画）
│   │   └── loading.png            # 加载图标
│   │
│   ├── components/                # 可复用组件
│   │   ├── chat/                  # 聊天子组件
│   │   │   ├── ChatLeftPanel.vue  # 左侧面板（好友/群聊列表）
│   │   │   ├── ChatMessageArea.vue# 消息区域（消息流+输入框）
│   │   │   ├── ChatSidePanel.vue  # 右侧面板（容器：搜索/群聊/资料入口）
│   │   │   ├── ChatProfileCard.vue# 个人资料卡片（本人/好友/陌生人）
│   │   │   ├── ChatNotificationPanel.vue # 通知面板（好友申请气泡流）
│   │   │   └── index.js           # 统一导出
│   │   └── common/
│   │       └── GlobalLoading.vue  # 全局加载遮罩
│   │
│   ├── router/                    # 路由配置
│   │   └── index.js               # Vue Router + 路由守卫
│   │
│   ├── stores/                    # 状态管理（Pinia）
│   │   ├── index.js               # Pinia 入口
│   │   └── user.js                # 用户 Store
│   │
│   ├── types/                     # 类型定义（JSDoc 格式）
│   │   └── index.js               # ApiResponse、UserInfo 等
│   │
│   ├── utils/                     # 工具类
│   │   ├── storage.js             # localStorage 封装
│   │   ├── heartbeat.js           # 心跳管理器（单例）
│   │   └── websocket.js           # WebSocket 管理器（单例）
│   │
│   ├── composables/               # 业务逻辑（Composables）
│   │   ├── useFriendList.js       # 好友/群聊列表管理
│   │   ├── useChatMessages.js     # 聊天消息管理
│   │   ├── useNotifications.js    # 好友申请通知流
│   │   ├── useSidePanel.js        # 侧面板状态和搜索
│   │   └── useProfile.js          # 个人资料操作
│   │
│   ├── views/                     # 页面组件
│   │   ├── Login.vue              # 登录/注册页（遮罩切换）
│   │   └── Chat.vue               # 聊天主页（容器组件）
│   │
│   ├── App.vue                    # 根组件（全局 provide）
│   ├── main.js                    # 应用入口
│   └── style.css                  # 全局基础样式
│
├── .env                           # 公共环境变量
├── .env.development               # 开发环境变量
├── .env.production                # 生产环境变量
├── nginx.conf                     # Nginx 配置文件
├── vite.config.js                 # Vite 配置
├── package.json                   # 项目依赖
└── README.md                      # 项目说明
```

---

## 二、技术栈

| 类别 | 技术 | 版本 |
|------|------|------|
| 框架 | Vue 3 (Composition API) | 3.5 |
| 路由 | Vue Router | 4.6 |
| 状态管理 | Pinia | 3.0 |
| UI 库 | Element Plus | 2.14 |
| HTTP | Axios | 1.16 |
| 实时通信 | 原生 WebSocket | — |
| 构建工具 | Vite | 5.4 |

---

## 三、核心功能模块

| 模块 | 状态 | 说明 |
|------|------|------|
| 用户认证 | ✅ 已完成 | 登录、注册、登出、JWT Token 管理 |
| 用户资料 | ⚠️ API 已封装 | 获取/修改用户信息、修改密码（页面待实现） |
| 好友系统 | ✅ 已完成 | 好友列表、添加/删除好友、搜索用户 |
| 消息收发 | ✅ 已完成 | WebSocket 优先 + REST 降级、乐观更新、已读回执 |
| 在线状态 | ✅ 已完成 | HTTP 心跳 + WebSocket 推送双重机制 |
| 群聊系统 | ✅ 已完成 | 群列表、创建、消息收发（WS+HTTP）、群资料、解散/退出 |

---

## 四、数据流架构

```
┌──────────────────────────────────────────────────────┐
│                    Vue 组件层                         │
│  Login.vue / Chat.vue                                │
└──────────────────┬───────────────────────────────────┘
                   │ 调用 Store Action / 直接调用 API
                   ▼
┌──────────────────────────────────────────────────────┐
│               Pinia Store 层                         │
│  useUserStore（登录/登出/用户信息/心跳/WS 生命周期）     │
└──────────────────┬───────────────────────────────────┘
                   │ 调用 API 函数
                   ▼
┌──────────────────────────────────────────────────────┐
│                 API 接口层                            │
│  auth.js / user.js / friend.js / heartbeat.js        │
│  → request.js（Axios 封装 + 拦截器）                   │
└──────────────────┬───────────────────────────────────┘
                   │ HTTP 请求
                   ▼
┌──────────────────────────────────────────────────────┐
│              Nginx 反向代理层                          │
│  /api/* → localhost:8080    /ws/* → localhost:8080   │
└──────────────────┬───────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────┐
│           Spring Boot 后端（:8080）                    │
└──────────────────────────────────────────────────────┘
```

---

## 五、路由配置

| 路径 | 组件 | 认证 | 说明 |
|------|------|------|------|
| `/` | — | — | 重定向到 `/login` |
| `/login` | Login.vue | ❌ | 登录/注册页 |
| `/chat` | Chat.vue | ✅ | 聊天主页 |
| `/profile` | Profile.vue | ✅ | 个人资料页 |
| `/search` | Search.vue | ✅ | 搜索用户页 |

**守卫逻辑**：未认证 → 跳登录（带 redirect）；已登录访问登录页 → 跳聊天。

---

## 六、设计系统

### 主色调

| 令牌 | 值 | 用途 |
|------|-----|------|
| `--primary-color` | `#11998e` | 主色 |
| `--primary-light` | `#38ef7d` | 主色亮 |
| `--accent-color` | `#62d2a2` | 辅助色 |
| `--accent-light` | `#9df3c4` | 辅助亮色 |
| `--primary-gradient` | `linear-gradient(135deg, #11998e, #38ef7d)` | 主渐变 |

### 视觉风格

- 磨砂玻璃效果（`backdrop-filter: blur(20px)`）
- 弹性动画（`cubic-bezier(0.68, -0.55, 0.27, 1.55)`）
- 圆角卡片（`16px`）
- 统一加载图标（`loading.png` 旋转动画）

---

## 七、开发指南

### 添加新页面

1. 在 `src/views/` 创建 Vue 组件
2. 在 `src/router/index.js` 添加路由（设置 `meta.requiresAuth`）
3. 如需认证保护，设 `requiresAuth: true`

### 添加新 API

1. 在 `src/api/` 创建模块文件，导入 `request` 并导出函数
2. 在 Store Action 或组件中调用
3. 处理返回值：`res.code === 200` 取 `res.data`

### 添加新 Store

1. 在 `src/stores/` 创建文件，使用 `defineStore` + Composition API 风格
2. 在 `stores/index.js` 中无需修改（Pinia 自动注册）
3. 组件中通过 `useXxxStore()` 使用

---

**文档版本**: v2.0 | **最后更新**: 2026-06-10
