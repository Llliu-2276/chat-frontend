/**
 * 拖拽遮罩 Composable
 * 管理登录页 mask ring 的拖拽位置、动画和窗口自适应
 * 从 Login.vue 提取，保持相同的交互语义
 *
 * @module composables/useDragMask
 */
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';

/**
 * 拖拽遮罩管理
 * @param {import('vue').Ref<HTMLElement|null>} containerRef - 登录注册卡片容器 ref
 */
export function useDragMask(containerRef) {
  // ==================== 状态 ====================
  /**
   * maskPosition: 遮罩位置比例 (0 到 1)
   * - 0 = 遮罩在左侧，覆盖注册表单，显示登录表单
   * - 1 = 遮罩在右侧，覆盖登录表单，显示注册表单
   */
  const maskPosition = ref(0);
  const isDragging = ref(false);
  const startX = ref(0);
  const startPosition = ref(0);
  const containerWidth = ref(0);
  const maskWidth = ref(0);

  /**
   * dragDirection: 拖动方向
   * - 'left' = 向左拖动
   * - 'right' = 向右拖动
   * - null = 无拖动
   */
  const dragDirection = ref(null);

  // ==================== 样式计算 ====================
  const maskStyle = computed(() => ({
    transform: `translateX(${maskPosition.value * maskWidth.value}px)`,
    transition: isDragging.value ? 'none' : 'transform 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55)',
  }));

  const leftCurveStyle = computed(() => ({
    transform: `translateX(${maskPosition.value * maskWidth.value}px)`,
    transition: isDragging.value ? 'none' : 'transform 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55)',
  }));

  // ==================== 事件处理 ====================
  function startDrag(e) {
    isDragging.value = true;
    startX.value = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
    startPosition.value = maskPosition.value;
    dragDirection.value = null;

    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchmove', onDrag);
    document.addEventListener('touchend', endDrag);
  }

  function onDrag(e) {
    if (!isDragging.value) return;
    const currentX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
    const deltaX = currentX - startX.value;
    dragDirection.value = deltaX > 0 ? 'right' : deltaX < 0 ? 'left' : dragDirection.value;
    const deltaPosition = deltaX / maskWidth.value;
    maskPosition.value = Math.max(0, Math.min(1, startPosition.value + deltaPosition));
  }

  function endDrag() {
    isDragging.value = false;
    const threshold = (containerWidth.value / 2 - maskWidth.value / 2) / maskWidth.value;
    if (maskPosition.value > threshold) {
      maskPosition.value = 1;
      dragDirection.value = dragDirection.value || 'right';
    } else {
      maskPosition.value = 0;
      dragDirection.value = dragDirection.value || 'left';
    }
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', endDrag);
    document.removeEventListener('touchmove', onDrag);
    document.removeEventListener('touchend', endDrag);
  }

  /** 滑动遮罩到指定位置（用于注册成功后自动切换） */
  function slideTo(position) {
    maskPosition.value = position;
    dragDirection.value = position === 0 ? 'left' : 'right';
  }

  // ==================== 窗口自适应 ====================
  function recalcSizes() {
    if (containerRef.value) {
      containerWidth.value = containerRef.value.offsetWidth;
      maskWidth.value = containerWidth.value / 2;
    }
    const leftCurveUp = document.querySelector('.ring-left-curve-up');
    if (leftCurveUp) {
      const h = leftCurveUp.offsetHeight;
      document.querySelector('.login-page')?.style.setProperty('--left-height', `${h}px`);
    }
  }

  function handleResize() {
    recalcSizes();
  }

  onMounted(() => {
    recalcSizes();
    window.addEventListener('resize', handleResize);
  });

  onBeforeUnmount(() => {
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', endDrag);
    document.removeEventListener('touchmove', onDrag);
    document.removeEventListener('touchend', endDrag);
    window.removeEventListener('resize', handleResize);
  });

  return {
    maskPosition,
    isDragging,
    dragDirection,
    maskStyle,
    leftCurveStyle,
    startDrag,
    slideTo,
  };
}
