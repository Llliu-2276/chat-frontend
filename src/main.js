/**
 * 应用入口文件
 * 创建 Vue 应用实例，配置插件和全局状态
 * 
 * @module main
 */
import { createApp } from 'vue';
import './style.css';
import './assets/shared.css';
import App from './App.vue';
import router from './router';
import pinia from './stores';
import { useUserStore } from './stores/user';
// 引入 Element Plus
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';

// 创建 Vue 应用实例
const app = createApp(App);

// 注册所有 Element Plus 图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}

// 使用插件
app.use(pinia);
app.use(router);
app.use(ElementPlus);

// 初始化用户状态
const userStore = useUserStore();
userStore.initUserState();

// 挂载应用
app.mount('#app');
