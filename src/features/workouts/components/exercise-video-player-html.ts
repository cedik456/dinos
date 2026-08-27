const NATIVE_PLAYER_BASE_URL = "https://dino.local/";

function escapeHtmlAttribute(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function nativeExerciseVideoSource(embedUrl: string, title: string) {
  const safeUrl = escapeHtmlAttribute(embedUrl);
  const safeTitle = escapeHtmlAttribute(title);

  return {
    baseUrl: NATIVE_PLAYER_BASE_URL,
    html: `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
    <meta name="referrer" content="strict-origin-when-cross-origin" />
    <style>
      html, body, iframe { width: 100%; height: 100%; margin: 0; padding: 0; border: 0; background: #000; overflow: hidden; }
    </style>
  </head>
  <body>
    <iframe
      src="${safeUrl}"
      title="${safeTitle}"
      allow="fullscreen; picture-in-picture"
      allowfullscreen
    ></iframe>
  </body>
</html>`,
  };
}
