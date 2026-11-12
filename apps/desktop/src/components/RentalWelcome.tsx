import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "../styles/rental-welcome.css";

const messages = [
  "租金动态，实时掌握",
  "住你所想，安居深圳",
  "让理想的家，更合你的心意",
  "从这里，开始你的安居计划",
];

/** A quiet, local welcome rotation; never implies a live market data connection. */
export function RentalWelcome({ visible }: { visible: boolean }) {
  const { t, i18n } = useTranslation();
  const [index, setIndex] = useState(0);
  const chinese = i18n.language.startsWith("zh");
  useEffect(() => {
    if (!visible || !chinese) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const timer = window.setInterval(() => {
      const editing = document.activeElement?.matches("input, textarea, [contenteditable='true']");
      if (!document.hidden && !editing && !reducedMotion.matches) {
        setIndex((value) => (value + 1) % messages.length);
      }
    }, 8000);
    return () => window.clearInterval(timer);
  }, [visible, chinese]);
  return <div className="empty-hero rental-welcome">
    <div className="rental-welcome-brand" aria-hidden="true">
      <svg className="rental-welcome-mark" viewBox="0 0 48 48" fill="none">
        <path d="M9 39V20L24 8l15 12v19M17 39V25h14v14M5 39h38" />
        <path className="rental-welcome-detail" d="M24 8v8M17 20h14" />
      </svg>
      <span>ANKE</span>
    </div>
    <h1 className="rental-welcome-title"><span key={index}>{chinese ? messages[index] : t("chat.emptyTitle")}</span></h1>
    <p className="rental-welcome-caption">{chinese ? "深圳 · 每一种生活，都值得好好安放" : "Shenzhen · Find a place for the life you want"}</p>
  </div>;
}
