# Elodrop racing chart videos

Bar chart race videos of the top 10 in each ranking list over the whole history (2008 onwards), made with
[Remotion](https://www.remotion.dev) (React rendered to MP4, frame by frame). Not part of the site: nothing here is deployed.

## Once

```sh
npm install
sudo apt install libnss3 libnspr4 libasound2t64   # the libraries Remotion's headless Chrome needs (WSL/Ubuntu)
```

## Making the videos

```sh
(cd ../pipeline && node rate.mjs > /dev/null)   # ratings from the saved data, with the current rules
node export-top10.mjs ../pipeline               # the top-10 CSVs in pipeline/data/racing
node prepare.mjs                                # those as JSON in public/data, plus club logos and font
npx remotion studio                             # preview and adjust in the browser
npx remotion render men-portrait out/men-portrait.mp4
```

Compositions: `<list>-portrait` (1080×1920, Reels/TikTok/Shorts) and `<list>-landscape` (1920×1080), for the lists
`men`, `women`, `mensDoubles`, `womensDoubles`, `mixedDoubles-men` and `mixedDoubles-women`.

Props (in the studio, or `--props='{"from":"2015-07-01","framesPerWeek":4}'` on render):
- `from`: the first week shown (default 2008-09-01, autumn 2008: the months before are chaotic as players get their first ratings)
- `framesPerWeek`: speed, at 30 fps (default 11: a week in about 0.37 s, about 6 minutes in all)

Places and ratings glide from week to week, and each gain or loss shows beside the rating for a moment. At the end the
race settles, the final standings hold for 5 seconds, and it fades into the installed app's logo animation
(`web/components/layout/AppSplash.tsx`), rebuilt frame by frame in `src/Outro.tsx`. A 6-minute video renders in about 3 minutes.

The CSVs: `top10-long.csv` (one row per player per week), `top10-<list>-wide.csv` (one row per player, a column per
week, blank while inactive) and `top10-players.csv` (everyone who has been in a top 10).
