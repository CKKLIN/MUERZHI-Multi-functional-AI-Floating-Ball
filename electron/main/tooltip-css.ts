// electron/main/tooltip-css.ts —— 覆盖窗口（内联 HTML）共用的 data-tip 悬浮提示样式。
// 原生 title 样式不可控、延迟长，覆盖窗口内统一改用 data-tip + 伪元素气泡，
// 视觉与渲染层（v-tip 指令 / Tooltip.vue）同一套：深色 rgba(29,29,31,0.94) + 白字 + 同色箭头。
//
// 关键约束：伪元素气泡会被窗口边界裁掉。工具条/悬浮岛/AI 岛都是内容紧贴窗口的透明窗，
// 且贴屏幕上缘——气泡必须朝下，需满足两点：
//   1. 窗口底部多留 TIP_STRIP 高的透明带（各窗口创建/resize 处已加）；
//   2. 透明带必须点击穿透（各窗口已接光标轮询 setIgnoreMouseEvents，见 ai-island / region-selector）。
// 元素上用 data-tip-pos="below" 声明朝下，默认朝上（便签/提醒窗内的按钮用默认即可被窗口容纳）。

/** 气泡带高度：覆盖窗口在内容高度之外额外留出的透明带，用于放下朝下弹出的气泡 */
export const TIP_STRIP = 28

export const TOOLTIP_CSS = `
[data-tip]{position:relative}
[data-tip]::after{
  content:attr(data-tip);
  position:absolute;bottom:calc(100% + 7px);left:50%;
  transform:translateX(-50%) translateY(3px);
  padding:5px 10px;border-radius:8px;
  background:rgba(29,29,31,0.94);color:#fff;
  font-size:12px;line-height:1.5;font-family:'Segoe UI',system-ui,sans-serif;
  white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,0.25);
  opacity:0;pointer-events:none;z-index:9999;
  transition:opacity .12s ease 0s,transform .12s ease 0s;
}
/* 箭头：border-top 上色 = 尖朝下的三角，底边贴住气泡下缘、尖端指向锚点 */
[data-tip]::before{
  content:'';position:absolute;bottom:calc(100% + 2px);left:50%;
  transform:translateX(-50%);
  border:5px solid transparent;border-top-color:rgba(29,29,31,0.94);
  opacity:0;pointer-events:none;z-index:9999;
  transition:opacity .12s ease 0s;
}
/* 延迟写在 hover 态：CSS 过渡参数取目标态的值——移入用 .35s 延迟防扫过频闪，移出立即消失 */
[data-tip]:hover::after{opacity:1;transform:translateX(-50%) translateY(0);transition-delay:.35s}
[data-tip]:hover::before{opacity:1;transition-delay:.35s}
[data-tip-pos="below"]::after{bottom:auto;top:calc(100% + 7px);transform:translateX(-50%) translateY(-3px)}
[data-tip-pos="below"]::before{bottom:auto;top:calc(100% + 2px);border-top-color:transparent;border-bottom-color:rgba(29,29,31,0.94)}
[data-tip-pos="below"]:hover::after{transform:translateX(-50%) translateY(0)}
`
