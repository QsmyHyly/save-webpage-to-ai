// logger.js - 统一日志模块
// 将日志消息发送到 Service Worker 统一输出

(function() {
  // 日志级别枚举
  const LOG_LEVELS = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
  };

  // 当前脚本标识（用于消息来源）
  const SOURCE = (function() {
    try {
      if (typeof window !== 'undefined') {
        // 内容脚本或弹出页面
        const href = window.location?.href || '';
        if (href.includes('popup') || href.includes('resources')) {
          return 'popup';
        }
        return 'content';
      } else if (typeof self !== 'undefined') {
        // Service Worker
        return 'background';
      }
    } catch (e) {
      // 某些环境可能无法访问
    }
    return 'unknown';
  })();

  // 发送日志消息到后台
  function sendLog(level, args) {
    const message = {
      type: 'LOGGER_MESSAGE',
      level: level,
      source: SOURCE,
      timestamp: Date.now(),
      message: args.map(function(arg) {
        try {
          if (typeof arg === 'object') {
            return JSON.stringify(arg);
          }
          return String(arg);
        } catch {
          return '[不可序列化对象]';
        }
      }).join(' ')
    };

    // 如果是 background 自身，直接输出（避免循环）
    if (SOURCE === 'background') {
      console[level](`[${new Date().toISOString()}] [${SOURCE}]`, ...args);
    } else {
      try {
        chrome.runtime.sendMessage(message).catch(function() {}); // 忽略发送错误
      } catch (e) {
        // 某些环境下可能无法访问 chrome API
        console.log('[Logger] 无法发送日志:', e);
      }
    }
  }

  // 导出日志函数到全局
  window.logger = {
    debug: function() { sendLog('debug', arguments); },
    info: function() { sendLog('info', arguments); },
    warn: function() { sendLog('warn', arguments); },
    error: function() { sendLog('error', arguments); },
    log: function() { sendLog('info', arguments); }
  };
})();
