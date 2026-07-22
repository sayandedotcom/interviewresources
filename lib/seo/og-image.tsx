import { siteConfig } from "@/site";

export const ogImageSize = {
  width: 1200,
  height: 630,
};

const { colors } = siteConfig.brand;

/** The brand tile, inverted for the blue sky — white square, blue mark inside —
 * the same swap the site header makes over the hero. */
function LogoTile() {
  return (
    <div
      style={{
        width: "48px",
        height: "48px",
        borderRadius: "14px",
        backgroundColor: colors.tileForeground,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
      <div
        style={{
          width: "30px",
          height: "30px",
          borderRadius: "9999px",
          border: `3px solid ${colors.tile}`,
          display: "flex",
          position: "relative",
        }}>
        <div
          style={{
            position: "absolute",
            left: "12px",
            top: "0px",
            width: "2px",
            height: "30px",
            opacity: 0.4,
            backgroundColor: colors.tile,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "0px",
            top: "12px",
            width: "30px",
            height: "2px",
            opacity: 0.4,
            backgroundColor: colors.tile,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "16px",
            top: "4px",
            width: "8px",
            height: "8px",
            borderRadius: "9999px",
            backgroundColor: colors.tile,
          }}
        />
      </div>
    </div>
  );
}

export function OgImageContent() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "80px",
        backgroundImage: `linear-gradient(180deg, ${colors.ogSky
          .map((stop, i) => `${stop} ${(i / (colors.ogSky.length - 1)) * 100}%`)
          .join(", ")})`,
        color: colors.ogForeground,
      }}>
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <LogoTile />
        <span
          style={{
            fontSize: "32px",
            fontWeight: 600,
            letterSpacing: "-0.02em",
          }}>
          {siteConfig.name}
        </span>
      </div>
      <div
        style={{
          display: "flex",
          marginTop: "48px",
          fontSize: "64px",
          fontWeight: 600,
          lineHeight: 1.1,
          letterSpacing: "-0.02em",
          maxWidth: "900px",
        }}>
        {siteConfig.copy.tagline}
      </div>
      <div
        style={{
          display: "flex",
          marginTop: "32px",
          fontSize: "28px",
          color: colors.ogMuted,
          maxWidth: "800px",
        }}>
        {siteConfig.copy.subtagline}
      </div>
    </div>
  );
}
