# Deploying to seattle-bridges.com (GitHub Pages)

The site is static: the page fetches SDOT's bridge log, the traffic camera and
TomTom traffic itself. GitHub Actions builds it and publishes it to GitHub Pages
([.github/workflows/deploy.yml](../.github/workflows/deploy.yml)) on every push
to `main`. [public/CNAME](../public/CNAME) ships the custom domain with each build.

## 1. Create the GitHub repository (you)

Make a **public** repository (`fremont-bridge`) and push `main` to it. Pages
on a private repository needs GitHub Pro or higher.

## 2. TomTom key as a repository secret (you, optional)

Settings → Secrets and variables → Actions → **New repository secret**:

| Name | Value |
|---|---|
| `TOMTOM_KEY` | a TomTom key (the Seattle Bike Now one works once step 5 is done) |

Without it the site still works; the guess just skips the traffic signal.

## 3. Turn on Pages (you)

Settings → Pages → Build and deployment → Source: **GitHub Actions**.

Then push (or Actions → Deploy → **Run workflow**).

## 4. seattle-bridges.com (you)

A bare domain can't be a CNAME, so it points at GitHub's Pages servers by IP,
and `www` points at your GitHub Pages host. GitHub then redirects
www.seattle-bridges.com to seattle-bridges.com.

1. At the registrar's DNS settings for seattle-bridges.com (Namecheap: Domain
   List → seattle-bridges.com → Manage → **Advanced DNS**), first delete any
   parking records it added (often a `URL Redirect` or a `CNAME` for `www`
   pointing at a parking page). Then add:

   | Type | Host | Value |
   |---|---|---|
   | A | `@` | `185.199.108.153` |
   | A | `@` | `185.199.109.153` |
   | A | `@` | `185.199.110.153` |
   | A | `@` | `185.199.111.153` |
   | AAAA | `@` | `2606:50c0:8000::153` |
   | AAAA | `@` | `2606:50c0:8001::153` |
   | AAAA | `@` | `2606:50c0:8002::153` |
   | AAAA | `@` | `2606:50c0:8003::153` |
   | CNAME | `www` | `tomstepp.github.io.` |

   TTL: Automatic. The AAAA records (IPv6) are optional but recommended.

2. GitHub: Settings → Pages → Custom domain: `seattle-bridges.com` → Save.
   GitHub checks the DNS (minutes, occasionally a few hours for a new
   domain), then issues HTTPS.
3. Tick **Enforce HTTPS** once it's offered.

Recommended: verify the domain in your GitHub account (your profile Settings →
Pages → **Add a domain**) so no one else can point a GitHub Pages site at it.
GitHub gives you a TXT record to add, the same way as above.

## 5. Allow the domain on the TomTom key (you)

developer.tomtom.com → Dashboard → Keys → edit the key → allowed domains: add
`seattle-bridges.com` and `www.seattle-bridges.com` (and `localhost` to test
traffic with `npm run dev`). The key ships inside the page, so keep the domain
list tight.

## Moving from fremontbridge.com (one time)

The site started at fremontbridge.com. It now lives at seattle-bridges.com, and
fremontbridge.com forwards there from the small `fremontbridge-redirect` repo
(Namecheap's own redirect can't do HTTPS). GitHub lets only one Pages site
claim a domain, so do it in this order:

1. Add seattle-bridges.com's DNS records (step 4 above).
2. Push this repo, then Settings → Pages → Custom domain: change
   `fremontbridge.com` to `seattle-bridges.com` → Save. Tick **Enforce HTTPS**
   once offered. This frees fremontbridge.com.
3. Create a public `fremontbridge-redirect` repo on GitHub and push that folder.
   Its Settings → Pages → Source: **Deploy from a branch**, `main`, `/ (root)`.
   Custom domain: `fremontbridge.com` → Save, then **Enforce HTTPS** once offered.
4. Add seattle-bridges.com to the TomTom key (step 5 above).

fremontbridge.com's DNS records don't change; they already point at GitHub.
Between steps 2 and 3 fremontbridge.com shows GitHub's 404 page, so do them
back to back.

## Day to day

- **Deploy:** push to `main`. Tests run before the build, so a failing test
  stops a broken deploy.
