/**
 * 下拉菜单 Composable
 * 管理下拉菜单的显示/隐藏、定位跟踪、点击外部关闭
 * 从 ChatLeftPanel 的群聊操作菜单提取
 *
 * @module composables/useDropdown
 */
import { ref, onMounted, onBeforeUnmount } from 'vue';

/**
 * 创建下拉菜单管理器
 * @param {Object} options - 配置
 * @param {import('vue').Ref<HTMLElement|null>} options.triggerRef - 触发按钮的模板 ref
 * @param {number} [options.offsetY=6] - 菜单与按钮的垂直间距 (px)
 * @returns {{ show, position, toggle, close, cleanup }}
 */
export function useDropdown({ triggerRef, offsetY = 6 }) {
  const show = ref(false);
  const position = ref({ top: '0px', right: '0px' });

  let observer = null;

  /** 根据触发按钮位置更新菜单坐标 */
  function recalc() {
    if (!triggerRef.value) return;
    const rect = triggerRef.value.getBoundingClientRect();
    position.value = {
      top: (rect.bottom + offsetY) + 'px',
      right: (window.innerWidth - rect.right) + 'px',
    };
  }

  /** 切换显示/隐藏 */
  function toggle() {
    show.value = !show.value;
    if (show.value) {
      // 下一帧计算位置（DOM 更新后）
      requestAnimationFrame(() => recalc());
      // 启动 DOM 变化监听，保持位置跟随
      if (!observer) {
        observer = new MutationObserver(() => {
          if (show.value) recalc();
        });
        observer.observe(document.body, { childList: true, subtree: true, attributes: true });
      }
    } else {
      if (observer) { observer.disconnect(); observer = null; }
    }
  }

  /** 关闭菜单 */
  function close() {
    show.value = false;
    if (observer) { observer.disconnect(); observer = null; }
  }

  /** 点击外部关闭 */
  function handleClickOutside(e) {
    if (!show.value) return;
    // 检查点击目标是否在触发器或菜单内
    if (triggerRef.value && !triggerRef.value.contains(e.target)) {
      const dropdown = document.querySelector('.dropdown-menu');
      if (dropdown && !dropdown.contains(e.target)) {
        close();
      }
    }
  }

  onMounted(() => {
    document.addEventListener('click', handleClickOutside);
  });

  onBeforeUnmount(() => {
    document.removeEventListener('click', handleClickOutside);
    if (observer) { observer.disconnect(); observer = null; }
  });

  return { show, position, toggle, close };
}
