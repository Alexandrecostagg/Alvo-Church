declare module "qrcode.react" {
  import type { CSSProperties } from "react";

  interface QRCodeProps {
    value: string;
    size?: number;
    level?: "L" | "M" | "Q" | "H";
    marginSize?: number;
    bgColor?: string;
    fgColor?: string;
    style?: CSSProperties;
    className?: string;
    imageSettings?: {
      src: string;
      height: number;
      width: number;
      excavate?: boolean;
      x?: number;
      y?: number;
    };
  }

  export function QRCodeSVG(props: QRCodeProps): JSX.Element;
  export function QRCodeCanvas(props: QRCodeProps): JSX.Element;
}
