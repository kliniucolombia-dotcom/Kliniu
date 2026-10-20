import type { CapacitorConfig } from "@capacitor/cli";

// La app carga la página del conductor desde el servidor: los cambios web llegan sin reinstalar.
// Para probar con un túnel: SERVER_URL=https://xxxx.trycloudflare.com npx cap sync android
const serverUrl = process.env.SERVER_URL ?? "https://kliniucolombia.com";

const config: CapacitorConfig = {
  appId: "co.kliniu.conductor",
  appName: "KLINIU Conductor",
  webDir: "www",
  server: {
    url: `${serverUrl}${process.env.START_PATH ?? "/conductor"}`, // START_PATH solo para pruebas
    allowNavigation: [new URL(serverUrl).host],
  },
  android: {
    appendUserAgent: "KliniuConductor/1.0",
  },
};

export default config;
