// options.js - 设置页面逻辑
// 负责管理元素屏蔽规则和配置组

let rules = [];  // 统一的规则数组
let profiles = {};
let currentProfileId = 'default';

// HTML 清理配置
let cleanerConfig = {};

// 默认屏蔽规则（不可变）- 统一结构
const DEFAULT_RULES = [
  { id: 'rule-001', type: 'css', selector: '#doubao-ai-assistant', enabled: true, description: '豆包 AI 助手' },
  { id: 'rule-002', type: 'css', selector: '[aria-label="flow-ai-assistant"]', enabled: true, description: 'AI 助手通用标识' },
  { id: 'rule-003', type: 'css', selector: '.mini-header__logo', enabled: true, description: 'B 站 Logo' },
  { id: 'rule-004', type: 'css', selector: '.ad-banner', enabled: true, description: '广告横幅' },
  { id: 'rule-005', type: 'css', selector: '[data-ad]', enabled: true, description: '广告属性标记' },
  { id: 'rule-006', type: 'css', selector: '.popup-overlay', enabled: true, description: '弹窗遮罩' }
];

// 兼容旧版本的常量（用于迁移）
const DEFAULT_ID_RULES = [
  { selector: '#doubao-ai-assistant', enabled: true, description: '豆包 AI 助手' },
  { selector: '[aria-label="flow-ai-assistant"]', enabled: true, description: 'AI 助手通用标识' },
  { selector: '.mini-header__logo', enabled: true, description: 'B 站 Logo' }
];

const DEFAULT_CLASS_RULES = [
  { selector: '.ad-banner', enabled: true, description: '广告横幅' },
  { selector: '[data-ad]', enabled: true, description: '广告属性标记' },
  { selector: '.popup-overlay', enabled: true, description: '弹窗遮罩' }
];

// 默认主题配置（不可变）
const DEFAULT_THEME_COLORS = {
  primaryColor: '#667eea',
  primaryDark: '#5568d3',
  dangerColor: '#dc3545',
  successColor: '#28a745',
  infoColor: '#17a2b8',
  gradientStart: '#667eea',
  gradientEnd: '#764ba2'
};

// 默认 HTML 清理配置（不可变）
const DEFAULT_CLEANER_CONFIG = {
  trackingLinks: {
    enabled: true,
    maxLength: 2000,
    trackingDomains: [
      'cm.bilibili.com/cm/api',
      'ad.doubleclick.net',
      'pagead2.googlesyndication.com',
      'adservice.google',
      'analytics.google',
      'www.google-analytics.com',
      'www.googletagmanager.com',
      'hm.baidu.com',
      'c.cnzz.com',
      's22.cnzz.com',
      'pos.baidu.com',
      'cpro.baidu.com',
      'eclick.baidu.com',
      'nsclick.baidu.com',
      'ad.toutiao.com',
      'log.toutiao.com',
      'pv.toutiao.com',
      'item.toutiao.com',
      'tracker.toutiao.com',
      'ad.qq.com',
      'c.gdt.qq.com',
      'pgdt.gtimg.cn',
      'mi.gdt.qq.com',
      'e.qq.com',
      'b.qq.com',
      'tajs.qq.com',
      's23.cnzz.com',
      'res.wx.qq.com',
      'weixin.qq.com/cgi-bin/mmwebwx',
      'abtest.cm.bilibili.com',
      'data.bilibili.com',
      'member.bilibili.com/x/web',
      'api.bilibili.com/x/web-interface/nav',
      'api.bilibili.com/x/report',
    ],
    trackingParams: [
      'track_id', 'trackid', 'tracking_id',
      'request_id', 'requestid',
      'session_id', 'sessionid',
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'click_id', 'clickid', 'clickid',
      'ad_id', 'adid',
      'creative_id', 'creativeid',
      'placement_id',
      'from_spmid', 'from_spam',
      'spm_id', 'spmid',
      'scm_id', 'scmid',
      'pvid', 'pv_id',
      'cna', 'sid', 'sids',
      'abtest', 'bucket_id',
      'feid', 'fid',
      'w_uid', 'web_uid',
      'x-b3-traceid', 'x-trace-id',
    ]
  },
  inlineStyles: {
    enabled: true,
    maxStyleSize: 50000,
    preservePatterns: [
      'print',
      '@media print',
      'page-break',
    ],
    removeInjectors: [
      'data-injector="nano"',
      'data-injector="danmaku-x"',
      'data-injector="bili-player"',
      'id="bmgstyle-',
      'class="bili-player',
      'bpx-player',
    ]
  },
  scripts: {
    enabled: true,
    preservePatterns: [
      '__playinfo__',
      '__NEXT_DATA__',
      '__NUXT__',
      'window.__INITIAL_STATE__',
      'videoUrl',
      'streamUrl',
      'playUrl',
      'sourceUrl',
    ],
    removePatterns: [
      'window.webAbTest',
      'window.__MIRROR_CONFIG__',
      'window.__ABTEST__',
      'window.__PRELOAD_STATE__',
      'window.__ssrFirstPageData__',
      'window.__INITIAL_SSR_STATE__',
      'window.__INITIAL_BASE_DATA__',
      'performance.mark',
      'performance.measure',
      '_hmt.push',
      '_czc.push',
      'gtag(',
      'dataLayer.push',
      'sensors.track',
      'sensors.identify',
      'zhuge.track',
      'zhuge.identify',
    ],
    maxScriptSize: 100000,
  },
  general: {
    removeComments: false,
    removeDataAttributes: false,
  }
};

/**
 * 获取所有配置组
 */
async function getProfiles() {
  const result = await chrome.storage.sync.get('profiles');
  return result.profiles || {};
}

/**
 * 获取当前配置组 ID
 */
async function getCurrentProfileId() {
  const result = await chrome.storage.sync.get('currentProfileId');
  return result.currentProfileId || 'default';
}

/**
 * 保存配置组
 */
async function saveProfiles(profiles) {
  await chrome.storage.sync.set({ profiles });
}

/**
 * 保存当前配置组 ID
 */
