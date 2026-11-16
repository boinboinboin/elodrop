// A box with an arrow up out of it: the share button in Safari on iPhone and iPad (the install instructions)
import { type IconProps, iconProps } from "./iconProps";

export const ShareBox = ({ className }: IconProps) => (
  <svg {...iconProps(className)}>
    <path d="M8 10H6v11h12V10h-2" />
    <path d="M12 3v12" />
    <path d="m8 7 4-4 4 4" />
  </svg>
);
