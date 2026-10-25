# Is the Fremont Bridge up right now?

A small, silly site that guesses whether Seattle's ship canal drawbridges are
raised for boats at this moment: Fremont at seattle-bridges.com, and Ballard,
University, Montlake, South Park, First Avenue South and Spokane Street at
`/ballard`, `/university`, `/montlake`, `/south-park`, `/first-ave` and
`/spokane-st`, and
all four at a glance at `/all` ([src/overview.ts](src/overview.ts)).
fremontbridge.com redirects here (from the separate `fremontbridge-redirect`
repo).

There's no live feed for that, so it combines what there is:

1. **History**: SDOT's [drawbridge opening log](https://data.seattle.gov/Transportation/SDOT-Drawbridge-Status/gm8h-9449)
   gives how often the bridge is up at this hour on the same weekday, this time
   of year: the last 4 weeks plus ±2 weeks around this date last year (9 days).
   That's a thin sample per hour, so it's blended with the year-round average
   for the weekday ([src/season.ts](src/season.ts)). SDOT posts the log about
   daily, so this is the starting odds, not live status.
2. **Traffic** (optional): TomTom's flow speed on the bridge. A crawl nudges
   the odds up; free-flowing traffic nudges them down.
3. **Camera**: SDOT cameras at each bridge. The page shows them and asks the
   viewer what they see, since the images can't be analyzed in the browser
   (no CORS headers).

Each live signal multiplies the odds by a hand-tuned likelihood ratio; see
[src/guess.ts](src/guess.ts).

## Bridges