async function saveCurrentProfileId(profileId) {
  await chrome.storage.sync.set({ currentProfileId: profileId });
}

/**
 * 生成唯一规则 ID
 */
function generateRuleId() {
  return 'rule-' + Date.now() + '-' + Math.random().toString(36).substring(2, 11);
}

/**
 * 迁移旧格式规则到新格式
 * @param {Object} profile - 配置对象
 * @returns {Array} 迁移后的规则数组
 */
function migrateRules(profile) {
  const rules = [];
  
  // 迁移 idRules
  if (profile.idRules && Array.isArray(profile.idRules)) {
    profile.idRules.forEach(r => {
      rules.push({
        id: generateRuleId(),
        type: 'css',
        selector: r.selector,
        enabled: r.enabled !== false,
        description: r.description || ''
      });
    });
  }
  
  // 迁移 classRules
  if (profile.classRules && Array.isArray(profile.classRules)) {
    profile.classRules.forEach(r => {
      rules.push({
        id: generateRuleId(),
        type: 'css',
        selector: r.selector,
        enabled: r.enabled !== false,
        description: r.description || ''
      });
    });
  }
  
  return rules;
}

/**
 * 获取当前配置组的规则
 */
async function getCurrentProfileRules() {
  const p = await getProfiles();
  const pid = await getCurrentProfileId();
  const profile = p[pid];
  
  if (profile) {
    // 新格式：直接返回 rules
    if (profile.rules && Array.isArray(profile.rules)) {
      return { rules: profile.rules };
    }
    // 旧格式：迁移后返回
    if (profile.idRules || profile.classRules) {
      return { rules: migrateRules(profile) };
    }
  }
  
  // 如果配置不存在，返回默认规则
  return { rules: JSON.parse(JSON.stringify(DEFAULT_RULES)) };
}

/**
 * 创建新配置组
 */
async function createProfile(name) {
  const profiles = await getProfiles();
  const id = 'profile_' + Date.now();
  profiles[id] = {
    name: name,
    rules: JSON.parse(JSON.stringify(DEFAULT_RULES)),
    cleanerConfig: JSON.parse(JSON.stringify(DEFAULT_CLEANER_CONFIG)),
    isDefault: false
  };
  await saveProfiles(profiles);
  await saveCurrentProfileId(id);
  return id;
}

/**
 * 删除配置组
 */
async function deleteProfile(profileId) {
  const profiles = await getProfiles();
  delete profiles[profileId];
  
  const currentId = await getCurrentProfileId();
  if (currentId === profileId) {
    // 删除的是当前配置，切换到默认配置
    await saveCurrentProfileId('default');
  }
  
  await saveProfiles(profiles);
}

/**
 * 重命名配置组
 */
async function renameProfile(profileId, newName) {
  const profiles = await getProfiles();
  if (profiles[profileId]) {
    profiles[profileId].name = newName;
    await saveProfiles(profiles);
  }
}

/**
 * 复制配置组
 */
async function duplicateProfile(profileId) {
  const profiles = await getProfiles();
  const source = profiles[profileId];
  if (!source) return null;
  
  const newId = 'profile_' + Date.now();
  
  // 获取源配置的规则（处理新旧格式）
  let sourceRules;
  if (source.rules && Array.isArray(source.rules)) {
    sourceRules = source.rules;
  } else if (source.idRules || source.classRules) {
    sourceRules = migrateRules(source);
  } else {
    sourceRules = DEFAULT_RULES;
  }
  
  profiles[newId] = {
    name: source.name + ' (副本)',
    rules: JSON.parse(JSON.stringify(sourceRules)),
    cleanerConfig: JSON.parse(JSON.stringify(source.cleanerConfig || DEFAULT_CLEANER_CONFIG)),
    isDefault: false
  };
  await saveProfiles(profiles);
  return newId;
}

/**
 * 渲染配置组列表
 */
function renderProfileList() {
  const container = document.getElementById('profileList');
  
  const profileIds = Object.keys(profiles).sort((a, b) => {
    if (a === 'default') return -1;
    if (b === 'default') return 1;
    return 0;
  });

  container.innerHTML = profileIds.map(id => {
    const profile = profiles[id];
    const isActive = id === currentProfileId;
    const isDefault = id === 'default';
    
    return `
      <div class="profile-item ${isActive ? 'active' : ''}" data-id="${id}">
        <div class="profile-info">
          <span class="profile-name">${escapeHtml(profile.name)}</span>
          ${isDefault ? '<span class="profile-badge">默认</span>' : ''}
        </div>
        <div class="profile-actions">
          ${isActive ? '' : `<button class="profile-btn profile-activate" data-id="${id}">使用</button>`}
          <button class="profile-btn profile-duplicate" data-id="${id}" title="复制">📋</button>
          ${isDefault ? '' : `
            <button class="profile-btn profile-rename" data-id="${id}" title="重命名">✏️</button>
            <button class="profile-btn profile-delete" data-id="${id}" title="删除">🗑️</button>
          `}
        </div>
      </div>
    `;
  }).join('');

  // 绑定事件
  container.querySelectorAll('.profile-activate').forEach(btn => {
    btn.addEventListener('click', () => activateProfile(btn.dataset.id));
  });
  
  container.querySelectorAll('.profile-duplicate').forEach(btn => {
    btn.addEventListener('click', () => duplicateProfileAndRefresh(btn.dataset.id));
  });
  
  container.querySelectorAll('.profile-rename').forEach(btn => {
    btn.addEventListener('click', () => renameProfileAndRefresh(btn.dataset.id));
  });
  
  container.querySelectorAll('.profile-delete').forEach(btn => {
    btn.addEventListener('click', () => deleteProfileAndRefresh(btn.dataset.id));
  });
}

/**
 * 激活配置组
 */
async function activateProfile(profileId) {
  await saveCurrentProfileId(profileId);
  currentProfileId = profileId;
  await loadCurrentProfile();
  renderProfileList();
  showToast(`已切换到 "${profiles[profileId].name}"`);
}

/**
 * 删除配置组
 */
