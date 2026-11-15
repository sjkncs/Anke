import copilot from "../assets/providers/copilot.ico";
import kimi from "../assets/providers/kimi.ico";
import meta from "../assets/providers/meta.png";
import openrouter from "../assets/providers/openrouter.ico";
import groq from "../assets/providers/groq.ico";
import xai from "../assets/providers/xai.png";
import together from "../assets/providers/together.png";
import fireworks from "../assets/providers/fireworks.ico";
import opencode from "../assets/providers/opencode.ico";
import zai from "../assets/providers/zai.png";
import qwen from "../assets/providers/qwen.png";
import zhipu from "../assets/providers/zhipu.png";
import siliconflow from "../assets/providers/siliconflow.png";
import volcengine from "../assets/providers/volcengine.png";
import minimax from "../assets/providers/minimax.ico";
import stepfun from "../assets/providers/stepfun.svg";
import ant from "../assets/providers/ant.ico";
import baseten from "../assets/providers/baseten.png";
import cerebras from "../assets/providers/cerebras.png";
import nvidia from "../assets/providers/nvidia.ico";
import vercel from "../assets/providers/vercel.ico";
import claude from "../assets/providers/claude.svg";
import deepseek from "../assets/providers/deepseek.svg";
import gemini from "../assets/providers/gemini.svg";
import openai from "../assets/providers/openai.ico";
import mistral from "../assets/providers/mistral.png";
import ollama from "../assets/providers/ollama.png";
import xiaomi from "../assets/providers/xiaomi.png";
import huggingface from "../assets/providers/huggingface.svg";
import jev from "../assets/providers/jev.png";
import radius from "../assets/providers/radius.svg";

// Match explicit identities, never API protocol compatibility.
export const providerBrands = [
  { name: "Xiaomi", icon: xiaomi, aliases: /xiaomi|小米|mimo/i, hosts: ["xiaomimimo.com"] },
  { name: "Hugging Face", icon: huggingface, aliases: /hugging\s*face/i, hosts: ["huggingface.co"] },
  { name: "Jev", icon: jev, aliases: /\bjev\b|typesafe/i, hosts: ["typesafe.ai"] },
  { name: "Radius", icon: radius, aliases: /\bradius\b/i, hosts: ["radius.pi.dev"] },
  { name: "GitHub Copilot", icon: copilot, aliases: /github.*copilot|copilot/i, hosts: ["github.com","githubcopilot.com"] },
  { name: "Kimi", icon: kimi, aliases: /kimi|月之暗面|moonshot/i, hosts: ["kimi.com","kimi.cn","moonshot.cn","moonshot.ai"] },
  { name: "Meta", icon: meta, aliases: /\bmeta\b|llama/i, hosts: ["meta.ai"] },
  { name: "OpenRouter", icon: openrouter, aliases: /openrouter/i, hosts: ["openrouter.ai"] },
  { name: "Groq", icon: groq, aliases: /groq/i, hosts: ["groq.com"] },
  { name: "xAI", icon: xai, aliases: /\bxai\b|grok/i, hosts: ["x.ai"] },
  { name: "Together AI", icon: together, aliases: /together/i, hosts: ["together.xyz","together.ai"] },
  { name: "Fireworks", icon: fireworks, aliases: /fireworks/i, hosts: ["fireworks.ai"] },
  { name: "OpenCode", icon: opencode, aliases: /opencode/i, hosts: ["opencode.ai"] },
  { name: "Z.AI", icon: zai, aliases: /z[.-]ai/i, hosts: ["z.ai"] },
  { name: "Qwen", icon: qwen, aliases: /qwen|通义|dashscope/i, hosts: ["aliyuncs.com","qwen.ai"] },
  { name: "Zhipu", icon: zhipu, aliases: /zhipu|智谱|bigmodel|\bglm\b/i, hosts: ["bigmodel.cn"] },
  { name: "SiliconFlow", icon: siliconflow, aliases: /siliconflow|硅基/i, hosts: ["siliconflow.cn"] },
  { name: "Volcengine", icon: volcengine, aliases: /volcengine|火山|doubao/i, hosts: ["volces.com","volcengine.com"] },
  { name: "MiniMax", icon: minimax, aliases: /minimax/i, hosts: ["minimax.io","minimaxi.com"] },
  { name: "StepFun", icon: stepfun, aliases: /stepfun|阶跃/i, hosts: ["stepfun.com"] },
  { name: "Ant Ling", icon: ant, aliases: /ant[ -]?ling/i, hosts: ["ant-ling.com"] },
  { name: "Baseten", icon: baseten, aliases: /baseten/i, hosts: ["baseten.co"] },
  { name: "Cerebras", icon: cerebras, aliases: /cerebras/i, hosts: ["cerebras.ai"] },
  { name: "NVIDIA", icon: nvidia, aliases: /nvidia/i, hosts: ["nvidia.com"] },
  { name: "Vercel", icon: vercel, aliases: /vercel/i, hosts: ["vercel.sh","vercel.com"] },
  { name: "Mistral", icon: mistral, aliases: /\bmistral\b/i, hosts: ["mistral.ai"] },
  { name: "Ollama", icon: ollama, aliases: /\bollama\b/i, hosts: ["ollama.com"] },
  { name: "Claude", icon: claude, aliases: /\b(claude|anthropic|anthropics)\b/i, hosts: ["anthropic.com", "claude.ai", "claude.com"] },
  { name: "DeepSeek", icon: deepseek, aliases: /\bdeepseek\b|深度求索/i, hosts: ["deepseek.com"] },
  { name: "Gemini", icon: gemini, aliases: /\b(gemini|google|google-gemini)\b/i, hosts: ["generativelanguage.googleapis.com", "aiplatform.googleapis.com"] },
  { name: "OpenAI", icon: openai, aliases: /\b(openai|chatgpt|codex)\b/i, hosts: ["openai.com", "chatgpt.com"] },
];

export function providerBrand(name: string, endpoint?: string) {
  let host = "";
  try { host = endpoint ? new URL(endpoint).hostname.toLowerCase() : ""; } catch { /* Invalid endpoints retain the name fallback. */ }
  return providerBrands.find(brand => brand.hosts.some(domain => host === domain || host.endsWith(`.${domain}`)))
    ?? providerBrands.find(brand => brand.aliases.test(name));
}
