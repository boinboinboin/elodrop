// The export's metadata: when it was built, and the tournament links of matches
import type { Meta } from "@/types";
import { load } from "./load";

export const getMeta = async () => load<Meta>("meta.json");
