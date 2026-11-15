// Clock-in and clock-out both require a GPS fix server-side, so both call
// this instead of hitting navigator.geolocation directly — one place to get
// the error messaging right for permission-denied vs. timeout vs. an
// unsupported browser.
export function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Your browser does not support location access, which is required to clock in or out.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10_000,
    });
  });
}

export function geolocationErrorMessage(err: unknown): string {
  if (err instanceof GeolocationPositionError) {
    switch (err.code) {
      case err.PERMISSION_DENIED:
        return 'Location access was denied — allow location permissions in your browser and try again.';
      case err.POSITION_UNAVAILABLE:
        return "Couldn't determine your location — check your device's location settings and try again.";
      case err.TIMEOUT:
        return 'Timed out getting your location — try again.';
    }
  }
  if (err instanceof Error) return err.message;
  return 'Could not get your location.';
}
