/**
 * Renders the Swagger UI page ourselves, loading its JS/CSS from a CDN
 * instead of serving swagger-ui-express's bundled static files locally.
 *
 * Why: swagger-ui-express serves those files via express.static() pointing
 * at swagger-ui-dist's install directory, read from disk at *runtime*. On a
 * serverless platform (Vercel), the deployment only includes files that
 * static dependency-tracing can see being require()'d/imported — a
 * directory read at runtime by express.static isn't visible to that
 * analysis, so the actual .js/.css files never make it into the deployed
 * function. Loading them from the CDN instead sidesteps that entirely, and
 * works identically on Vercel, the Droplet, or anywhere else.
 *
 * Pinned to the exact swagger-ui-dist version swagger-ui-express currently
 * bundles (check node_modules/swagger-ui-dist/package.json after a
 * dependency update, and bump this to match).
 */
const SWAGGER_UI_DIST_VERSION = "5.32.14";
const CDN_BASE = `https://unpkg.com/swagger-ui-dist@${SWAGGER_UI_DIST_VERSION}`;

export function renderSwaggerHtml(specUrl: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <title>SOLTECH Hub API Docs</title>
  <link rel="stylesheet" href="${CDN_BASE}/swagger-ui.css" />
  <link rel="icon" type="image/png" href="${CDN_BASE}/favicon-32x32.png" sizes="32x32" />
  <style>body { margin: 0; }</style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="${CDN_BASE}/swagger-ui-bundle.js"></script>
  <script src="${CDN_BASE}/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function () {
      window.ui = SwaggerUIBundle({
        url: ${JSON.stringify(specUrl)},
        dom_id: "#swagger-ui",
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        layout: "StandaloneLayout",
      });
    };
  </script>
</body>
</html>`;
}