Everything that differs per bridge is in [src/bridges.ts](src/bridges.ts):
SDOT's log name, TomTom point, cameras, photos, and opening rules from
[33 CFR 117.1051](https://www.ecfr.gov/current/title-33/part-117/section-117.1051)
(Montlake's rush closures are longer and change with the season, it opens only
on the hour and half hour 12:30–3:30 PM, and it has no overnight notice rule).
Federal holidays lift the weekday rules, except Columbus Day for SDOT's three
bridges ([src/holidays.ts](src/holidays.ts)). The Duwamish River bridges follow
[33 CFR 117.1041](https://www.ecfr.gov/current/title-33/part-117/section-117.1041):
South Park and First Avenue South close at their own rush hours, South Park
needs 12 hours' notice overnight, and the Spokane Street swing bridge has no
closures. The build writes a copy of the page to each bridge's
path with its own title, link-preview tags and preview image
(`public/img/og-<bridge>.jpg`; see `vite.config.ts`).

SDOT's University log went quiet in May 2026 and Spokane Street's in December
2025; averages divide by the days
actually logged, and the page says when a bridge's log has stopped.

## Develop

```bash
npm install
cp .env.example .env   # optional: add a TomTom key
npm run dev
```

`npm test` runs the guess logic tests; `npm run build` typechecks and builds to `dist/`.

The TomTom key is bundled into the page, so restrict it to the site's domain.
TomTom won't accept `localhost`, so in dev the Vite server forwards traffic
requests as if from the live site (see `vite.config.ts`).

## Deploy

Pushes to `main` publish to seattle-bridges.com via GitHub Pages; one-time
setup is in [docs/DEPLOY.md](docs/DEPLOY.md).

## Photos

One or more per answer, in a folder per bridge under [public/img](public/img)
named by answer level (`nope.jpg`, `nope-2.jpg`, …); which file goes with which
answer is in [src/bridges.ts](src/bridges.ts), and each visit picks one at
random. All from Wikimedia Commons. The CC BY 2.0 ones need their credit kept;
the page caption shows it. `og.jpg` (the link preview image) is cropped from
`fremont/yep-2.jpg`.

### Fremont

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

### Ballard

| File | Photo | License |
|---|---|---|
| `definitely-not.jpg` | [Opening of Municipal Street Railway on Ballard Bridge, 1918](https://commons.wikimedia.org/wiki/File:Opening_of_Municipal_Street_Railway_on_Ballard_Bridge,_1918_(2942061369).gif), Seattle Municipal Archives | CC BY 2.0 |
| `definitely-not-2.jpg` | [Ballard Bridge, 1941](https://commons.wikimedia.org/wiki/File:Ballard_Bridge,_1941.jpg), Seattle Municipal Archives | CC BY 2.0 |
| `nope.jpg` | [Ballard Bridge, Seattle, March 13, 1918 (MOHAI 4637)](https://commons.wikimedia.org/wiki/File:Ballard_Bridge,_Seattle,_March_13,_1918_(MOHAI_4637).jpg), James Patrick Lee | Public domain |
| `probably-not.jpg` | [Fishing boats near Ballard Bridge, 1936](https://commons.wikimedia.org/wiki/File:Seattle_-_Fishing_boats_near_Ballard_Bridge,_1936_(25757799280).jpg), Seattle Municipal Archives | CC BY 2.0 |
| `maybe.jpg` | [Tug Winona near Ballard Bridge, Seattle, ca 1925 (MOHAI 3170)](https://commons.wikimedia.org/wiki/File:Tug_Winona_near_Ballard_Bridge,_Seattle,_ca_1925_(MOHAI_3170).jpg), Webster & Stevens | Public domain |
| `up-1918.jpg` | [Ballard Bridge with open drawbridge to allow passage of a ship, Seattle, Washington, March 13, 1918 (LEE 260)](https://commons.wikimedia.org/wiki/File:Ballard_Bridge_with_open_drawbridge_to_allow_passage_of_a_ship,_Seattle,_Washington,_March_13,_1918_(LEE_260).jpeg), James Patrick Lee | Public domain |
| `up-2011.jpg` | [View from boat of Ballard Bridge opening - Seattle 2011](https://commons.wikimedia.org/wiki/File:View_from_boat_of_Ballard_Bridge_opening_-_Seattle_2011.jpg), Brian Teutsch | CC BY 2.0 |

### University

| File | Photo | License |
|---|---|---|
| `definitely-not.jpg` | [Traffic on University Bridge, 1933](https://commons.wikimedia.org/wiki/File:Seattle_-_Traffic_on_University_Bridge,_1933_(49856497042).jpg), Seattle Municipal Archives | CC BY 2.0 |
| `nope.jpg` | [Horses crossing University Bridge, 1933](https://commons.wikimedia.org/wiki/File:Seattle_-_Horses_crossing_University_Bridge,_1933_(46762498985).jpg), Seattle Municipal Archives | CC BY 2.0 |
| `probably-not.jpg` | [University Bridge, 1932](https://commons.wikimedia.org/wiki/File:Seattle_-_University_Bridge,_1932_(54521711095).jpg), Seattle Municipal Archives | CC BY 2.0 |
| `maybe.jpg` | [Opening day celebration for the University Bridge showing cars driving across bridge, 1919 (SEATTLE 3746)](https://commons.wikimedia.org/wiki/File:Opening_day_celebration_for_the_University_Bridge_showing_cars_driving_across_bridge,_1919_(SEATTLE_3746).jpg), Seattle Public Library | Public domain |
| `probably.jpg` | [Gears on the University Bridge, Seattle, September 18, 1918 (MOHAI 4631)](https://commons.wikimedia.org/wiki/File:Gears_on_the_University_Bridge,_Seattle,_September_18,_1918_(MOHAI_4631).jpg), James Patrick Lee | Public domain |
| `yep.jpg` | [University Bridge, probably 1919 (SEATTLE 599)](https://commons.wikimedia.org/wiki/File:University_Bridge,_probably_1919_(SEATTLE_599).jpg), Seattle Public Library | Public domain |
| `definitely.jpg` | [University Bridge, early 1980s](https://commons.wikimedia.org/wiki/File:Seattle_-_University_Bridge,_early_1980s_(51308022655).jpg), Seattle Municipal Archives | CC BY 2.0 |

### Montlake

| File | Photo | License |
|---|---|---|
| `nope.jpg` | [Montlake Bridge, ca 1925 (MOHAI 6216)](https://commons.wikimedia.org/wiki/File:Montlake_Bridge,_ca_1925_(MOHAI_6216).jpg), Webster & Stevens | Public domain |
| `probably-not.jpg` | [Boats in the Montlake Cut, 1951](https://commons.wikimedia.org/wiki/File:Seattle_-_Boats_in_the_Montlake_Cut,_1951_(41612096402).jpg), Seattle Municipal Archives | CC BY 2.0 |
| `maybe.jpg` | [Montlake Bridge and Portage Bay from Shelby Street, May 15, 1925 (CURTIS 1153)](https://commons.wikimedia.org/wiki/File:Montlake_Bridge_and_Portage_Bay_from_Shelby_Street,_May_15,_1925_(CURTIS_1153).jpg), Asahel Curtis | Public domain |
| `probably.jpg` | [Montlake Bridge drawbridge mechanism, Seattle, January 23, 1924 (MOHAI 4625)](https://commons.wikimedia.org/wiki/File:Montlake_Bridge_drawbridge_mechanism,_Seattle,_January_23,_1924_(MOHAI_4625).jpg), James Patrick Lee | Public domain |
| `probably-2.jpg` | [Workers with Montlake Bridge gears, 1953](https://commons.wikimedia.org/wiki/File:Seattle_-_Workers_with_Montlake_Bridge_gears,_1953.jpg), Seattle Municipal Archives | CC BY 2.0 |
| `yep.jpg` | [Ship passing under the Montlake Bridge, 1926 (SEATTLE 3795)](https://commons.wikimedia.org/wiki/File:Ship_passing_under_the_Montlake_Bridge,_1926_(SEATTLE_3795).jpg), Linkletter Studio | Public domain |
| `definitely.jpg` | [Montlake Bridge, 1934](https://commons.wikimedia.org/wiki/File:Montlake_Bridge,_1934_(50185716036).jpg), Seattle Municipal Archives | CC BY 2.0 |

### South Park

| File | Photo | License |
|---|---|---|
| `definitely.jpg` | [BARGE TRAFFIC ON THE DUWAMISH RIVER. THE RIVER FLOWS INTO PUGET SOUND AT SEATTLE - NARA - 552262](https://commons.wikimedia.org/wiki/File:BARGE_TRAFFIC_ON_THE_DUWAMISH_RIVER._THE_RIVER_FLOWS_INTO_PUGET_SOUND_AT_SEATTLE_-_NARA_-_552262.jpg), Doug Wilson | Public domain |
| `up-2010.jpg` | [South Park Bridge Seattle - aerial view in 2010 with old bascule leaves raised, awaiting replacement](https://commons.wikimedia.org/wiki/File:South_Park_Bridge_Seattle_-_aerial_view_in_2010_with_old_bascule_leaves_raised,_awaiting_replacement.jpg), brewbooks | CC BY-SA 2.0 |
| `probably-not.jpg` | [South Park Bridge, Seattle](https://commons.wikimedia.org/wiki/File:South_Park_Bridge,_Seattle.JPG), Happybluemo | CC BY-SA 4.0 |
| `nope.jpg` | [New South Park Bridge from west in 2022 - Seattle, WA](https://commons.wikimedia.org/wiki/File:New_South_Park_Bridge_from_west_in_2022_-_Seattle,_WA.jpg), Steve Morgan | CC BY-SA 4.0 |
| `definitely-not.jpg` | [Driving across the new South Park Bridge in Seattle (2022)](https://commons.wikimedia.org/wiki/File:Driving_across_the_new_South_Park_Bridge_in_Seattle_(2022).jpg), Steve Morgan | CC BY-SA 4.0 |
| `maybe.jpg` | [North tower of new South Park Bridge in Seattle (2022)](https://commons.wikimedia.org/wiki/File:North_tower_of_new_South_Park_Bridge_in_Seattle_(2022).jpg), Steve Morgan | CC BY-SA 4.0 |

### First Avenue South

| File | Photo | License |
|---|---|---|
| `up-2009.jpg` | [Duwamish Water Taxi](https://commons.wikimedia.org/wiki/File:Duwamish_Water_Taxi_(3853623248).jpg), U.S. EPA | Public domain |
| `definitely-not.jpg` | [1st Ave S. Bridge opening with Mayor Clinton and Governor Langlie (53786)](https://commons.wikimedia.org/wiki/File:1st_Ave_S._Bridge_opening_with_Mayor_Clinton_and_Governor_Langlie_(53786).jpg), Unknown photographer | Public domain |
| `nope.jpg` | [1st Ave S Bridge looking toward Seattle](https://commons.wikimedia.org/wiki/File:Seattle_-_1st_Ave_S_Bridge_looking_toward_Seattle.jpg), Joe Mabel | CC BY-SA 3.0 |
| `maybe.jpg` | [First Avenue Bridge from South River Street 01](https://commons.wikimedia.org/wiki/File:Seattle_-_First_Avenue_Bridge_from_South_River_Street_01.jpg), Joe Mabel | CC BY-SA 4.0 |
| `probably.jpg` | [First Avenue Bridge from South Park Bridge](https://commons.wikimedia.org/wiki/File:Seattle_-_First_Avenue_Bridge_from_South_Park_Bridge.jpg), Joe Mabel | CC BY-SA 3.0 |
| `probably-not.jpg` | [Duwamish River - 1st Ave S Bridge aerial 01](https://commons.wikimedia.org/wiki/File:Duwamish_River_-_1st_Ave_S_Bridge_aerial_01.jpg), Joe Mabel | CC BY-SA 3.0 |

### Spokane Street

| File | Photo | License |
|---|---|---|
| `definitely.jpg` | [Spokane Street Bridge - view from east approach of swing span turned (2009)](https://commons.wikimedia.org/wiki/File:Spokane_Street_Bridge_-_view_from_east_approach_of_swing_span_turned_(2009).jpg), Adam Foster | CC BY 2.0 |
| `maybe.jpg` | [West Seattle pivotal bridge](https://commons.wikimedia.org/wiki/File:West_Seattle_pivotal_bridge_(33681713860).jpg), Robert Ashworth | CC BY 2.0 |
| `yep.jpg` | [West Seattle pivotal bridge](https://commons.wikimedia.org/wiki/File:West_Seattle_pivotal_bridge_(33936749251).jpg), Robert Ashworth | CC BY 2.0 |
| `probably.jpg` | [Spokane Street Bridge - looking down at base of west swing span while turned](https://commons.wikimedia.org/wiki/File:Spokane_Street_Bridge_-_looking_down_at_base_of_west_swing_span_while_turned.jpg), Robert Ashworth | CC BY 2.0 |
| `probably-not.jpg` | [Spokane Street Bridge from east, from West Seattle Bridge Trail (2003)](https://commons.wikimedia.org/wiki/File:Spokane_Street_Bridge_from_east,_from_West_Seattle_Bridge_Trail_(2003).jpg), Robert Ashworth | CC BY 2.0 |
| `definitely-not.jpg` | [Two trucks on West Spokane Street swing bridge, Seattle, June 29, 1918 (MOHAI 3516)](https://commons.wikimedia.org/wiki/File:Two_trucks_on_West_Spokane_Street_swing_bridge,_Seattle,_June_29,_1918_(MOHAI_3516).jpg), Unknown | Public domain |
| `probably-2.jpg` | [West Spokane Street Bridge drawbridge gears, Seattle, August 22, 1924 (MOHAI 9079)](https://commons.wikimedia.org/wiki/File:West_Spokane_Street_Bridge_drawbridge_gears,_Seattle,_August_22,_1924_(MOHAI_9079).jpg), James Patrick Lee | Public domain |
| `nope.jpg` | [Streetcar on Spokane Street bascule bridge, 1928](https://commons.wikimedia.org/wiki/File:Seattle_-_Streetcar_on_Spokane_Street_bascule_bridge,_1928.jpg), Seattle Municipal Archives | CC BY 2.0 |

Some photos of Spokane Street show the earlier bascule and swing bridges at the same crossing; their captions say so.
