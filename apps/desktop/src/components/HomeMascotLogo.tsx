import { BrandLogo } from "./BrandLogo";

export function HomeMascotLogo() {
  return (
    <span
      className="home-mascot-logo anke-home-mark"
      data-testid="home-mascot-logo"
      aria-hidden="true"
    >
      <BrandLogo size={64} />
    </span>
  );
}
