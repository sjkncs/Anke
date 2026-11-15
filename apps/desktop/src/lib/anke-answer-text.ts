/** Display-only cleanup; stored messages and tool payloads retain their original bytes. */
export function ankeAnswerText(source: string): string {
  return source.split(/(```[\s\S]*?(?:```|$)|`[^`\n]*`|https?:\/\/[^\s<>]+)/g).map((part, i) =>
    i % 2 ? part : part.replace(/^[ \t]*(?:-(?:[ \t]+|$)|[#*]+[ \t]*)/gm, "").replace(/\*/g, "").replace(/#/g, "")
  ).join("");
}
