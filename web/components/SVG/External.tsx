// An arrow out of a box: a link that leaves elodrop (components/ui/ExternalLink.tsx)
import { type IconProps, iconProps } from "./iconProps";

export const External = ({ className }: IconProps) => (
  <svg {...iconProps(className)}>
    <path d="M15 3h6v6" />
    <path d="M10 14 21 3" />
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
  </svg>
);