async function deleteProfileAndRefresh(profileId) {
  if (!confirm('确定要删除这个配置吗？')) {
    return;
  }
  await deleteProfile(profileId);
  await loadProfiles();
  await loadCurrentProfile();
  renderProfileList();
}

/**
 * 重命名配置组
 */
async function renameProfileAndRefresh(profileId) {
  const profile = profiles[profileId];
  const newName = prompt('请输入新的配置名称：', profile.name);
  if (newName && newName.trim()) {
    await renameProfile(profileId, newName.trim());
    await loadProfiles();
    renderProfileList();
  }
}

/**
 * 复制配置组
 */
async function duplicateProfileAndRefresh(profileId) {
  const newId = await duplicateProfile(profileId);
  if (newId) {
    await loadProfiles();
    renderProfileList();
    showToast('配置已复制');
  }
}

/**
 * 创建新配置组
 */
async function createNewProfile() {
  const name = prompt('请输入新配置的名称：', '新配置');
  if (name && name.trim()) {
    const newId = await createProfile(name.trim());
    await loadProfiles();
    currentProfileId = newId;
    await loadCurrentProfile();
    renderProfileList();
    showToast('新配置已创建');
  }
}

/**
 * 加载所有配置组
 */
async function loadProfiles() {
  profiles = await getProfiles();
  currentProfileId = await getCurrentProfileId();
  
  let migrated = false;
  
  // 确保默认配置存在
  if (!profiles['default']) {
    profiles['default'] = {
      name: '默认配置',
      rules: JSON.parse(JSON.stringify(DEFAULT_RULES)),
      cleanerConfig: JSON.parse(JSON.stringify(DEFAULT_CLEANER_CONFIG)),
      isDefault: true
    };
    migrated = true;
  }
  
  // 迁移旧格式数据
  for (const id in profiles) {
    const profile = profiles[id];
    // 如果存在旧的 idRules 或 classRules 但没有新的 rules，则迁移
    if ((profile.idRules || profile.classRules) && !profile.rules) {
      profile.rules = migrateRules(profile);
      delete profile.idRules;
      delete profile.classRules;
      migrated = true;
    }
  }
  
  // 如果有迁移，保存更新后的配置
  if (migrated) {
    await saveProfiles(profiles);
    console.log('[配置迁移] 已将旧格式规则迁移为统一格式');
  }
}

/**
 * 加载当前配置组的规则
 */
async function loadCurrentProfile() {
  const rulesData = await getCurrentProfileRules();
  rules = rulesData.rules;
  
  renderRuleList(document.getElementById('ruleList'), rules);
  renderAttrRuleList(document.getElementById('attrRuleList'), rules);
  updateCounts();
  
  // 加载 HTML 清理配置
  await loadCleanerConfig();
}

/**
 * 渲染规则列表（统一）
 */
function renderRuleList(container, rulesList) {
  const isDefaultProfile = currentProfileId === 'default';
  const cssRules = rulesList.filter(r => r.type === 'css' || !r.type);
  
  if (!cssRules || cssRules.length === 0) {
    container.innerHTML = '<div class="empty-state">暂无规则</div>';
    return;
  }

  container.innerHTML = cssRules.map((rule, index) => {
    const globalIndex = rulesList.findIndex(r => r.id === rule.id);
    return `
      <div class="rule-item ${rule.enabled ? '' : 'disabled'}">
        <input type="checkbox" class="rule-toggle" data-index="${globalIndex}" ${rule.enabled ? 'checked' : ''} ${isDefaultProfile ? 'disabled' : ''}>
        <div class="rule-info">
          <div class="rule-selector">${escapeHtml(rule.selector)}</div>
          <div class="rule-desc">${escapeHtml(rule.description || '')}${rule.enabled ? '' : '（已禁用）'}</div>
        </div>
        <button class="rule-delete" data-index="${globalIndex}" ${isDefaultProfile ? 'disabled' : ''}>删除</button>
      </div>
    `;
  }).join('');

  // 绑定切换开关事件
  container.querySelectorAll('.rule-toggle').forEach(toggle => {
    toggle.addEventListener('change', (e) => {
      const index = parseInt(e.target.dataset.index);
      rules[index].enabled = e.target.checked;
      renderRuleList(container, rules);
      updateCounts();
    });
  });

  // 绑定删除按钮事件
  container.querySelectorAll('.rule-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      rules.splice(index, 1);
      renderRuleList(container, rules);
      renderAttrRuleList(document.getElementById('attrRuleList'), rules);
      updateCounts();
    });
  });
}

/**
 * 格式化属性条件显示
 */
function formatCondition(cond) {
  const opLabels = {
    'contains': '包含',
    'startsWith': '开头为',
    'endsWith': '结尾为',
    'regex': '正则匹配',
    'length>': '长度>',
    'length<': '长度<',
    'length==': '长度=',
    '>': '数值>',
    '<': '数值<',
    '>=': '数值≥',
    '<=': '数值≤',
    '==': '数值=',
    'exists': '存在'
  };
  const opLabel = opLabels[cond.op] || cond.op;
  if (cond.op === 'exists') {
    return `${cond.attr} ${opLabel}`;
  }
  return `${cond.attr} ${opLabel} ${cond.value}`;
}

/**
 * 渲染属性规则列表
 */
