import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    host: '0.0.0.0',       // 允许局域网/内网穿透访问
    port: 5174,            // 开发服务器端口
    open: true,            // 自动打开浏览器
    allowedHosts: [
      'k697a578.natappfree.cc',   // natapp 内网穿透域名
      '.natappfree.cc',           // natapp 所有子域名通配
    ]
  }
})
