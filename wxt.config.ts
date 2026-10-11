import { defineConfig } from 'wxt';
import react from '@vitejs/plugin-react';

export default defineConfig({
  srcDir: "src",
  vite: () => ({ plugins: [react()] }),
  manifest: {
    name: '__MSG_extName__',
    short_name: '__MSG_appName__',
    description: '__MSG_extDesc__',
    default_locale: 'en',
    version: "0.4.1",
    minimum_chrome_version: "120",
    permissions: ['storage'],
    host_permissions: [
      'https://www.youtube.com/*',
      'https://www.tiktok.com/*',
      'https://www.instagram.com/*',
    ],
    action: {
      default_title: '__MSG_appName__',
    },
    icons: {
      16: 'icon/16.png',
      32: 'icon/32.png',
      48: 'icon/48.png',
      128: 'icon/128.png',
    },
  },
});
