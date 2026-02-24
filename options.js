// options.js - 设置页面逻辑
// 负责管理元素屏蔽规则和配置组

let idRules = [];
let classRules = [];
let profiles = {};
let currentProfileId = 'default';

// 默认屏蔽规则（不可变）
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
 * 获取当前配置组的规则
 */
async function getCurrentProfileRules() {
  const p = await getProfiles();
  const pid = await getCurrentProfileId();
  const profile = p[pid];
  
  if (profile) {
    return {
      idRules: profile.idRules || [],
      classRules: profile.classRules || []
    };
  }
  
  // 如果配置不存在，返回默认规则
  return {
    idRules: JSON.parse(JSON.stringify(DEFAULT_ID_RULES)),
    classRules: JSON.parse(JSON.stringify(DEFAULT_CLASS_RULES))
  };
}

/**
 * 创建新配置组
 */
async function createProfile(name) {
  const profiles = await getProfiles();
  const id = 'profile_' + Date.now();
  profiles[id] = {
    name: name,
    idRules: JSON.parse(JSON.stringify(DEFAULT_ID_RULES)),
    classRules: JSON.parse(JSON.stringify(DEFAULT_CLASS_RULES)),
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
  profiles[newId] = {
    name: source.name + ' (副本)',
    idRules: JSON.parse(JSON.stringify(source.idRules)),
    classRules: JSON.parse(JSON.stringify(source.classRules)),
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
  
  // 确保默认配置存在
  if (!profiles['default']) {
    profiles['default'] = {
      name: '默认配置',
      idRules: JSON.parse(JSON.stringify(DEFAULT_ID_RULES)),
      classRules: JSON.parse(JSON.stringify(DEFAULT_CLASS_RULES)),
      isDefault: true
    };
    await saveProfiles(profiles);
  }
}

/**
 * 加载当前配置组的规则
 */
async function loadCurrentProfile() {
  const rules = await getCurrentProfileRules();
  idRules = rules.idRules;
  classRules = rules.classRules;
  
  renderRuleList(document.getElementById('idRuleList'), idRules, 'id');
  renderRuleList(document.getElementById('classRuleList'), classRules, 'class');
  updateCounts();
}

/**
 * 渲染规则列表
 */
function renderRuleList(container, rules, type) {
  const isDefaultProfile = currentProfileId === 'default';
  
  if (rules.length === 0) {
    container.innerHTML = '<div class="empty-state">暂无规则</div>';
    return;
  }

  container.innerHTML = rules.map((rule, index) => `
    <div class="rule-item ${rule.enabled ? '' : 'disabled'}">
      <input type="checkbox" class="rule-toggle" data-type="${type}" data-index="${index}" ${rule.enabled ? 'checked' : ''} ${isDefaultProfile ? 'disabled' : ''}>
      <div class="rule-info">
        <div class="rule-selector">${escapeHtml(rule.selector)}</div>
        <div class="rule-desc">${escapeHtml(rule.description)}${rule.enabled ? '' : '（已禁用）'}</div>
      </div>
      <button class="rule-delete" data-type="${type}" data-index="${index}" ${isDefaultProfile ? 'disabled' : ''}>删除</button>
    </div>
  `).join('');

  // 绑定切换开关事件
  container.querySelectorAll('.rule-toggle').forEach(toggle => {
    toggle.addEventListener('change', (e) => {
      const type = e.target.dataset.type;
      const index = parseInt(e.target.dataset.index);
      if (type === 'id') {
        idRules[index].enabled = e.target.checked;
      } else {
        classRules[index].enabled = e.target.checked;
      }
      renderRuleList(container, type === 'id' ? idRules : classRules, type);
      updateCounts();
    });
  });

  // 绑定删除按钮事件
  container.querySelectorAll('.rule-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const type = e.target.dataset.type;
      const index = parseInt(e.target.dataset.index);
      if (type === 'id') {
        idRules.splice(index, 1);
        renderRuleList(document.getElementById('idRuleList'), idRules, 'id');
      } else {
        classRules.splice(index, 1);
        renderRuleList(document.getElementById('classRuleList'), classRules, 'class');
      }
      updateCounts();
    });
  });
}

/**
 * 更新规则数量显示
 */
function updateCounts() {
  document.getElementById('idRulesCount').textContent = `${idRules.length} 条规则`;
  document.getElementById('classRulesCount').textContent = `${classRules.length} 条规则`;
}

/**
 * 添加 ID 规则
 */
function addIdRule() {
  if (currentProfileId === 'default') {
    showToast('默认配置不可修改，请先创建新配置');
    return;
  }

  const selectorInput = document.getElementById('newIdSelector');
  const descInput = document.getElementById('newIdDesc');

  const selector = selectorInput.value.trim();
  if (!selector) {
    showToast('请输入选择器');
    return;
  }

  if (!selector.startsWith('#')) {
    showToast('ID 选择器必须以 # 开头');
    return;
  }

  if (idRules.some(r => r.selector === selector)) {
    showToast('该选择器已存在');
    return;
  }

  idRules.push({
    selector: selector,
    enabled: true,
    description: descInput.value.trim() || '自定义规则'
  });

  selectorInput.value = '';
  descInput.value = '';
  renderRuleList(document.getElementById('idRuleList'), idRules, 'id');
  updateCounts();
}

/**
 * 添加 Class 规则
 */
function addClassRule() {
  if (currentProfileId === 'default') {
    showToast('默认配置不可修改，请先创建新配置');
    return;
  }

  const selectorInput = document.getElementById('newClassSelector');
  const descInput = document.getElementById('newClassDesc');

  const selector = selectorInput.value.trim();
  if (!selector) {
    showToast('请输入选择器');
    return;
  }

  if (!selector.startsWith('.')) {
    showToast('Class 选择器必须以 . 开头');
    return;
  }

  if (classRules.some(r => r.selector === selector)) {
    showToast('该选择器已存在');
    return;
  }

  classRules.push({
    selector: selector,
    enabled: true,
    description: descInput.value.trim() || '自定义规则'
  });

  selectorInput.value = '';
  descInput.value = '';
  renderRuleList(document.getElementById('classRuleList'), classRules, 'class');
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
  
  profiles[currentProfileId].idRules = idRules;
  profiles[currentProfileId].classRules = classRules;
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

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  await loadProfiles();
  await loadCurrentProfile();
  renderProfileList();

  // 绑定事件
  document.getElementById('createProfileBtn').addEventListener('click', createNewProfile);
  document.getElementById('addIdRuleBtn').addEventListener('click', addIdRule);
  document.getElementById('addClassRuleBtn').addEventListener('click', addClassRule);
  document.getElementById('saveAllBtn').addEventListener('click', saveCurrentProfileRules);

  // 回车添加规则
  document.getElementById('newIdSelector').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addIdRule();
  });
  document.getElementById('newIdDesc').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addIdRule();
  });
  document.getElementById('newClassSelector').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addClassRule();
  });
  document.getElementById('newClassDesc').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addClassRule();
  });
});
