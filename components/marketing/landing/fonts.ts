import { Instrument_Sans, JetBrains_Mono } from "next/font/google";

export const tellsSans = Instrument_Sans({
  variable: "--tl-font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const tellsMono = JetBrains_Mono({
  variable: "--tl-font-mono",
  subsets: ["latin"],
  display: "swap",
});
