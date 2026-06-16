# Chat Frontend

基于 Vue 3 + Pinia + Element Plus 的实时聊天前端应用。

---

## 技术栈

- **Vue 3** + Composition API + `<script setup>`
- **Pinia** 状态管理
- **Vue Router** 路由守卫
- **Axios** HTTP 请求
- **Element Plus** UI 组件库
- **原生 WebSocket** 实时通信
- **Vite** 构建工具

---

## 快速开始

```bash
npm install
npm run dev
# 访问 http://localhost:5174
```

---

## 文档索引

### 前端文档（本目录）

| 文档 | 说明 |
|------|------|
| [项目架构](./ARCHITECTURE.md) | 目录结构、技术栈、数据流、开发指南 |
| [组件说明](./COMPONENTS.md) | 所有组件的 Props、Events、使用方式 |
| [API 调用规范](./API_GUIDE.md) | 接口封装、环境变量、错误处理约定 |
| [状态管理](./STATE_MANAGEMENT.md) | Pinia Store 结构、心跳、WebSocket |
| [部署手册](./NGINX_DEPLOYMENT.md) | Nginx、内网穿透、发布流程、故障排查 |

### 后端文档（`../backend_document/`）

| 文档 | 说明 |
|------|------|
| [完整 API 文档](../backend_document/API_DOCUMENTATION.md) | 后端所有接口的详细说明 |
| [错误码说明](../backend_document/ErrorCode.md) | 业务错误码参考 |
| [WebSocket 升级说明](../backend_document/WEBSOCKET_UPGRADE.md) | WebSocket 接入指南 |

---

## 环境要求

- Node.js >= 18
- 后端服务运行于 `localhost:8080`

---

## 命令

```bash
npm run dev       # 启动开发服务器（:5174）
npm run build     # 构建生产版本
npm run preview   # 预览生产构建
```
