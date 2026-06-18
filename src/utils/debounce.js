/**
 * 防抖工具
 * 创建可取消的延迟执行函数，用于搜索输入等高频场景
 *
 * @module utils/debounce
 */

/**
 * 创建防抖函数包装器
 * 每次调用前清除上次定时器，延迟指定时间后执行
 *
 * @param {Function} fn - 要防抖的函数
 * @param {number} [delay=300] - 延迟毫秒数
 * @returns {{ invoke: Function, cancel: Function }} 包含 invoke 和 cancel 的对象
 *
 * @example
 * const search = createDebounce(async (keyword) => { ... }, 300);
 * // 在 input 事件中调用
 * search.invoke(keyword);
 * // 在组件卸载时取消
 * search.cancel();
 */
export function createDebounce(fn, delay = 300) {
  let timer = null;

  function invoke(...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  }

  function cancel() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  return { invoke, cancel };
}