function renderAttrRuleList(container, rulesList) {
  const isDefaultProfile = currentProfileId === 'default';
  const attrRules = rulesList.filter(r => r.type === 'attribute');
  
  if (!attrRules || attrRules.length === 0) {
    container.innerHTML = '<div class="empty-state">暂无属性规则</div>';
    return;
  }

  container.innerHTML = attrRules.map((rule, index) => {
    const globalIndex = rulesList.findIndex(r => r.id === rule.id);
    const conditionsStr = rule.conditions.map(c => formatCondition(c)).join(' 且 ');
    return `
      <div class="rule-item ${rule.enabled ? '' : 'disabled'}">
        <input type="checkbox" class="rule-toggle attr-rule-toggle" data-index="${globalIndex}" ${rule.enabled ? 'checked' : ''} ${isDefaultProfile ? 'disabled' : ''}>
        <div class="rule-info">
          <div class="rule-selector" style="font-size: 12px;">
            ${rule.tag ? `<span style="color: #667eea;">[${rule.tag}]</span> ` : ''}
            ${conditionsStr}
            ${rule.match === 'any' ? '<span style="color: #999;">(任一)</span>' : ''}
          </div>
          <div class="rule-desc">${escapeHtml(rule.description || '')}${rule.enabled ? '' : '（已禁用）'}</div>
        </div>
        <button class="rule-delete attr-rule-delete" data-index="${globalIndex}" ${isDefaultProfile ? 'disabled' : ''}>删除</button>
      </div>
    `;
  }).join('');

  // 绑定切换开关事件
  container.querySelectorAll('.attr-rule-toggle').forEach(toggle => {
    toggle.addEventListener('change', (e) => {
      const index = parseInt(e.target.dataset.index);
      rules[index].enabled = e.target.checked;
      renderAttrRuleList(container, rules);
      updateCounts();
    });
  });

  // 绑定删除按钮事件
  container.querySelectorAll('.attr-rule-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      rules.splice(index, 1);
      renderRuleList(document.getElementById('ruleList'), rules);
      renderAttrRuleList(container, rules);
      updateCounts();
    });
  });
}

/**
 * 更新规则数量显示
 */
function updateCounts() {
  const cssRules = rules.filter(r => r.type === 'css' || !r.type);
  const attrRules = rules.filter(r => r.type === 'attribute');
  document.getElementById('rulesCount').textContent = `${cssRules.length} 条规则`;
  document.getElementById('attrRulesCount').textContent = `${attrRules.length} 条规则`;
}

/**
 * 添加规则（统一）
 */
function addRule() {
  if (currentProfileId === 'default') {
    showToast('默认配置不可修改，请先创建新配置');
    return;
  }

  const selectorInput = document.getElementById('newSelector');
  const descInput = document.getElementById('newDesc');

  const selector = selectorInput.value.trim();
  if (!selector) {
    showToast('请输入选择器');
    return;
  }

  // 验证选择器格式（CSS 选择器）
  try {
    document.querySelector(selector);
  } catch (e) {
    showToast('选择器格式无效');
    return;
  }

  if (rules.some(r => r.selector === selector)) {
    showToast('该选择器已存在');
    return;
  }

  rules.push({
    id: generateRuleId(),
    type: 'css',
    selector: selector,
    enabled: true,
    description: descInput.value.trim() || '自定义规则'
  });

  selectorInput.value = '';
  descInput.value = '';
  renderRuleList(document.getElementById('ruleList'), rules);
  updateCounts();
}

/**
 * 保存当前配置组的规则
 */
async function saveCurrentProfileRules() {
  if (currentProfileId === 'default') {
    showToast('默认配置不可修改');
    return;
  }
  
  profiles[currentProfileId].rules = rules;
  
  // 保存 HTML 清理配置
  profiles[currentProfileId].cleanerConfig = collectCleanerConfigFromUI();
  
  await saveProfiles(profiles);
  showToast('设置已保存');
}

/**
 * 显示提示消息
 */
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2000);
}

/**
 * HTML 转义
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ==================== HTML 清理配置管理 ====================

/**
 * 获取当前配置组的 HTML 清理配置
 */
async function getCurrentProfileCleanerConfig() {
  const p = await getProfiles();
  const pid = await getCurrentProfileId();
  const profile = p[pid];
  
  if (profile && profile.cleanerConfig) {
    return JSON.parse(JSON.stringify(profile.cleanerConfig));
  }
  
  // 如果配置不存在，返回默认配置
  return JSON.parse(JSON.stringify(DEFAULT_CLEANER_CONFIG));
}

/**
 * 加载 HTML 清理配置
 */
async function loadCleanerConfig() {
  cleanerConfig = await getCurrentProfileCleanerConfig();
  renderCleanerConfig();
}

/**
 * 渲染 HTML 清理配置
 */
function renderCleanerConfig() {
  const isDefaultProfile = currentProfileId === 'default';
  
  // 追踪链接配置
  const trackingConfig = cleanerConfig.trackingLinks || DEFAULT_CLEANER_CONFIG.trackingLinks;
  document.getElementById('trackingLinksEnabled').checked = trackingConfig.enabled;
  document.getElementById('trackingLinksEnabled').disabled = isDefaultProfile;
  document.getElementById('trackingLinksMaxLength').value = trackingConfig.maxLength;
  document.getElementById('trackingLinksMaxLength').disabled = isDefaultProfile;
  updateBadge('trackingLinks', trackingConfig.enabled);
  
  renderPatternList('trackingDomainsList', trackingConfig.trackingDomains, 'trackingDomain', isDefaultProfile);
  renderPatternList('trackingParamsList', trackingConfig.trackingParams, 'trackingParam', isDefaultProfile);
  
  // 内联样式配置
  const stylesConfig = cleanerConfig.inlineStyles || DEFAULT_CLEANER_CONFIG.inlineStyles;
  document.getElementById('inlineStylesEnabled').checked = stylesConfig.enabled;
  document.getElementById('inlineStylesEnabled').disabled = isDefaultProfile;
  document.getElementById('inlineStylesMaxSize').value = stylesConfig.maxStyleSize;
  document.getElementById('inlineStylesMaxSize').disabled = isDefaultProfile;
  document.getElementById('inlineStylesSizeKB').textContent = Math.round(stylesConfig.maxStyleSize / 1024);
  updateBadge('inlineStyles', stylesConfig.enabled);
  
  renderPatternList('stylePreservePatternsList', stylesConfig.preservePatterns, 'stylePreserve', isDefaultProfile);
  renderPatternList('styleRemoveInjectorsList', stylesConfig.removeInjectors, 'styleRemove', isDefaultProfile);
  
  // 脚本配置
  const scriptsConfig = cleanerConfig.scripts || DEFAULT_CLEANER_CONFIG.scripts;
  document.getElementById('scriptsEnabled').checked = scriptsConfig.enabled;
  document.getElementById('scriptsEnabled').disabled = isDefaultProfile;
  document.getElementById('scriptsMaxSize').value = scriptsConfig.maxScriptSize;
  document.getElementById('scriptsMaxSize').disabled = isDefaultProfile;
  document.getElementById('scriptsSizeKB').textContent = Math.round(scriptsConfig.maxScriptSize / 1024);
  updateBadge('scripts', scriptsConfig.enabled);
  
  renderPatternList('scriptPreservePatternsList', scriptsConfig.preservePatterns, 'scriptPreserve', isDefaultProfile);
  renderPatternList('scriptRemovePatternsList', scriptsConfig.removePatterns, 'scriptRemove', isDefaultProfile);
  
  // 通用配置
  const generalConfig = cleanerConfig.general || DEFAULT_CLEANER_CONFIG.general;
  document.getElementById('removeComments').checked = generalConfig.removeComments;
  document.getElementById('removeComments').disabled = isDefaultProfile;
  document.getElementById('removeDataAttributes').checked = generalConfig.removeDataAttributes;
  document.getElementById('removeDataAttributes').disabled = isDefaultProfile;
}

