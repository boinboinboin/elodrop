// An arrow down onto a line: download, here installing the site as an app (components/layout/InstallApp.tsx)
import { type IconProps, iconProps } from "./iconProps";

export const Download = ({ className }: IconProps) => (
  <svg {...iconProps(className)}>
    <path d="M12 4v11" />
    <path d="m7 10 5 5 5-5" />
    <path d="M5 20h14" />
  </svg>
);
