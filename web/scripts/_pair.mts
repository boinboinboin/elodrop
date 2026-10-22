import sharp from "sharp";
// Before | diff | after, for a band of a page: tsx _pair.mts <dir> <name> <top> <height> <out>
const [dir, name, top, height, out] = process.argv.slice(2);
const files = [`${dir}/before/${name}.png`, `${dir}/diff/${name}.png`, `${dir}/after/${name}.png`];
const w = (await sharp(files[0]).metadata()).width!;
const imgs = await Promise.all(files.map((f) => sharp(f).extract({ left: 0, top: +top, width: w, height: +height }).png().toBuffer()));
const sheet = await sharp({ create: { width: w, height: +height * 3 + 20, channels: 4, background: "#f0f" } }).composite(imgs.map((input, i) => ({ input, left: 0, top: i * (+height + 10) }))).png().toBuffer();
await sharp(sheet).resize(Math.min(w, 1000)).png().toFile(out);
