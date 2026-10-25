import { defineConfig } from "vite";

export default defineConfig({
  // Relative asset paths, so the build works at a domain root or under a path (GitHub Pages).
  base: "./",
  server: {
    proxy: {
      // Dev only: the TomTom key is restricted to the live site's domain and
      // TomTom won't accept localhost, so the dev server forwards traffic
      // requests itself, labeled as coming from the live site.
      "/tomtom": {
        target: "https://api.tomtom.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/tomtom/, ""),
        headers: { Referer: "https://fremontbridge.com/" },
      },
    },
  },
});
