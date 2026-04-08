'use client';

declare global {
  interface Window {
    google?: any;
    __sphereGoogleMapsLoadingPromise?: Promise<any>;
  }
}

const GOOGLE_MAPS_SCRIPT_ID = 'sphere-google-maps-script';

export async function loadGoogleMaps(): Promise<any> {
  if (typeof window === 'undefined') {
    throw new Error('Google Maps can only be loaded in the browser.');
  }

  if (window.google?.maps) {
    return window.google.maps;
  }

  if (window.__sphereGoogleMapsLoadingPromise) {
    return window.__sphereGoogleMapsLoadingPromise;
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error('Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY');
  }

  window.__sphereGoogleMapsLoadingPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(GOOGLE_MAPS_SCRIPT_ID) as HTMLScriptElement | null;

    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.google.maps), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Google Maps')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = GOOGLE_MAPS_SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async&v=weekly`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google.maps);
    script.onerror = () => reject(new Error('Failed to load Google Maps'));
    document.head.appendChild(script);
  });

  return window.__sphereGoogleMapsLoadingPromise;
}
