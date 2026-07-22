import { siteConfig } from "@/site";

export const ogImageSize = {
  width: 1200,
  height: 630,
};

export function OgImageContent() {
  const { colors } = siteConfig.brand;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "80px",
        backgroundColor: colors.ogBackground,
        color: colors.ogForeground,
      }}>
      <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
        {/* The brand tile: solid blue square, everything inside it white. */}
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "16px",
            backgroundColor: colors.tile,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
          <div
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "9999px",
              border: `3px solid ${colors.tileForeground}`,
              display: "flex",
              position: "relative",
            }}>
            <div
              style={{
                position: "absolute",
                left: "14px",
                top: "0px",
                width: "2px",
                height: "34px",
                opacity: 0.4,
                backgroundColor: colors.tileForeground,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: "0px",
                top: "14px",
                width: "34px",
                height: "2px",
                opacity: 0.4,
                backgroundColor: colors.tileForeground,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: "18px",
                top: "5px",
                width: "8px",
                height: "8px",
                borderRadius: "9999px",
                backgroundColor: colors.tileForeground,
              }}
            />
          </div>
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
          color: colors.ogMuted,
          maxWidth: "800px",
        }}>
        {siteConfig.copy.subtagline}
      </div>
    </div>
  );
}
