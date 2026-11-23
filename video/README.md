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
- `from`: the first week shown (default 2009-09-01, autumn 2009; the months before 2008-09 are chaotic as players get their first ratings)
- `framesPerWeek`: speed, at 30 fps (default 5: a week in about 0.17 s, about 2¾ minutes in all)

It opens with a title card (`src/TitleCard.tsx`, about 3 seconds): the installed app's logo animation
(`web/components/layout/AppSplash.tsx`, rebuilt frame by frame in `src/Logo.tsx`), the list's name, what it shows and the
years, before the card slides up and away, uncovering the race's first week. Places and ratings glide from week to week,
and each gain or loss shows beside the rating for a moment. At the end the race settles, the final standings hold for 5
seconds, and it fades into the logo animation again with the site's name and address (`src/Outro.tsx`). A video at
the defaults renders in about 1½ minutes.

The GPU doesn't help: the default (software) renderer is the fastest. The frames are flat shapes and text, cheap to draw
without a GPU, and with one every frame has to be copied back from it for the screenshot. Measured on 600 frames:
- Windows, Chrome for Testing with `--gl=angle` on the RTX 4050 (Chrome needs "High performance" in Windows' graphics
  settings, or it takes the integrated Intel GPU): 88 s, against 31 s with the default renderer.
- WSL: Ubuntu's Mesa has no Vulkan driver for WSL's GPU (`--gl=vulkan` falls back to software: 66 s against 20 s), and
  headless Chrome can't use its OpenGL driver (`--gl=angle-egl`: no EGL display).

The CSVs: `top10-long.csv` (one row per player per week), `top10-<list>-wide.csv` (one row per player, a column per
week, blank while inactive) and `top10-players.csv` (everyone who has been in a top 10).
