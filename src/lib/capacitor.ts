/**
 * Initialises Capacitor native plugins when the app runs inside a native
 * Android / iOS shell.  Safe to call unconditionally – the guard at the top
 * makes it a no-op in the browser.
 */
export async function initCapacitorPlugins(): Promise<void> {
  if (typeof window === 'undefined') return;

  // @ts-ignore – Capacitor global injected by the native runtime
  const isNative = (window as any).Capacitor?.isNativePlatform?.() ?? false;
  if (!isNative) return;

  // Status bar – match the sidebar brand colour
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#0F4C5C' });
  } catch {
    // plugin unavailable in web context
  }

  // Hide the splash screen after the app is ready
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide({ fadeOutDuration: 300 });
  } catch {
    // plugin unavailable
  }

  // Android physical back button: go back in history or exit the app
  try {
    const { App } = await import('@capacitor/app');
    await App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        App.exitApp();
      }
    });
  } catch {
    // plugin unavailable
  }

  // Keyboard – prevent the WebView from resizing awkwardly
  try {
    const { Keyboard } = await import('@capacitor/keyboard');
    await Keyboard.setAccessoryBarVisible({ isVisible: false });
  } catch {
    // plugin unavailable
  }
}
