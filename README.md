# Is the Fremont Bridge up right now?

A small, silly site that guesses whether Seattle's Fremont Bridge is raised
for boats at this moment. There's no live feed for that, so it combines what
there is:

1. **History**: SDOT's [drawbridge opening log](https://data.seattle.gov/Transportation/SDOT-Drawbridge-Status/gm8h-9449)
   gives how often the bridge is up at this hour on the same weekday, this time
   of year: the last 4 weeks plus ±2 weeks around this date last year (9 days).
   That's a thin sample per hour, so it's blended with the year-round average
   for the weekday ([src/season.ts](src/season.ts)). SDOT posts the log about
   daily, so this is the starting odds, not live status.
2. **Traffic** (optional): TomTom's flow speed on the bridge. A crawl nudges
   the odds up; free-flowing traffic nudges them down.
3. **Camera**: the SDOT camera at Fremont Ave N & N 34th St. The page shows it
   and asks the viewer what they see, since the image can't be analyzed in the
   browser (no CORS headers).

Each live signal multiplies the odds by a hand-tuned likelihood ratio; see
[src/guess.ts](src/guess.ts).

## Develop

```bash
npm install
cp .env.example .env   # optional: add a TomTom key
npm run dev
```

`npm test` runs the guess logic tests; `npm run build` typechecks and builds to `dist/`.

The TomTom key is bundled into the page, so restrict it by referrer. The Seattle
Bike Now key only allows bike.tomstepp.com: either add this site's domain (and
`localhost` for dev) to it, or make a separate key.

## Deploy

Pushes to `main` publish to fremontbridge.com via GitHub Pages; one-time
setup is in [docs/DEPLOY.md](docs/DEPLOY.md).

## Photos

One or more per answer, in [public/img](public/img) named by answer level
(`nope.jpg`, `nope-2.jpg`, …); each visit picks one at random. All from
Wikimedia Commons. The CC BY 2.0 ones need their credit kept; the page
caption shows it. `og.jpg` (the link preview image) is cropped from yep-2.

| Answer | Photo | License |
|---|---|---|
| Definitely not | [Canal opening, Fremont Bridge, July 4, 1917](https://commons.wikimedia.org/wiki/File:Canal_opening,_Fremont_Bridge,_July_4,_1917_(MOHAI_5174).jpg), Webster & Stevens (MOHAI) | Public domain |
| Nope | [Fremont Bridge on opening day, June 15, 1917](https://commons.wikimedia.org/wiki/File:Fremont_Bridge_on_opening_day,_Seattle,_June_15,_1917_(MOHAI_9085).jpg), James Patrick Lee (MOHAI) | Public domain |
| Probably not | [Fremont Bridge on opening day of the Ship Canal, July 4, 1917](https://commons.wikimedia.org/wiki/File:Fremont_Bridge_on_opening_day_of_Lake_Washington_Ship_Canal,_Seattle,_July_4,_1917_(MOHAI_3033).jpg), Webster & Stevens (MOHAI) | Public domain |
| Hmm, maybe | [Fremont Bridge operator, 2001](https://commons.wikimedia.org/wiki/File:Seattle_-_Fremont_Bridge_operator,_2001.jpg), Ian Edelstein / Seattle Municipal Archives | CC BY 2.0 |
| Probably | [Gears inside Fremont Bridge, November 16, 1916](https://commons.wikimedia.org/wiki/File:Gears_inside_Fremont_Bridge,_Seattle,_November_16,_1916_(MOHAI_4623).jpg), James Patrick Lee (MOHAI) | Public domain |
| Yep | [Fremont Bridge at the opening of the Ship Canal, July 4, 1917](https://commons.wikimedia.org/wiki/File:Fremont_Bridge_at_the_opening_of_the_Lake_Washington_Ship_Canal,_July_4,_1917_(SEATTLE_1211).jpg), Asahel Curtis (Seattle Public Library) | Public domain |
| Definitely not (2) | [Streetcars on Fremont Bridge, 1936](https://commons.wikimedia.org/wiki/File:Seattle_-_Streetcars_on_Fremont_Bridge,_1936_(50490190031).jpg), Seattle Municipal Archives | CC BY 2.0 |
| Definitely not (3) | [Fremont Bridge, 1927](https://commons.wikimedia.org/wiki/File:Fremont_Bridge,_1927_(20946172692).jpg), Seattle Municipal Archives | CC BY 2.0 |
| Nope (2) | [Fremont Bridge, 1928](https://commons.wikimedia.org/wiki/File:Seattle_-_Fremont_Bridge,_1928_(39329192565).jpg), Seattle Municipal Archives | CC BY 2.0 |
| Nope (3) | [Fremont Bridge, Seattle 1920s](https://commons.wikimedia.org/wiki/File:Fremont_Bridge,_Seattle_1920s_(6940263233).jpg), William Creswell | CC BY 2.0 |
| Probably not (2) | [Fremont and Aurora Bridges, 1936](https://commons.wikimedia.org/wiki/File:Seattle_-_Fremont_and_Aurora_Bridges,_1936_(27128137481).jpg), Seattle Municipal Archives | CC BY 2.0 |
| Probably (2) | [Fremont Bridge workers, 1951](https://commons.wikimedia.org/wiki/File:Fremont_Bridge_workers,_Seattle,_1951.jpg), Seattle Municipal Archives | CC BY 2.0 |
| Yep (2), link preview | [Fremont drawbridge, 2012](https://commons.wikimedia.org/wiki/File:Fremont_drawbridge_(7967355360).jpg), Robert Ashworth | CC BY 2.0 |
| Definitely up | [U.S.S. Tatnuck passing under Fremont Bridge, 1936](https://commons.wikimedia.org/wiki/File:U.S.S._Tatnuck_passing_under_Fremont_Bridge,_1936.gif), Seattle Municipal Archives | CC BY 2.0 |