/**
 * 更新启用状态徽章
 */
function updateBadge(section, enabled) {
  const badge = document.getElementById(section + 'Badge');
  if (badge) {
    badge.textContent = enabled ? '已启用' : '已禁用';
    badge.className = 'section-badge ' + (enabled ? 'badge-enabled' : 'badge-disabled');
  }
}

/**
 * 渲染模式列表
 */
function renderPatternList(containerId, patterns, type, disabled) {
  const container = document.getElementById(containerId);
  
  if (!patterns || patterns.length === 0) {
    container.innerHTML = '<div class="pattern-item"><span style="color: #999;">暂无配置</span></div>';
    return;
  }
  
  container.innerHTML = patterns.map((pattern, index) => `
    <div class="pattern-item">
      <span class="pattern-text">${escapeHtml(pattern)}</span>
      ${disabled ? '' : `<button class="pattern-delete" onclick="removePattern('${type}', ${index})">×</button>`}
    </div>
  `).join('');
}

/**
 * 切换清理配置区域的展开/折叠
 */
function toggleCleanerSection(section) {
  const content = document.getElementById(section + 'Content');
  const header = document.querySelector(`#${section}Section .cleaner-header`);
  
  if (content.classList.contains('hidden')) {
    content.classList.remove('hidden');
    header.classList.remove('collapsed');
  } else {
    content.classList.add('hidden');
    header.classList.add('collapsed');
  }
}

/**
 * 添加追踪域名
 */
function addTrackingDomain() {
  if (currentProfileId === 'default') {
    showToast('默认配置不可修改，请先创建新配置');
    return;
  }
  
  const input = document.getElementById('newTrackingDomain');
  const value = input.value.trim();
  if (!value) return;
  
  if (!cleanerConfig.trackingLinks) {
    cleanerConfig.trackingLinks = JSON.parse(JSON.stringify(DEFAULT_CLEANER_CONFIG.trackingLinks));
  }
  if (!cleanerConfig.trackingLinks.trackingDomains.includes(value)) {
    cleanerConfig.trackingLinks.trackingDomains.push(value);
    renderPatternList('trackingDomainsList', cleanerConfig.trackingLinks.trackingDomains, 'trackingDomain', false);
  }
  input.value = '';
}

/**
 * 添加追踪参数
 */
function addTrackingParam() {
  if (currentProfileId === 'default') {
    showToast('默认配置不可修改，请先创建新配置');
    return;
  }
  
  const input = document.getElementById('newTrackingParam');
  const value = input.value.trim();
  if (!value) return;
  
  if (!cleanerConfig.trackingLinks) {
    cleanerConfig.trackingLinks = JSON.parse(JSON.stringify(DEFAULT_CLEANER_CONFIG.trackingLinks));
  }
  if (!cleanerConfig.trackingLinks.trackingParams.includes(value)) {
    cleanerConfig.trackingLinks.trackingParams.push(value);
    renderPatternList('trackingParamsList', cleanerConfig.trackingLinks.trackingParams, 'trackingParam', false);
  }
  input.value = '';
}

/**
 * 添加样式保留特征
 */
function addStylePreservePattern() {
  if (currentProfileId === 'default') {
    showToast('默认配置不可修改，请先创建新配置');
    return;
  }
  
  const input = document.getElementById('newStylePreservePattern');
  const value = input.value.trim();
  if (!value) return;
  
  if (!cleanerConfig.inlineStyles) {
    cleanerConfig.inlineStyles = JSON.parse(JSON.stringify(DEFAULT_CLEANER_CONFIG.inlineStyles));
  }
  if (!cleanerConfig.inlineStyles.preservePatterns.includes(value)) {
    cleanerConfig.inlineStyles.preservePatterns.push(value);
    renderPatternList('stylePreservePatternsList', cleanerConfig.inlineStyles.preservePatterns, 'stylePreserve', false);
  }
  input.value = '';
}

/**
 * 添加样式移除特征
 */
function addStyleRemoveInjector() {
  if (currentProfileId === 'default') {
    showToast('默认配置不可修改，请先创建新配置');
    return;
  }
  
  const input = document.getElementById('newStyleRemoveInjector');
  const value = input.value.trim();
  if (!value) return;
  
  if (!cleanerConfig.inlineStyles) {
    cleanerConfig.inlineStyles = JSON.parse(JSON.stringify(DEFAULT_CLEANER_CONFIG.inlineStyles));
  }
  if (!cleanerConfig.inlineStyles.removeInjectors.includes(value)) {
    cleanerConfig.inlineStyles.removeInjectors.push(value);
    renderPatternList('styleRemoveInjectorsList', cleanerConfig.inlineStyles.removeInjectors, 'styleRemove', false);
  }
  input.value = '';
}

/**
 * 添加脚本保留特征
 */
