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
      gradientEnd: '#764ba2',
      bgColor: '#f5f7fa',
      bgWhite: '#fff',
      bgLight: '#fafafa',
      bgHover: '#f8f9fa',
      textColor: '#333',
      textLight: '#666',
      textLighter: '#888',
      textMuted: '#999'
    },
    dark: {
      primary: '#3b82f6',
      primaryDark: '#2563eb',
      danger: '#ef4444',
      success: '#10b981',
      info: '#3b82f6',
      gradientStart: '#3b82f6',
      gradientEnd: '#2563eb',
      bgColor: '#111827',
      bgWhite: '#1f2937',
      bgLight: '#374151',
      bgHover: '#4b5563',
      textColor: '#f3f4f6',
      textLight: '#d1d5db',
      textLighter: '#9ca3af',
      textMuted: '#6b7280'
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
      gradientEnd: '--gradient-end',
      bgColor: '--bg-color',
      bgWhite: '--bg-white',
      bgLight: '--bg-light',
      bgHover: '--bg-hover',
      textColor: '--text-color',
      textLight: '--text-light',
      textLighter: '--text-lighter',
      textMuted: '--text-muted'
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
      document.getElementById('infoColor').value = customColors.info || PRESET_THEMES.light.info;
      document.getElementById('gradientStart').value = customColors.gradientStart || PRESET_THEMES.light.gradientStart;
      document.getElementById('gradientEnd').value = customColors.gradientEnd || PRESET_THEMES.light.gradientEnd;
      document.getElementById('bgColor').value = customColors.bgColor || PRESET_THEMES.light.bgColor;
      document.getElementById('bgWhite').value = customColors.bgWhite || PRESET_THEMES.light.bgWhite;
      document.getElementById('bgLight').value = customColors.bgLight || PRESET_THEMES.light.bgLight;
      document.getElementById('bgHover').value = customColors.bgHover || PRESET_THEMES.light.bgHover;
      document.getElementById('textColor').value = customColors.textColor || PRESET_THEMES.light.textColor;
      document.getElementById('textLight').value = customColors.textLight || PRESET_THEMES.light.textLight;
      document.getElementById('textLighter').value = customColors.textLighter || PRESET_THEMES.light.textLighter;
      document.getElementById('textMuted').value = customColors.textMuted || PRESET_THEMES.light.textMuted;
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
        info: document.getElementById('infoColor').value,
        gradientStart: document.getElementById('gradientStart').value,
        gradientEnd: document.getElementById('gradientEnd').value,
        bgColor: document.getElementById('bgColor').value,
        bgWhite: document.getElementById('bgWhite').value,
        bgLight: document.getElementById('bgLight').value,
        bgHover: document.getElementById('bgHover').value,
        textColor: document.getElementById('textColor').value,
        textLight: document.getElementById('textLight').value,
        textLighter: document.getElementById('textLighter').value,
        textMuted: document.getElementById('textMuted').value
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
