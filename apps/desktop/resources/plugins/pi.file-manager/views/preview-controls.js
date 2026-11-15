// Keep the shipped viewer's own tree state and persistence. Toggle through
// its existing control rather than maintaining a second sidebar state.
(() => {
  const toggle = () => [...document.querySelectorAll('button')].find(button =>
    /^(显示|隐藏|收起|展开)文件列表$|^(Show|Hide) file (list|tree)$/i.test(button.getAttribute('aria-label') || ''));
  document.addEventListener('keydown', event => {
    if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey || event.key.toLowerCase() !== 'b') return;
    if (event.target.closest('input, textarea, [contenteditable=true], .cm-editor')) return;
    const button = toggle();
    if (button) { event.preventDefault(); button.click(); }
  });
  const update = () => {
    const button = toggle();
    if (button) {
      button.setAttribute('aria-keyshortcuts', 'Control+b Meta+b');
      const title = button.getAttribute('aria-label') + ' (Ctrl+B)';
      if (button.title !== title) button.title = title;
    }
  };
  new MutationObserver(update).observe(document.body, {childList:true, subtree:true});
  update();
})();