function addScriptPreservePattern() {
  if (currentProfileId === 'default') {
    showToast('默认配置不可修改，请先创建新配置');
    return;
  }
  
  const input = document.getElementById('newScriptPreservePattern');
  const value = input.value.trim();
  if (!value) return;
  
  if (!cleanerConfig.scripts) {
    cleanerConfig.scripts = JSON.parse(JSON.stringify(DEFAULT_CLEANER_CONFIG.scripts));
  }
  if (!cleanerConfig.scripts.preservePatterns.includes(value)) {
    cleanerConfig.scripts.preservePatterns.push(value);
    renderPatternList('scriptPreservePatternsList', cleanerConfig.scripts.preservePatterns, 'scriptPreserve', false);
  }
  input.value = '';
}

/**
 * 添加脚本移除特征
 */
function addScriptRemovePattern() {
  if (currentProfileId === 'default') {
    showToast('默认配置不可修改，请先创建新配置');
    return;
  }
  
  const input = document.getElementById('newScriptRemovePattern');
  const value = input.value.trim();
  if (!value) return;
  
  if (!cleanerConfig.scripts) {
    cleanerConfig.scripts = JSON.parse(JSON.stringify(DEFAULT_CLEANER_CONFIG.scripts));
  }
  if (!cleanerConfig.scripts.removePatterns.includes(value)) {
    cleanerConfig.scripts.removePatterns.push(value);
    renderPatternList('scriptRemovePatternsList', cleanerConfig.scripts.removePatterns, 'scriptRemove', false);
  }
  input.value = '';
}

/**
 * 移除模式项
 */
function removePattern(type, index) {
  switch (type) {
    case 'trackingDomain':
      cleanerConfig.trackingLinks.trackingDomains.splice(index, 1);
      renderPatternList('trackingDomainsList', cleanerConfig.trackingLinks.trackingDomains, 'trackingDomain', false);
      break;
    case 'trackingParam':
      cleanerConfig.trackingLinks.trackingParams.splice(index, 1);
      renderPatternList('trackingParamsList', cleanerConfig.trackingLinks.trackingParams, 'trackingParam', false);
      break;
    case 'stylePreserve':
      cleanerConfig.inlineStyles.preservePatterns.splice(index, 1);
      renderPatternList('stylePreservePatternsList', cleanerConfig.inlineStyles.preservePatterns, 'stylePreserve', false);
      break;
    case 'styleRemove':
      cleanerConfig.inlineStyles.removeInjectors.splice(index, 1);
      renderPatternList('styleRemoveInjectorsList', cleanerConfig.inlineStyles.removeInjectors, 'styleRemove', false);
      break;
    case 'scriptPreserve':
      cleanerConfig.scripts.preservePatterns.splice(index, 1);
      renderPatternList('scriptPreservePatternsList', cleanerConfig.scripts.preservePatterns, 'scriptPreserve', false);
      break;
    case 'scriptRemove':
      cleanerConfig.scripts.removePatterns.splice(index, 1);
      renderPatternList('scriptRemovePatternsList', cleanerConfig.scripts.removePatterns, 'scriptRemove', false);
      break;
  }
}

/**
 * 从 UI 收集 HTML 清理配置
 */
function collectCleanerConfigFromUI() {
  return {
    trackingLinks: {
      enabled: document.getElementById('trackingLinksEnabled').checked,
      maxLength: parseInt(document.getElementById('trackingLinksMaxLength').value) || 2000,
      trackingDomains: cleanerConfig.trackingLinks?.trackingDomains || [...DEFAULT_CLEANER_CONFIG.trackingLinks.trackingDomains],
      trackingParams: cleanerConfig.trackingLinks?.trackingParams || [...DEFAULT_CLEANER_CONFIG.trackingLinks.trackingParams],
    },
    inlineStyles: {
      enabled: document.getElementById('inlineStylesEnabled').checked,
      maxStyleSize: parseInt(document.getElementById('inlineStylesMaxSize').value) || 50000,
      preservePatterns: cleanerConfig.inlineStyles?.preservePatterns || [...DEFAULT_CLEANER_CONFIG.inlineStyles.preservePatterns],
      removeInjectors: cleanerConfig.inlineStyles?.removeInjectors || [...DEFAULT_CLEANER_CONFIG.inlineStyles.removeInjectors],
    },
    scripts: {
      enabled: document.getElementById('scriptsEnabled').checked,
      maxScriptSize: parseInt(document.getElementById('scriptsMaxSize').value) || 100000,
      preservePatterns: cleanerConfig.scripts?.preservePatterns || [...DEFAULT_CLEANER_CONFIG.scripts.preservePatterns],
      removePatterns: cleanerConfig.scripts?.removePatterns || [...DEFAULT_CLEANER_CONFIG.scripts.removePatterns],
    },
    general: {
      removeComments: document.getElementById('removeComments').checked,
      removeDataAttributes: document.getElementById('removeDataAttributes').checked,
    }
  };
}

/**
 * 更新大小显示
 */
function updateSizeDisplay(inputId, displayId) {
  const input = document.getElementById(inputId);
  const display = document.getElementById(displayId);
  if (input && display) {
    display.textContent = Math.round(parseInt(input.value) / 1024);
  }
}

// ==================== 主题配置管理 ====================

/**
 * 获取主题配置
 */
async function getThemeColors() {
  const result = await chrome.storage.sync.get('themeColors');
  return result.themeColors || { ...DEFAULT_THEME_COLORS };
}

/**
 * 保存主题配置
 */
async function saveThemeColors(colors) {
  await chrome.storage.sync.set({ themeColors: colors });
}

/**
 * 应用主题到页面
 */
function applyThemeToPage(colors) {
  const root = document.documentElement;
  root.style.setProperty('--primary-color', colors.primaryColor);
  root.style.setProperty('--primary-dark', colors.primaryDark);
  root.style.setProperty('--danger-color', colors.dangerColor);
  root.style.setProperty('--success-color', colors.successColor);
  root.style.setProperty('--info-color', colors.infoColor);
  root.style.setProperty('--gradient-start', colors.gradientStart);
  root.style.setProperty('--gradient-end', colors.gradientEnd);
}

