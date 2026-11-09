// 沙箱上下文桥
// 沙箱 iframe 没有 allow-same-origin，无法读取 Wiki 的 localStorage 或 DOM。
// 这里把与页面显示有关、且不含隐私的界面偏好通过 postMessage 传给沙箱：
//   { type: 'powerwiki:context', version: 1, theme: 'light' | 'dark', lang: 'zh-CN' }
// 沙箱页面也可以先发送 { type: 'powerwiki:request-context' } 主动索取一次，
// 用来在首屏绘制前对齐主题，减少闪烁。
const SandboxContext = (() => {
  'use strict';

  const CONTEXT_TYPE = 'powerwiki:context';
  const REQUEST_TYPE = 'powerwiki:request-context';
  const FRAME_SELECTOR = 'iframe.html-sandbox-frame';

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
