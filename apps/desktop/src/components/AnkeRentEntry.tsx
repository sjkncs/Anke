import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";
import { Button } from "./ui";

export function AnkeRentEntry() {
  const { t } = useTranslation();
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  async function openRents() {
    setBusy(true);
    setError(false);
    try { await api.executeCommand("anke.rents.open"); }
    catch { setError(true); }
    finally { setBusy(false); }
  }
  return (
    <div className="anke-rent-entry">
      <Button variant="ghost" size="sm" disabled={busy} onClick={() => void openRents()} data-testid="anke-rents-open">
        {t("anke.rents")}
      </Button>
      {error && <span role="alert">{t("anke.openFailed")}</span>}
    </div>
  );
}
