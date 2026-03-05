import { ScrollViewStyleReset } from 'expo-router/html';

export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="theme-color" content="#0F0F0F" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="POTSense" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="manifest" href="/manifest.json" />
        <title>POTSense - Sense your triggers</title>
        <meta name="description" content="Track POTS episodes, discover your triggers, and see how barometric pressure affects you. Free for iOS, Android, and Web." />

        {/* Open Graph (Facebook, LinkedIn, etc.) */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.potsense.org" />
        <meta property="og:title" content="POTSense - Track POTS Episodes & Discover Your Triggers" />
        <meta property="og:description" content="The first POTS app that auto-captures barometric pressure and correlates it with your episodes. Track symptoms, identify patterns, share with your doctor." />
        <meta property="og:image" content="https://www.potsense.org/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content="POTSense" />

        {/* Twitter/X Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="POTSense - Track POTS Episodes & Discover Your Triggers" />
        <meta name="twitter:description" content="Auto barometric pressure capture + episode correlation. Free for iOS, Android, and Web." />
        <meta name="twitter:image" content="https://www.potsense.org/og-image.png" />
        <ScrollViewStyleReset />
        <script dangerouslySetInnerHTML={{ __html: refCaptureScript }} />
        <style dangerouslySetInnerHTML={{ __html: globalStyles }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

// Capture ?ref= param on first page load and save to localStorage
const refCaptureScript = `
try {
  var p = new URLSearchParams(window.location.search);
  var r = p.get('ref');
  if (r) localStorage.setItem('potsense_ref', r);
} catch(e) {}
`;

const globalStyles = `
body {
  background-color: #0F0F0F;
  color: #fff;
  margin: 0;
  padding: 0;
}
`;