/**
 * 加载主题配置到 UI
 */
function loadThemeToUI(colors) {
  document.getElementById('primaryColor').value = colors.primaryColor;
  document.getElementById('primaryDark').value = colors.primaryDark;
  document.getElementById('dangerColor').value = colors.dangerColor;
  document.getElementById('successColor').value = colors.successColor;
  document.getElementById('infoColor').value = colors.infoColor;
  document.getElementById('gradientStart').value = colors.gradientStart;
  document.getElementById('gradientEnd').value = colors.gradientEnd;
  
  // 更新预览
  updateColorPreview('primaryColor', colors.primaryColor);
  updateColorPreview('primaryDark', colors.primaryDark);
  updateColorPreview('dangerColor', colors.dangerColor);
  updateColorPreview('successColor', colors.successColor);
  updateColorPreview('infoColor', colors.infoColor);
  updateColorPreview('gradientStart', colors.gradientStart);
  updateColorPreview('gradientEnd', colors.gradientEnd);
}

/**
 * 更新颜色预览
 */
function updateColorPreview(colorId, colorValue) {
  const preview = document.getElementById(colorId + 'Preview');
  const text = document.getElementById(colorId + 'Text');
  if (preview) preview.style.background = colorValue;
  if (text) text.textContent = colorValue;
}

/**
 * 从 UI 收集主题配置
 */
function collectThemeFromUI() {
  return {
    primaryColor: document.getElementById('primaryColor').value,
    primaryDark: document.getElementById('primaryDark').value,
    dangerColor: document.getElementById('dangerColor').value,
    successColor: document.getElementById('successColor').value,
    infoColor: document.getElementById('infoColor').value,
    gradientStart: document.getElementById('gradientStart').value,
    gradientEnd: document.getElementById('gradientEnd').value
  };
}

/**
 * 切换主题区域展开/折叠
 */
function toggleThemeSection() {
  const content = document.getElementById('themeContent');
  const header = document.querySelector('#themeSection .theme-header');
  
  if (content.classList.contains('hidden')) {
    content.classList.remove('hidden');
    header.classList.remove('collapsed');
  } else {
    content.classList.add('hidden');
    header.classList.add('collapsed');
  }
}

/**
 * 重置主题为默认值
 */
async function resetTheme() {
  await saveThemeColors({ ...DEFAULT_THEME_COLORS });
  loadThemeToUI(DEFAULT_THEME_COLORS);
  applyThemeToPage(DEFAULT_THEME_COLORS);
  showToast('主题已重置');
}

/**
 * 初始化主题配置
 */
async function initTheme() {
  const colors = await getThemeColors();
  loadThemeToUI(colors);
  applyThemeToPage(colors);
  
  // 绑定颜色选择器事件
  const colorInputs = ['primaryColor', 'primaryDark', 'dangerColor', 'successColor', 'infoColor', 'gradientStart', 'gradientEnd'];
  colorInputs.forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener('input', (e) => {
        updateColorPreview(id, e.target.value);
        const colors = collectThemeFromUI();
        applyThemeToPage(colors);
      });
    }
  });
  
  // 绑定重置按钮
  document.getElementById('resetThemeBtn').addEventListener('click', resetTheme);
}

// ==================== 属性规则表单管理 ====================

/**
 * 显示属性规则表单
 */
function showAttrRuleForm() {
  if (currentProfileId === 'default') {
    showToast('默认配置不可修改，请先创建新配置');
    return;
  }
  document.getElementById('attrRuleForm').style.display = 'block';
  document.getElementById('addAttrRuleForm').style.display = 'none';
  resetAttrRuleForm();
}

/**
 * 隐藏属性规则表单
 */
function hideAttrRuleForm() {
  document.getElementById('attrRuleForm').style.display = 'none';
  document.getElementById('addAttrRuleForm').style.display = 'block';
  resetAttrRuleForm();
}

/**
 * 重置属性规则表单
 */
function resetAttrRuleForm() {
  document.getElementById('attrRuleTag').value = '';
  document.getElementById('attrRuleMatch').value = 'all';
  document.getElementById('attrRuleDesc').value = '';
  
  const conditionsContainer = document.getElementById('attrConditions');
  conditionsContainer.innerHTML = `
    <div class="attr-condition-item">
      <select class="attr-name">
        <option value="src">src</option>
        <option value="href">href</option>
        <option value="style">style</option>
        <option value="class">class</option>
        <option value="data-src">data-src</option>
        <option value="width">width</option>
        <option value="height">height</option>
        <option value="id">id</option>
      </select>
      <select class="attr-op">
        <option value="contains">包含</option>
        <option value="startsWith">开头为</option>
        <option value="endsWith">结尾为</option>
        <option value="regex">正则匹配</option>
        <option value="length>">长度 &gt;</option>
        <option value="length<">长度 &lt;</option>
        <option value="length==">长度 =</option>
        <option value=">">数值 &gt;</option>
        <option value="<">数值 &lt;</option>
        <option value="==">数值 =</option>
        <option value="exists">属性存在</option>
      </select>
      <input type="text" class="attr-value" placeholder="比较值">
      <button class="btn btn-secondary remove-condition" style="padding: 4px 8px;">×</button>
    </div>
  `;
  
  bindAttrConditionEvents();
}

/**
 * 添加属性条件
 */
function addAttrCondition() {
  const conditionsContainer = document.getElementById('attrConditions');
  const newCondition = document.createElement('div');
  newCondition.className = 'attr-condition-item';
  newCondition.innerHTML = `
    <select class="attr-name">
      <option value="src">src</option>
      <option value="href">href</option>
      <option value="style">style</option>
      <option value="class">class</option>
      <option value="data-src">data-src</option>
      <option value="width">width</option>
      <option value="height">height</option>
      <option value="id">id</option>
    </select>
    <select class="attr-op">
      <option value="contains">包含</option>
      <option value="startsWith">开头为</option>
      <option value="endsWith">结尾为</option>
      <option value="regex">正则匹配</option>
      <option value="length>">长度 &gt;</option>
      <option value="length<">长度 &lt;</option>
      <option value="length==">长度 =</option>
      <option value=">">数值 &gt;</option>
      <option value="<">数值 &lt;</option>
      <option value="==">数值 =</option>
      <option value="exists">属性存在</option>
    </select>
    <input type="text" class="attr-value" placeholder="比较值">
    <button class="btn btn-secondary remove-condition" style="padding: 4px 8px;">×</button>
  `;
  conditionsContainer.appendChild(newCondition);
  
  bindRemoveConditionEvent(newCondition.querySelector('.remove-condition'));
}

