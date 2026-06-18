/**
 * 时间格式化工具
 * 统一消息/通知列表中的时间展示和分隔线逻辑
 *
 * @module utils/time
 */

/**
 * 格式化时间为 HH:mm
 * @param {string} t - ISO 时间字符串（如 "2025-06-18T14:30:00"）
 * @returns {string} 格式化的时间字符串 "14:30"
 */
export function formatTime(t) {
  if (!t) return '';
  const normalized = t.replace('T', ' ');
  return normalized.length >= 16 ? normalized.slice(11, 16) : normalized;
}

/**
 * 格式化时间分隔线标签（智能日期标签）
 * - 今天：显示时间 "14:30"
 * - 昨天："昨天 14:30"
 * - 本周内："周一 14:30"
 * - 今年内："6月18日 14:30"
 * - 往年："2024年6月18日 14:30"
 *
 * @param {string} timeStr - ISO 时间字符串
 * @returns {string} 格式化后的标签
 */
export function formatDividerLabel(timeStr) {
  if (!timeStr) return '';
  const d = new Date(timeStr.replace('T', ' '));
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today - 86400000);
  const msgDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

  if (msgDate.getTime() === today.getTime()) return time;
  if (msgDate.getTime() === yesterday.getTime()) return `昨天 ${time}`;

  const dayDiff = Math.floor((today - msgDate) / 86400000);
  if (dayDiff < 7) {
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return `${weekDays[d.getDay()]} ${time}`;
  }

  if (d.getFullYear() === now.getFullYear()) {
    return `${d.getMonth() + 1}月${d.getDate()}日 ${time}`;
  }
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${time}`;
}

/**
 * 在消息/通知列表中插入时间分隔线
 * 相邻条目间隔超过阈值时自动插入 `{ _divider: true, key, label }` 对象
 *
 * @param {Array} items - 原始数据列表，每项需含时间字段
 * @param {string} timeKey - 时间字段名（如 'sendTime'、'createTime'）
 * @param {Object} [options] - 可选配置
 * @param {number} [options.gapMs=300000] - 时间间隔阈值（毫秒），默认 5 分钟
 * @param {Function} [options.keyFn] - 分隔线 key 生成函数，默认 `(i) => \`div-\${i}\``
 * @returns {Array} 混合了分隔线对象的列表
 */
export function insertTimeDividers(items, timeKey, { gapMs = 5 * 60 * 1000, keyFn } = {}) {
  const list = [];
  if (!items || items.length === 0) return list;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (i === 0) {
      list.push({
        _divider: true,
        key: keyFn ? keyFn(0, 'first') : 'div-first',
        label: formatDividerLabel(item[timeKey]),
      });
    } else {
      const prevTime = new Date((items[i - 1][timeKey] || '').replace('T', ' ')).getTime();
      const currTime = new Date((item[timeKey] || '').replace('T', ' ')).getTime();
      if (!isNaN(prevTime) && !isNaN(currTime) && Math.abs(currTime - prevTime) > gapMs) {
        list.push({
          _divider: true,
          key: keyFn ? keyFn(i, item) : `div-${i}`,
          label: formatDividerLabel(item[timeKey]),
        });
      }
    }
    list.push(item);
  }
  return list;
}
