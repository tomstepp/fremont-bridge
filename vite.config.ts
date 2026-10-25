import { defineConfig, type Plugin } from "vite";
import { BRIDGES } from "./src/bridges.ts";

const SITE = "https://fremontbridge.com";

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
      for (const b of BRIDGES) {
        if (b.path === "/") continue;
        const source = html
          .replace("<title>Is the Fremont Bridge up?</title>", `<title>Is the ${b.name} Bridge up?</title>`)
          .replace(">Is the Fremont Bridge up right&nbsp;now?<", `>Is the ${b.name} Bridge up right&nbsp;now?<`)
          .replace(`Seattle's Fremont Bridge is open`, `Seattle's ${b.name} Bridge is open`)
          .replace(`content="Is the Fremont Bridge up right now?"`, `content="Is the ${b.name} Bridge up right now?"`)
          .replace(`content="${SITE}/"`, `content="${SITE}${b.path}"`);
        this.emitFile({ type: "asset", fileName: `${b.path.slice(1)}index.html`, source });
      }
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
