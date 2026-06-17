/**
 * Vue Router 路由配置
 * 定义应用的所有路由规则和全局守卫
 * 
 * @module router/index
 */
import { createRouter, createWebHistory } from 'vue-router';
import { getToken } from '@/utils/storage';

// 路由配置
const routes = [
  {
    path: '/',
    redirect: '/login',
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { title: '登录', requiresAuth: false },
  },
  {
    path: '/chat',
    name: 'Chat',
    component: () => import('@/views/Chat.vue'),
    meta: { title: '聊天', requiresAuth: true },
  },
];

// 创建路由实例
const router = createRouter({
  history: createWebHistory(),
  routes,
});

/**
 * 全局路由守卫
 * 处理页面标题设置和认证检查
 */
router.beforeEach((to, from, next) => {
  // 设置页面标题
  document.title = to.meta.title || 'Chat';

  // 检查是否需要认证
  const token = getToken();

  if (to.meta.requiresAuth && !token) {
    // 需要登录但未登录，跳转到登录页
    next({
      path: '/login',
      query: { redirect: to.fullPath },
    });
  } else if (to.path === '/login' && token) {
    // 已登录却访问登录页，跳转到聊天页
    next('/chat');
  } else {
    next();
  }
});

export default router;
