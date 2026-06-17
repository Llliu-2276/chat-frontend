# chat-frontend

大二下 Web 课程设计项目 —— 基于 Vue 3 + Element Plus + 原生 WebSocket 的实时聊天应用。

## 快速开始

```bash
npm install          # 安装依赖
npm run dev          # 启动开发服务器 → http://localhost:5174
npm run build        # 生产构建 → dist/
```

> 需要后端服务运行在 `localhost:8080`，详见 [后端 API 文档](backend_document/API_DOCUMENTATION.md)。

## 技术栈

| 技术 | 用途 |
|------|------|
| Vue 3（Composition API + `<script setup>`） | 前端框架 |
| Pinia | 状态管理 |
| Vue Router | 路由 + 导航守卫 |
| Axios | HTTP 请求 |
| Element Plus | UI 组件库 |
| 原生 WebSocket | 实时消息推送 |
| Vite | 构建工具 |

## 文档导航

### 前端文档

| 文档 | 说明 |
|------|------|
| [📖 前端文档总览](frontend_document/README.md) | 技术栈、快速开始、文档索引 |
| [🏗 项目架构](frontend_document/ARCHITECTURE.md) | 目录结构、三层数据流、开发指南 |
| [🧩 组件说明](frontend_document/COMPONENTS.md) | 所有组件的 Props、Events、Expose |
| [🌐 API 调用规范](frontend_document/API_GUIDE.md) | 接口封装、环境变量、WebSocket 消息类型 |
| [🗄 状态管理](frontend_document/STATE_MANAGEMENT.md) | Store 结构、心跳管理、登录流程 |
| [🚀 部署手册](frontend_document/NGINX_DEPLOYMENT.md) | Nginx 配置、内网穿透、发布流程 |

### 后端文档

| 文档 | 说明 |
|------|------|
| [📋 完整 API 文档](backend_document/API_DOCUMENTATION.md) | 所有 REST 接口 + WebSocket 端点 |
| [❌ 错误码说明](backend_document/ErrorCode.md) | 业务错误码参考 |
| [🔌 WebSocket 升级说明](backend_document/WEBSOCKET_UPGRADE.md) | WS 连接流程与协议 |
| [⚡ 快速参考](backend_document/QUICK_REFERENCE.md) | 常用代码片段速查 |
| [📖 后端文档说明](backend_document/FRONTEND_DOCS_README.md) | 文档结构总览 |

## 环境要求

- Node.js >= 18
- Spring Boot 后端运行于 `localhost:8080`
