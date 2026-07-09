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
        backgroundColor: "#171717",
        color: "#fafafa",
      }}>
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <div
          style={{
            width: "28px",
            height: "28px",
            transform: "rotate(45deg)",
            backgroundColor: "#eaeaea",
          }}
        />
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
        Get the questions before they ask them.
      </div>
      <div
        style={{
          display: "flex",
          marginTop: "32px",
          fontSize: "28px",
          color: "#a1a1a1",
          maxWidth: "800px",
        }}>
        Reconnaissance before the interview, grounded in evidence.
      </div>
    </div>
  );
}
