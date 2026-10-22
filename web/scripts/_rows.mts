import sharp from "sharp";
const [file] = process.argv.slice(2);
const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
const bands: [number, number][] = [];
for (let y = 0; y < info.height; y++) {
  let red = false;
  for (let x = 0; x < info.width && !red; x++) { const i = (y * info.width + x) * info.channels; red = data[i] === 230 && data[i + 1] === 20; }
  if (red) { const last = bands.at(-1); if (last && y - last[1] <= 12) last[1] = y; else bands.push([y, y]); }
}
console.log(bands.length, "bands:", bands.slice(0, 12).map(([a, b]) => `${a}-${b}`).join(" "));
