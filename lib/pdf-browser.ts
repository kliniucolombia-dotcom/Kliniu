import { chromium } from "playwright-core";
import sparticuzChromium from "@sparticuz/chromium";

// En local Playwright encuentra su Chromium en la caché del sistema, pero en
// Vercel (serverless) no hay navegador disponible: usamos el binario ligero de
// @sparticuz/chromium para poder renderizar el HTML a PDF.
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

export async function launchPdfBrowser() {
  if (!isServerless) {
    return chromium.launch({ headless: true });
  }

  return chromium.launch({
    args: sparticuzChromium.args,
    executablePath: await sparticuzChromium.executablePath(),
    headless: true,
  });
}
