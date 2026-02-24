// options.js - 设置页面逻辑
// 负责管理元素屏蔽规则

let idRules = [];
let classRules = [];

// 默认屏蔽规则
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
 * 获取 ID 规则
 */
async function getIdRules() {
  const result = await chrome.storage.sync.get('idRules');
  return result.idRules || DEFAULT_ID_RULES;
}

/**
 * 获取 Class 规则
 */
async function getClassRules() {
  const result = await chrome.storage.sync.get('classRules');
  return result.classRules || DEFAULT_CLASS_RULES;
}

/**
 * 保存 ID 规则
 */
async function saveIdRules(rules) {
  await chrome.storage.sync.set({ idRules: rules });
}

/**
 * 保存 Class 规则
 */
async function saveClassRules(rules) {
  await chrome.storage.sync.set({ classRules: rules });
}

/**
 * 获取所有启用的选择器
 */
async function getAllEnabledSelectors() {
  const [idR, classR] = await Promise.all([getIdRules(), getClassRules()]);
  return [...idR.filter(r => r.enabled), ...classR.filter(r => r.enabled)].map(r => r.selector);
}

/**
 * 渲染规则列表
 */
function renderRuleList(container, rules, type) {
  if (rules.length === 0) {
    container.innerHTML = '<div class="empty-state">暂无规则</div>';
    return;
  }

  container.innerHTML = rules.map((rule, index) => `
    <div class="rule-item ${rule.enabled ? '' : 'disabled'}">
      <input type="checkbox" class="rule-toggle" data-type="${type}" data-index="${index}" ${rule.enabled ? 'checked' : ''}>
      <div class="rule-info">
        <div class="rule-selector">${escapeHtml(rule.selector)}</div>
        <div class="rule-desc">${escapeHtml(rule.description)}${rule.enabled ? '' : '（已禁用）'}</div>
      </div>
      <button class="rule-delete" data-type="${type}" data-index="${index}">删除</button>
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
 * 保存所有设置
 */
async function saveAllSettings() {
  await saveIdRules(idRules);
  await saveClassRules(classRules);
  showToast('设置已保存');
}

/**
 * 恢复默认设置
 */
async function resetAllSettings() {
  if (!confirm('确定要恢复默认设置吗？您的自定义规则将被清除。')) {
    return;
  }
  idRules = JSON.parse(JSON.stringify(DEFAULT_ID_RULES));
  classRules = JSON.parse(JSON.stringify(DEFAULT_CLASS_RULES));
  renderRuleList(document.getElementById('idRuleList'), idRules, 'id');
  renderRuleList(document.getElementById('classRuleList'), classRules, 'class');
  updateCounts();
  showToast('已恢复默认设置');
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
  idRules = await getIdRules();
  classRules = await getClassRules();

  renderRuleList(document.getElementById('idRuleList'), idRules, 'id');
  renderRuleList(document.getElementById('classRuleList'), classRules, 'class');
  updateCounts();

  // 绑定事件
  document.getElementById('addIdRuleBtn').addEventListener('click', addIdRule);
  document.getElementById('addClassRuleBtn').addEventListener('click', addClassRule);
  document.getElementById('saveAllBtn').addEventListener('click', saveAllSettings);
  document.getElementById('resetAllBtn').addEventListener('click', resetAllSettings);

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