/**
 * 绑定属性条件的事件
 */
function bindAttrConditionEvents() {
  document.querySelectorAll('#attrConditions .remove-condition').forEach(btn => {
    bindRemoveConditionEvent(btn);
  });
}

/**
 * 绑定移除条件按钮事件
 */
function bindRemoveConditionEvent(btn) {
  btn.addEventListener('click', () => {
    removeAttrCondition(btn);
  });
}

/**
 * 移除属性条件
 */
function removeAttrCondition(btn) {
  const conditionsContainer = document.getElementById('attrConditions');
  if (conditionsContainer.children.length > 1) {
    btn.parentElement.remove();
  } else {
    showToast('至少需要一个条件');
  }
}

/**
 * 保存属性规则
 */
function saveAttrRule() {
  const tag = document.getElementById('attrRuleTag').value.trim() || null;
  const match = document.getElementById('attrRuleMatch').value;
  const desc = document.getElementById('attrRuleDesc').value.trim();
  
  const conditionItems = document.querySelectorAll('#attrConditions .attr-condition-item');
  const conditions = [];
  
  conditionItems.forEach(item => {
    const attr = item.querySelector('.attr-name').value;
    const op = item.querySelector('.attr-op').value;
    const value = item.querySelector('.attr-value').value.trim();
    
    if (op === 'exists') {
      conditions.push({ attr, op });
    } else if (value) {
      conditions.push({ attr, op, value });
    }
  });
  
  if (conditions.length === 0) {
    showToast('请至少添加一个有效条件');
    return;
  }
  
  rules.push({
    id: generateRuleId(),
    type: 'attribute',
    tag: tag,
    conditions: conditions,
    match: match,
    enabled: true,
    description: desc || '属性筛选规则'
  });
  
  renderAttrRuleList(document.getElementById('attrRuleList'), rules);
  updateCounts();
  hideAttrRuleForm();
  showToast('属性规则已添加');
}

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  // 初始化主题
  await initTheme();
  
  await loadProfiles();
  await loadCurrentProfile();
  renderProfileList();

  // 绑定事件
  document.getElementById('createProfileBtn').addEventListener('click', createNewProfile);
  document.getElementById('addRuleBtn').addEventListener('click', addRule);
  document.getElementById('saveAllBtn').addEventListener('click', async () => {
    await saveCurrentProfileRules();
    // 同时保存主题配置
    const themeColors = collectThemeFromUI();
    await saveThemeColors(themeColors);
  });

  // 回车添加规则
  document.getElementById('newSelector').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addRule();
  });
  document.getElementById('newDesc').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addRule();
  });

  // HTML 清理配置 - 启用状态变化监听
  document.getElementById('trackingLinksEnabled').addEventListener('change', (e) => {
    updateBadge('trackingLinks', e.target.checked);
  });
  document.getElementById('inlineStylesEnabled').addEventListener('change', (e) => {
    updateBadge('inlineStyles', e.target.checked);
  });
  document.getElementById('scriptsEnabled').addEventListener('change', (e) => {
    updateBadge('scripts', e.target.checked);
  });

  // 大小输入框变化监听
  document.getElementById('inlineStylesMaxSize').addEventListener('input', () => {
    updateSizeDisplay('inlineStylesMaxSize', 'inlineStylesSizeKB');
  });
  document.getElementById('scriptsMaxSize').addEventListener('input', () => {
    updateSizeDisplay('scriptsMaxSize', 'scriptsSizeKB');
  });

  // 回车添加清理配置项
  document.getElementById('newTrackingDomain').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTrackingDomain();
  });
  document.getElementById('newTrackingParam').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTrackingParam();
  });
  document.getElementById('newStylePreservePattern').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addStylePreservePattern();
  });
  document.getElementById('newStyleRemoveInjector').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addStyleRemoveInjector();
  });
  document.getElementById('newScriptPreservePattern').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addScriptPreservePattern();
  });
  document.getElementById('newScriptRemovePattern').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addScriptRemovePattern();
  });

  // 清理器区域头部点击事件
  document.querySelectorAll('.cleaner-header[data-section]').forEach(header => {
    header.addEventListener('click', () => {
      toggleCleanerSection(header.dataset.section);
    });
  });

  // 主题区域头部点击事件
  document.getElementById('themeHeader').addEventListener('click', toggleThemeSection);

  // 添加清理配置项按钮事件
  document.getElementById('addTrackingDomainBtn').addEventListener('click', addTrackingDomain);
  document.getElementById('addTrackingParamBtn').addEventListener('click', addTrackingParam);
  document.getElementById('addStylePreservePatternBtn').addEventListener('click', addStylePreservePattern);
  document.getElementById('addStyleRemoveInjectorBtn').addEventListener('click', addStyleRemoveInjector);
  document.getElementById('addScriptPreservePatternBtn').addEventListener('click', addScriptPreservePattern);
  document.getElementById('addScriptRemovePatternBtn').addEventListener('click', addScriptRemovePattern);

  // 属性规则表单事件
  document.getElementById('showAttrRuleFormBtn').addEventListener('click', showAttrRuleForm);
  document.getElementById('saveAttrRuleBtn').addEventListener('click', saveAttrRule);
  document.getElementById('cancelAttrRuleBtn').addEventListener('click', hideAttrRuleForm);
  document.getElementById('addAttrConditionBtn').addEventListener('click', addAttrCondition);
  
  // 初始化属性条件按钮事件
  bindAttrConditionEvents();
});
