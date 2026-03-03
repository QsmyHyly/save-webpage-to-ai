document.addEventListener('DOMContentLoaded', async () => {
  const checkbox = document.getElementById('enableDebugger');
  const saveBtn = document.getElementById('saveDebugger');
  const status = document.getElementById('status');

  const themeModeSelect = document.getElementById('themeMode');
  const customColorsPanel = document.getElementById('customColorsPanel');
  const saveThemeBtn = document.getElementById('saveTheme');
  const resetThemeBtn = document.getElementById('resetTheme');

  const PRESET_THEMES = {
    light: {
      primary: '#667eea',
      primaryDark: '#5568d3',
      danger: '#dc3545',
      success: '#28a745',
      info: '#17a2b8',
      gradientStart: '#667eea',
      gradientEnd: '#764ba2'
    },
    dark: {
      primary: '#3b82f6',
      primaryDark: '#2563eb',
      danger: '#ef4444',
      success: '#10b981',
      info: '#3b82f6',
      gradientStart: '#3b82f6',
      gradientEnd: '#2563eb'
    }
  };

  function applyThemeToDocument(mode, customColors) {
    const colors = mode === 'custom' ? customColors : PRESET_THEMES[mode];
    const root = document.documentElement;
    const varMap = {
      primary: '--primary-color',
      primaryDark: '--primary-dark',
      danger: '--danger-color',
      success: '--success-color',
      info: '--info-color',
      gradientStart: '--gradient-start',
      gradientEnd: '--gradient-end'
    };
    for (const [key, cssVar] of Object.entries(varMap)) {
      if (colors[key]) root.style.setProperty(cssVar, colors[key]);
    }
  }

  async function loadTheme() {
    const result = await chrome.storage.sync.get('themeConfig');
    const themeConfig = result.themeConfig || {};
    const mode = themeConfig.mode || 'light';
    const customColors = themeConfig.customColors || {};

    themeModeSelect.value = mode;
    if (mode === 'custom') {
      customColorsPanel.style.display = 'block';
      document.getElementById('primaryColor').value = customColors.primary || PRESET_THEMES.light.primary;
      document.getElementById('primaryDark').value = customColors.primaryDark || PRESET_THEMES.light.primaryDark;
      document.getElementById('dangerColor').value = customColors.danger || PRESET_THEMES.light.danger;
      document.getElementById('successColor').value = customColors.success || PRESET_THEMES.light.success;
      document.getElementById('gradientStart').value = customColors.gradientStart || PRESET_THEMES.light.gradientStart;
      document.getElementById('gradientEnd').value = customColors.gradientEnd || PRESET_THEMES.light.gradientEnd;
    } else {
      customColorsPanel.style.display = 'none';
    }
    applyThemeToDocument(mode, customColors);
  }

  async function saveTheme() {
    const mode = themeModeSelect.value;
    let customColors = {};
    if (mode === 'custom') {
      customColors = {
        primary: document.getElementById('primaryColor').value,
        primaryDark: document.getElementById('primaryDark').value,
        danger: document.getElementById('dangerColor').value,
        success: document.getElementById('successColor').value,
        gradientStart: document.getElementById('gradientStart').value,
        gradientEnd: document.getElementById('gradientEnd').value
      };
    }
    await chrome.storage.sync.set({ themeConfig: { mode, customColors } });
    applyThemeToDocument(mode, customColors);
    status.textContent = '✅ 主题已保存';
    setTimeout(() => status.textContent = '', 1500);
  }

  async function resetTheme() {
    if (!confirm('确定要重置为默认主题吗？')) return;
    
    await chrome.storage.sync.set({ themeConfig: { mode: 'light', customColors: {} } });
    themeModeSelect.value = 'light';
    customColorsPanel.style.display = 'none';
    applyThemeToDocument('light', {});
    status.textContent = '✅ 已重置为默认主题';
    setTimeout(() => status.textContent = '', 1500);
  }

  themeModeSelect.addEventListener('change', () => {
    const mode = themeModeSelect.value;
    if (mode === 'custom') {
      customColorsPanel.style.display = 'block';
    } else {
      customColorsPanel.style.display = 'none';
    }
  });

  saveThemeBtn.addEventListener('click', saveTheme);
  resetThemeBtn.addEventListener('click', resetTheme);

  const result = await chrome.storage.sync.get('enableDebugger');
  checkbox.checked = result.enableDebugger || false;

  saveBtn.addEventListener('click', async () => {
    await chrome.storage.sync.set({ enableDebugger: checkbox.checked });
    status.textContent = '✅ 已保存';
    setTimeout(() => status.textContent = '', 1500);
  });

  await loadTheme();
});
