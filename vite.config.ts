import { defineConfig, type Plugin } from "vite";
import { BRIDGES, OVERVIEW_PATH } from "./src/bridges.ts";

const SITE = "https://seattle-bridges.com";

// Each bridge's page is the same app at its own path (/ballard/, …), so the
// build copies index.html there with that bridge's title and link-preview
// tags; crawlers don't run scripts. 404.html sends unknown paths to Fremont.
function bridgePages(): Plugin {
  return {
    name: "bridge-pages",
    apply: "build",
    // After Vite's own HTML plugin has put index.html in the bundle.
    enforce: "post",
    generateBundle(_, bundle) {
      const page = bundle["index.html"];
      if (page?.type !== "asset") return;
      const html = String(page.source);
      // index.html is Fremont's page; the others swap in their own wording.
      const pageFor = (p: { path: string; question: string; about: string; image: string; alt: string }) =>
        html
          .replace("<title>Is the Fremont Bridge up?</title>", `<title>${p.question}?</title>`)
          .replace(">Is the Fremont Bridge up right&nbsp;now?<", `>${p.question} right&nbsp;now?<`)
          .replace("Seattle's Fremont Bridge is open", p.about)
          .replace(`content="Is the Fremont Bridge up right now?"`, `content="${p.question} right now?"`)
          .replace(`content="${SITE}/"`, `content="${SITE}${p.path}"`)
          .replace(`content="${SITE}/img/og.jpg"`, `content="${SITE}/img/${p.image}"`)
          .replace(/(property="og:image:alt" content=")[^"]*"/, `$1${p.alt}"`);
      const emit = (path: string, source: string) =>
        this.emitFile({ type: "asset", fileName: `${path.slice(1)}index.html`, source });

      for (const b of BRIDGES) {
        if (b.path === "/") continue;
        emit(
          b.path,
          pageFor({
            path: b.path,
            question: `Is the ${b.name} Bridge up`,
            about: `Seattle's ${b.name} Bridge is open`,
            image: b.preview.file,
            alt: b.preview.alt,
          }),
        );
      }
      emit(
        OVERVIEW_PATH,
        pageFor({
          path: OVERVIEW_PATH,
          question: "Are Seattle's drawbridges up",
          about: "Seattle's ship canal drawbridges are open",
          image: BRIDGES[0].preview.file,
          alt: BRIDGES[0].preview.alt,
        }),
      );
      this.emitFile({ type: "asset", fileName: "404.html", source: html });
    },
  };
}

export default defineConfig({
  // Absolute asset paths: pages live at / and /<bridge>/ on the site's own domain.
  base: "/",
  plugins: [bridgePages()],
  server: {
    proxy: {
      // Dev only: the TomTom key is restricted to the live site's domain and
      // TomTom won't accept localhost, so the dev server forwards traffic
      // requests itself, labeled as coming from the live site.
      "/tomtom": {
        target: "https://api.tomtom.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/tomtom/, ""),
        headers: { Referer: `${SITE}/` },
      },
    },
  },
});
