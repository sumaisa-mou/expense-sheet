import { ImageResponse } from "next/og";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ size: string }> },
) {
  const { size: raw } = await ctx.params;
  const size = Math.min(Math.max(parseInt(raw, 10) || 512, 16), 1024);
  const maskable = new URL(req.url).searchParams.has("maskable");
  const glyph = size * (maskable ? 0.45 : 0.6);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#059669",
          color: "white",
          fontSize: glyph,
          fontWeight: 700,
        }}
      >
        $
      </div>
    ),
    { width: size, height: size },
  );
}
