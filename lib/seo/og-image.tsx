import { siteConfig } from "@/site";

export const ogImageSize = {
  width: 1200,
  height: 630,
};

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
        backgroundColor: siteConfig.brand.colors.background,
        color: siteConfig.brand.colors.ogForeground,
      }}>
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "9999px",
            border: `2px solid ${siteConfig.brand.colors.ring}`,
            display: "flex",
            position: "relative",
          }}>
          <div
            style={{
              position: "absolute",
              left: "13px",
              top: "0px",
              width: "1px",
              height: "28px",
              opacity: 0.4,
              backgroundColor: siteConfig.brand.colors.ring,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: "0px",
              top: "13px",
              width: "28px",
              height: "1px",
              opacity: 0.4,
              backgroundColor: siteConfig.brand.colors.ring,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: "16px",
              top: "5px",
              width: "7px",
              height: "7px",
              borderRadius: "9999px",
              backgroundColor: siteConfig.brand.colors.blip,
            }}
          />
        </div>
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
          color: siteConfig.brand.colors.ogMuted,
          maxWidth: "800px",
        }}>
        {siteConfig.copy.subtagline}
      </div>
    </div>
  );
}
