/**
 * Vite pre-bundles react-qr-code via optimizeDeps.include (see vite.config.ts).
 * Single import site — do not import react-qr-code elsewhere.
 */
import QRCode from "react-qr-code";

export interface StoreQrCodeProps {
  value: string;
  size?: number;
  bgColor?: string;
  fgColor?: string;
}

export function StoreQrCode({
  value,
  size = 96,
  bgColor = "#FFFFFF",
  fgColor = "#1a1a2e",
}: StoreQrCodeProps) {
  return <QRCode value={value} size={size} bgColor={bgColor} fgColor={fgColor} />;
}
