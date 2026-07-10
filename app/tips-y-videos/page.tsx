import { mediaHubItems } from "../data/media-hub";
import MediaShowcase from "./media-showcase";

export const metadata = {
  title: "Tips y videos",
  description:
    "Hub de contenido de Kliniu con videos, tips y piezas útiles para orientar la compra.",
};

export default function TipsYVideosPage() {
  return (
    <main
      className="min-h-screen overflow-hidden text-white"
      style={{
        background:
          "linear-gradient(180deg, #101819 0%, #132826 48%, #101819 100%)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 15% 18%, rgba(38,93,140,0.42), transparent 24%), radial-gradient(circle at 82% 14%, rgba(237,132,53,0.28), transparent 18%), radial-gradient(circle at 72% 72%, rgba(26,82,128,0.32), transparent 24%)",
        }}
      />
      <div className="pointer-events-none absolute left-[-8%] top-24 h-72 w-72 rounded-full bg-[#2D716B]/40 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-4rem] right-[8%] h-56 w-56 rounded-full bg-[#27B1B8]/20 blur-3xl" />

      <div className="relative z-10 pt-14">
        <MediaShowcase items={mediaHubItems} />
      </div>
    </main>
  );
}
