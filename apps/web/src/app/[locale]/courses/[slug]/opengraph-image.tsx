import { ImageResponse } from "next/og";
import { loadPublishedCourse } from "@/features/courses";
import { isLocale } from "@/i18n/config";

export const alt = "Place-link course share card";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const selectedLocale = isLocale(locale) ? locale : "ko";
  const course = await loadPublishedCourse(slug, selectedLocale);
  const area = course.nodes[0]?.place.area?.toUpperCase() ?? "SEOUL";
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 64, position: "relative", overflow: "hidden", background: "#141510", color: "white", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", fontSize: 22, fontWeight: 800, letterSpacing: 4 }}>PLACE-LINK · SEOUL</div>
      <div style={{ width: 420, height: 420, position: "absolute", right: -80, top: 40, borderRadius: 999, background: "#ff5c9d", filter: "blur(4px)", opacity: 0.85 }} />
      <div style={{ display: "flex", flexDirection: "column", zIndex: 2 }}>
        <div style={{ display: "flex", marginBottom: 24, color: "#caff2f", fontSize: 24, fontWeight: 800, letterSpacing: 3 }}>{area} · {course.nodes.length} STOPS</div>
        <div style={{ display: "flex", maxWidth: 900, fontSize: 76, lineHeight: 1.02, fontWeight: 900, letterSpacing: -4 }}>{course.title}</div>
        <div style={{ display: "flex", maxWidth: 780, marginTop: 24, color: "#d2d2ca", fontSize: 27 }}>{course.description ?? course.nodes.map((node) => node.place.name).join(" → ")}</div>
      </div>
      <div style={{ display: "flex", gap: 28, zIndex: 2, fontSize: 22, fontWeight: 700 }}><span>{Math.floor(course.durationMinutes / 60)}H {String(course.durationMinutes % 60).padStart(2, "0")}M</span><span>{course.ownerName}</span></div>
      <div style={{ width: 250, height: 250, position: "absolute", right: 50, bottom: -110, border: "48px solid #caff2f", borderRadius: 999 }} />
    </div>,
    size,
  );
}
