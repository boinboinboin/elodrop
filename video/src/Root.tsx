import { Composition, staticFile, type CalculateMetadataFunction } from "remotion";
import { Race, type RaceData, type RaceProps, LISTS, timeline } from "./Race";

const FPS = 30;
const calculateMetadata: CalculateMetadataFunction<RaceProps> = async ({ props }) => {
  const data: RaceData = await fetch(staticFile(`data/${props.list}.json`)).then((r) => r.json());
  return { props: { ...props, data }, durationInFrames: timeline(data, props, FPS).total };
};

// One composition per list and format: <list>-portrait (9:16, Reels/TikTok/Shorts) and <list>-landscape (16:9)
export function Root() {
  return (
    <>
      {Object.keys(LISTS).map((list) =>
        (
          [
            ["portrait", 1080, 1920],
            ["landscape", 1920, 1080],
          ] as const
        ).map(([format, width, height]) => (
          <Composition
            key={`${list}-${format}`}
            id={`${list}-${format}`}
            component={Race}
            width={width}
            height={height}
            fps={FPS}
            durationInFrames={1}
            defaultProps={{ list, from: "2008-09-01", framesPerWeek: 11, data: null } as RaceProps}
            calculateMetadata={calculateMetadata}
          />
        )),
      )}
    </>
  );
}
