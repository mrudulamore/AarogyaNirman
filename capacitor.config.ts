import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aarogyanirman.app',
  appName: 'AarogyaNirman',
  webDir: 'dist',
  plugins: {
    // MainActivity owns the safe-area padding and paints behind the status bar.
    SystemBars: { insetsHandling: 'disable', style: 'DARK', hidden: false }
  }
};

export default config;
