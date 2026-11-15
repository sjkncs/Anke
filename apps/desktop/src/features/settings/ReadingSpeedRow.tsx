import { useState } from "react";
import { useTranslation } from "react-i18next";
import { SettingsMenuSelect } from "../../components/settings/SettingsMenuSelect";
import { SettingsRow } from "./primitives";

export function ReadingSpeedRow() {
  const { t } = useTranslation();
  const [value, setValue] = useState(() => {
    const saved = localStorage.getItem("anke.readingSpeed");
    return saved !== null && ["0", "20", "40", "80"].includes(saved) ? saved : "40";
  });
  return <SettingsRow title={t("anke.readingSpeed", "回复显示速度")}>
    <SettingsMenuSelect value={value} label={t("anke.readingSpeed", "回复显示速度")}
      options={[
        { id: "20", label: t("anke.paceGentle", "舒缓 · 20 字/秒") },
        { id: "40", label: t("anke.paceModerate", "适中 · 40 字/秒") },
        { id: "80", label: t("anke.paceFast", "较快 · 80 字/秒") },
        { id: "0", label: t("anke.paceImmediate", "即时显示") },
      ]} onChange={next => { localStorage.setItem("anke.readingSpeed", next); setValue(next); }} />
  </SettingsRow>;
}
