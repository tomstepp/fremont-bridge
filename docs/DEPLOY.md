# Deploying to fremont.tomstepp.com (GitHub Pages)

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

## 4. fremont.tomstepp.com (you)

1. Namecheap → Domain List → tomstepp.com → Manage → **Advanced DNS** → Add New Record:

   | Type | Host | Value | TTL |
   |---|---|---|---|
   | CNAME | `fremont` | `tomstepp.github.io.` | Automatic |

2. GitHub: Settings → Pages → Custom domain: `fremont.tomstepp.com` → Save.
   GitHub checks the DNS (minutes, occasionally an hour), then issues HTTPS.
3. Tick **Enforce HTTPS** once it's offered.

## 5. Allow the domain on the TomTom key (you)

developer.tomtom.com → Dashboard → Keys → edit the key → allowed domains: add
`fremont.tomstepp.com` (and `localhost` to test traffic with `npm run dev`).
The key ships inside the page, so keep the domain list tight.

## Day to day

- **Deploy:** push to `main`. Tests run before the build, so a failing test
  stops a broken deploy.
