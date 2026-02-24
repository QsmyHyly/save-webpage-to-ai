// logger.js - 统一日志模块
// 将日志消息发送到 Service Worker 统一输出

(function() {
  // 日志级别枚举
  var LOG_LEVELS = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
  };

  // 当前脚本标识（用于消息来源）
  var SOURCE = (function() {
    try {
      // Service Worker 环境
      if (typeof self !== 'undefined' && self.document === undefined) {
        return 'background';
      }
      // 浏览器页面环境
      if (typeof window !== 'undefined') {
        var href = window.location ? window.location.href : '';
        if (href.indexOf('popup') !== -1 || href.indexOf('resources') !== -1) {
          return 'popup';
        }
        return 'content';
      }
    } catch (e) {
      // 忽略错误
    }
    return 'unknown';
  })();

  // 发送日志消息到后台
  function sendLog(level, args) {
    var message = {
      type: 'LOGGER_MESSAGE',
      level: level,
      source: SOURCE,
      timestamp: Date.now(),
      message: Array.prototype.slice.call(args).map(function(arg) {
        try {
          if (typeof arg === 'object') {
            return JSON.stringify(arg);
          }
          return String(arg);
        } catch (e) {
          return '[不可序列化对象]';
        }
      }).join(' ')
    };

    // 如果是 background 自身，直接输出（避免循环）
    if (SOURCE === 'background') {
      console[level]('[' + new Date().toISOString() + '] [' + SOURCE + ']');
      return;
    }

    // 发送到后台
    try {
      chrome.runtime.sendMessage(message, function() {});
    } catch (e) {
      // 某些环境下可能无法访问 chrome API
    }
  }

  // 创建 logger 对象
  var logger = {
    debug: function() { sendLog('debug', arguments); },
    info: function() { sendLog('info', arguments); },
    warn: function() { sendLog('warn', arguments); },
    error: function() { sendLog('error', arguments); },
    log: function() { sendLog('info', arguments); }
  };

  // 将 logger 挂载到全局对象（兼容 Service Worker 和普通页面）
  if (typeof window !== 'undefined') {
    window.logger = logger;
  } else if (typeof self !== 'undefined') {
    self.logger = logger;
  }
})();
