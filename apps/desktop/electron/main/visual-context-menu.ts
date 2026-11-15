import { Menu, clipboard, nativeImage, dialog, type WebContents } from "electron";
import { writeFile } from "node:fs/promises";

// Runs only after a native user gesture. No filesystem or clipboard bridge is
// exposed to visualization scripts; the opaque iframe sandbox stays intact.
export function installVisualContextMenu(contents: WebContents): void {
  contents.on("context-menu", (_event, params) => {
    const frame = params.frame;
    if (!frame || !(/^pi-genui:\/\/session\//.test(frame.url) ||
      /[\\/]plugins[\\/]pi\.file-manager[\\/]views[\\/]index\.html/.test(decodeURI(frame.url)))) return;
    const run = async (action: "copy" | "save") => {
      const result = await frame.executeJavaScript(`(async () => {
        const image = document.querySelector('.img-stage img, .image-stage img');
        const svg = image ? null : document.querySelector('#widget svg, body > svg');
        const source = svg || image;
        if (!source) throw Error('没有可复制的图片');
        let drawable = image;
        if (svg) {
          const clone = svg.cloneNode(true);
          clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
          const box = svg.viewBox.baseVal, rect = svg.getBoundingClientRect();
          clone.setAttribute('width', String(Math.ceil(box.width || rect.width)));
          clone.setAttribute('height', String(Math.ceil(box.height || rect.height)));
          const nodes = [svg, ...svg.querySelectorAll('*')], copies = [clone, ...clone.querySelectorAll('*')];
          nodes.forEach((node, i) => { const style = getComputedStyle(node); for (const key of ['fill','stroke','font-family','font-size','font-weight','color']) copies[i].style.setProperty(key, style.getPropertyValue(key)); });
          drawable = new Image();
          const ready = new Promise((resolve, reject) => { drawable.onload = resolve; drawable.onerror = () => reject(Error('图片导出失败')); });
          drawable.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(clone));
          await ready;
        }
        const width = Math.ceil(drawable.naturalWidth || source.getBoundingClientRect().width);
        const height = Math.ceil(drawable.naturalHeight || source.getBoundingClientRect().height);
        if (!width || !height || width * height > 16000000) throw Error('图片尺寸超出导出范围');
        const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(drawable, 0, 0, width, height);
        return canvas.toDataURL('image/png');
      })()`);
      if (typeof result !== "string" || !result.startsWith("data:image/png;base64,") || result.length > 32000000) throw Error("图片导出失败");
      const bytes = Buffer.from(result.slice(22), "base64");
      if (action === "copy") clipboard.writeImage(nativeImage.createFromBuffer(bytes));
      else {
        const picked = await dialog.showSaveDialog({ defaultPath: "Anke-图表.png", filters: [{ name: "PNG 图片", extensions: ["png"] }] });
        if (!picked.canceled && picked.filePath) await writeFile(picked.filePath, bytes);
      }
    };
    const action = (name: "copy" | "save") => () => { void run(name).catch(error => dialog.showErrorBox("图片操作失败", String(error.message || error))); };
    Menu.buildFromTemplate([
      { label: "复制图片", click: action("copy") },
      { label: "图片另存为…", click: action("save") },
      { type: "separator" },
      { label: "复制选中文字", enabled: Boolean(params.selectionText), click: () => clipboard.writeText(params.selectionText) },
      { label: "全选", click: () => { void frame.executeJavaScript("(()=>{const r=document.createRange();r.selectNodeContents(document.body);const s=getSelection();s.removeAllRanges();s.addRange(r)})()").catch(() => {}); } },
    ]).popup();
  });
}
