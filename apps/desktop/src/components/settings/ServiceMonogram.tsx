/**
 * The locally bundled product mark that leads an AI service.
 *
 * Unknown providers and failed images retain the existing letter fallback.
 */
import { IconServer } from "../icons";
import { useState } from "react";
import { providerBrand } from "../../lib/provider-brand";
import { monogramLetter } from "./service-row-status";

export function ServiceMonogram({ name, endpoint }: { name: string; endpoint?: string }) {
  const letter = monogramLetter(name);
  const brand = providerBrand(name, endpoint);
  const [failedIcon, setFailedIcon] = useState<string | null>(null);
  return (
    <span className="service-monogram" aria-hidden>
      {brand && failedIcon !== brand.icon ? (
        <img src={brand.icon} alt="" width={22} height={22}
          style={{ objectFit: "contain", display: "block", flexShrink: 0 }}
          onError={() => setFailedIcon(brand.icon)} />
      ) : letter || <IconServer size={14} />}
    </span>
  );
}
