const messages = {
  dimensionWidth:['W {mm}','宽 {mm}'],dimensionHeight:['H {mm}','高 {mm}'],
  revisionParent:['Parent: {parent}','父版本：{parent}'],revisionRulerCleared:['Revision changed. Previous measurement cleared.','版本已切换，旧量尺已清除。'],revisionFallback:['Requested revision/build is unavailable. Showing an available version.','链接中的版本或构建不可用，已显示可用版本。'],
  revision:['Revision','设计版本'], build:['Build','构建'], revisionDetails:['Revision details','版本详情'],
  revisionLoading:['Loading revision…','正在切换版本…'],revisionError:['Could not load revision. Your current view is unchanged.','版本加载失败，当前场景已保留。'],
  revisionInitialError:['No revision could be loaded. Reload to retry.','未能加载版本，请刷新重试。'],
  revisionRelocated:['Layout changed. Moved to a safe viewpoint.','布局已变化，已移至安全视角。'],
  revisionModelOnly:['No verified walking position. Model view is available.','没有可用的安全行走位置，已打开建筑模型。'],
  revisionUnreviewed:['Dimensions still require review.','尺寸仍需复核。'],
  artifactFailed:['Build failed','构建失败'],artifactBuilding:['Building…','构建中…'],
  artifactReady:['Open ↗','打开 ↗'],artifactPending:['Not generated','未生成'],
  artifact_quick:['Quick previews','快速预览'],artifact_fine:['Fine previews','精细预览'],artifact_map:['Plan map','平面图'],artifact_route:['Tour route','导览动线'],artifact_interactive:['Interactive view','交互网页'],artifact_video:['Room tour video','导览视频'],
  stage: ['Interactive house walkthrough', '可自由走动的三维住宅'],
  modes: ['View mode', '浏览模式'], walk: ['Walkthrough', '室内漫游'], model: ['Model', '建筑模型'],
  overview: ['Reset overview', '恢复斜俯瞰'], position: ['You are here', '当前位置'],
  orientation: ['Plan orientation · not north', '图纸方向 · 非地理北'],
  settings: ['Settings', '更多设置'], room: ['Room', '房间'], chooseRoom: ['Choose a room', '选择房间'],
  reset: ['Back to living room', '回到客厅'], lock: ['Mouse look', '鼠标看向'], unlock: ['Esc to release mouse', 'Esc 退出看向'],
  fullscreen: ['Fullscreen', '全屏浏览'], quality: ['Quality', '画质'],
  auto: ['Auto', '自动'], low: ['Smooth', '流畅'], high: ['High', '清晰'],
  minimap: ['Minimap', '小地图'], toggleMinimap: ['Toggle minimap', '显示或隐藏小地图'], mapLabel: ['Current position and heading', '当前位置与朝向'],
  zoom: ['View zoom', '视角'], zoomLabel: ['View zoom', '视角缩放'], zoomReset: ['Reset zoom', '重置视角'],
  dimensions: ['Dimensions', '尺寸标注'],
  tools: ['Common tools', '常用工具'], measure: ['Measure distance', '量尺'],
  wallDimensionsNote: ['Wall dimensions · mm', '墙面尺寸 · 毫米'],
  planDimensionsNote: ['Plan dimensions · mm', '平面图尺寸 · 毫米'],
  measureFirst: ['Select the first point on a surface.', '点击模型表面，选择第一个点。'],
  measureSecond: ['Select the second point. Drag to adjust the view.', '选择第二个点。可拖动画面调整视角。'],
  measureDone: ['3D distance · Select a point to start again.', '三维距离 · 再次点击可开始新测量。'],
  measureDifferent: ['Choose a different point.', '请选择另一个点。'],
  measureSurface: ['Select a surface on the model.', '请点击模型表面。'],
  measureClear: ['Clear', '清除'],
  dimensionsNote: ['Wall labels show segment length and height in metres. Dimensions come from the model, not site measurements.', '标注固定在墙面上，显示实体墙段长度与墙高（米）。尺寸来自模型，非现场实测。'],
  lockPage: ['Lock', '锁定'], returnSite: ['Back to website', '返回网站'], joystick: ['Move joystick', '触控移动摇杆'],
  helpDesktop: ['WASD / arrows to move · Drag to look · Shift to run · Esc to release mouse', 'WASD / 方向键移动 · 拖动画面看向 · Shift 加速 · Esc 释放鼠标'],
  helpTouch: ['Left joystick to move · Drag to look', '左侧摇杆移动 · 拖动画面看向'],
  realtime: ['Realtime lighting · Placeholder sky', '实时光照预览 · 窗外为天空占位'],
  explore: ['EXPLORE YOUR SPACE', '探索你的空间'], welcome: ['Step inside', '走进这个家'],
  install: ['No installation · Explore every room', '无需安装 · 房间可自由切换'],
  loading: ['Loading model…', '正在加载模型…'], loadingProgress: ['Loading model {percent}%', '正在加载模型 {percent}%'],
  boundaries: ['Preparing walking boundaries…', '正在建立行走边界…'],
  sceneError: ['Could not read scene data', '无法读取场景数据'],
  loadError: ['Loading failed: {error}. Open this page through a web server.', '加载失败：{error}。请通过本地服务器打开。'],
  dragHint: ['Drag the scene to look around.', '请拖动画面查看方向。'],
  fullscreenError: ['Fullscreen is unavailable. Try landscape orientation.', '当前浏览器不支持全屏，可横屏浏览。'],
  viewerError: ['Could not open the 3D view. Return to the page and try again.', '无法打开三维视图，请返回页面重试。'],
  loginFirst: ['Enter the access password on the House page first.', '请先在 House 页面输入访问密码。'],
  openHouse: ['Open House →', '打开 House →'],
};
const roomNames = {
  '影音室': 'Media room', '家政间': 'Utility room', '次卫': 'Guest bathroom', '次卧': 'Guest bedroom',
  '次卧衣帽间': 'Guest wardrobe', '门厅': 'Entry hall', '主卫': 'Primary bathroom',
  '套房衣帽间': 'Suite wardrobe', '主卧': 'Primary bedroom', '主卧衣帽间': 'Primary wardrobe',
  '公卫': 'Shared bathroom', '书房': 'Study', '厨房 / 岛台': 'Kitchen / island', '餐厅': 'Dining room',
  '客厅': 'Living room', '休闲 / 工作区': 'Lounge / workspace', '工具间': 'Storage', '过道': 'Hallway',
  '客厅全景': 'Living room overview', '客厅望向走廊': 'Living room / hallway', '厨房全景': 'Kitchen overview',
  '书房全景': 'Study overview', '主卧全景': 'Primary bedroom overview', '主卫全景': 'Primary bathroom overview',
  '次卧全景': 'Guest bedroom overview', '影音室全景': 'Media room overview', '走廊回望入户': 'Hallway / entrance',
};
let language = 'en', initialized = false;
export function t(key, params = {}) {
  const text = messages[key]?.[language === 'en' ? 0 : 1] ?? key;
  return text.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? ''));
}
export function setText(element, key, params = {}) {
  if (!element) return;
  element.dataset.i18n = key;
  element.dataset.i18nParams = JSON.stringify(params);
  element.textContent = t(key, params);
}
export function roomText(name) { return language === 'en' ? roomNames[name] ?? name : name; }
export function setRoomText(element, name) {
  element.dataset.i18nRoom = name;
  element.textContent = roomText(name);
}
function refresh() {
  document.documentElement.lang = language === 'en' ? 'en' : 'zh-CN';
  document.querySelectorAll('[data-i18n]').forEach(element => {
    element.textContent = t(element.dataset.i18n, JSON.parse(element.dataset.i18nParams || '{}'));
  });
  document.querySelectorAll('[data-i18n-aria]').forEach(element => element.setAttribute('aria-label', t(element.dataset.i18nAria)));
  document.querySelectorAll('[data-i18n-title]').forEach(element => element.title = t(element.dataset.i18nTitle));
  document.querySelectorAll('[data-i18n-room]').forEach(element => setRoomText(element, element.dataset.i18nRoom));
  const button = document.getElementById('language-toggle');
  button.dataset.language = language;
  button.setAttribute('aria-label', language === 'en' ? 'Switch to Chinese' : '切换到英语');
  button.setAttribute('aria-pressed', String(language === 'zh'));
}
export function initLanguage() {
  if (initialized) return;
  initialized = true;
  try { if (localStorage.getItem('house-language') === 'zh') language = 'zh'; } catch { /* Storage can be disabled. */ }
  document.getElementById('language-toggle').onclick = () => {
    language = language === 'en' ? 'zh' : 'en';
    try { localStorage.setItem('house-language', language); } catch { /* Keep the current choice in memory. */ }
    refresh();
  };
  refresh();
}
