import Image from "next/image";

const COLOR_LOGO = "/images/branding/logo-couleur.png";
const WHITE_LOGO = "/images/branding/logo-blanc.png";

export function HaskeLogo() {
  return (
    <span className="haske-logo">
      <Image className="theme-when-light" src={COLOR_LOGO} alt="" width={872} height={232} style={{ width: "100%", height: "auto" }} />
      <Image className="theme-when-dark" src={WHITE_LOGO} alt="" width={872} height={232} style={{ width: "100%", height: "auto" }} />
    </span>
  );
}
