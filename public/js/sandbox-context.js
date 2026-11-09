// 沙箱上下文桥
// 沙箱 iframe 没有 allow-same-origin，无法读取 Wiki 的 localStorage 或 DOM。
// 这里把与页面显示有关、且不含隐私的界面偏好通过 postMessage 传给沙箱：
//   { type: 'powerwiki:context', version: 1, theme: 'light' | 'dark', lang: 'zh-CN' }
// 沙箱页面也可以先发送 { type: 'powerwiki:request-context' } 主动索取一次，
// 用来在首屏绘制前对齐主题，减少闪烁。
// 页面还可以发送 { type: 'powerwiki:resize', height } 上报内容高度，
// 非沉浸态下 iframe 会按内容展开（沉浸态的高度由 CSS 固定）。
const SandboxContext = (() => {
  'use strict';

  const CONTEXT_TYPE = 'powerwiki:context';
  const REQUEST_TYPE = 'powerwiki:request-context';
  const RESIZE_TYPE = 'powerwiki:resize';
  const FRAME_SELECTOR = 'iframe.html-sandbox-frame';

  // 沙箱页面可以上报自身内容高度，让 iframe 按内容展开，而不是在框里再滚一层。
  // 沉浸态下高度由 CSS 固定，这里的变量会被更高优先级的规则覆盖。
  const MIN_FRAME_HEIGHT = 240;
  const MAX_FRAME_HEIGHT = 20000;

  // 只暴露界面偏好；不要加入 Cookie、统计数据、仓库内容等任何敏感信息。
  function currentContext() {
    const root = document.documentElement;
    return {
      type: CONTEXT_TYPE,
      version: 1,
      theme: root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light',
      lang: root.getAttribute('lang') || 'zh-CN'
    };
  }

  function sandboxFrames() {
    return Array.from(document.querySelectorAll(FRAME_SELECTOR));
  }

  function postTo(frame) {
    if (!frame || !frame.contentWindow) return;
    try {
      // 沙箱 iframe 是不透明源，targetOrigin 只能是 '*'；消息只会投递到该 iframe。
      frame.contentWindow.postMessage(currentContext(), '*');
    } catch (error) {
      // iframe 可能已经被移除或正在卸载。
    }
  }

  function broadcast() {
    sandboxFrames().forEach(postTo);
  }

  // iframe 的 load 事件不冒泡，用捕获阶段接收；文章切换后新插入的 iframe 也算。
  window.addEventListener('load', event => {
    const target = event.target;
    if (target && target.tagName === 'IFRAME' && target.matches(FRAME_SELECTOR)) {
      postTo(target);
    }
  }, true);

  // 子页面可在首屏绘制前主动请求一次上下文。
  window.addEventListener('message', event => {
    const data = event.data;
    if (!data || data.type !== REQUEST_TYPE) return;
    // 只回应本站渲染的沙箱 iframe，忽略其他窗口或其他类型的消息。
    const frame = sandboxFrames().find(item => item.contentWindow === event.source);
    if (frame) postTo(frame);
  });

  // 子页面上报内容高度时同步给对应的 iframe；只接受数字并做上下限裁剪。
  window.addEventListener('message', event => {
    const data = event.data;
    if (!data || data.type !== RESIZE_TYPE) return;
    const frame = sandboxFrames().find(item => item.contentWindow === event.source);
    if (!frame) return;
    const height = Math.round(Number(data.height));
    if (!Number.isFinite(height)) return;
    const clamped = Math.min(Math.max(height, MIN_FRAME_HEIGHT), MAX_FRAME_HEIGHT);
    frame.style.setProperty('--sandbox-height', `${clamped}px`);
  });

  // ThemeManager 通过 data-theme 切换主题；语言变化时同样同步一次。
  new MutationObserver(broadcast).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme', 'lang']
  });

  // 已存在的 iframe（例如服务端直出的文章）补发一次。
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', broadcast, { once: true });
  } else {
    broadcast();
  }

  return { refresh: broadcast, current: currentContext };
})();
