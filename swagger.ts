export const openApiSpec = {
  openapi: "3.0.0",
  info: {
    title: "Deploy Bot API",
    version: "1.0.0",
    description: "API endpoints for triggering deployments and handling Telegram Webhooks",
  },
  paths: {
    "/healthz": {
      get: {
        summary: "Health Check",
        description: "Returns 'ok' to verify the server status.",
        responses: {
          "200": {
            description: "Successful response",
            content: {
              "text/plain": {
                schema: {
                  type: "string",
                  example: "ok",
                },
              },
            },
          },
        },
      },
    },
    "/deploy-komerz-frontend": {
      get: {
        summary: "Deploy Komerz Frontend (GET)",
        description: "Triggers deployment of the Komerz Frontend service.",
        responses: {
          "200": {
            description: "Deployment triggered successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    target: { type: "string", example: "komerz-frontend" },
                    output: { type: "string", example: "Successfully triggered deployment for komerz-frontend" },
                  },
                },
              },
            },
          },
          "500": {
            description: "Deployment trigger failed",
          },
        },
      },
      post: {
        summary: "Deploy Komerz Frontend (POST)",
        description: "Triggers deployment of the Komerz Frontend service.",
        responses: {
          "200": {
            description: "Deployment triggered successfully",
          },
          "500": {
            description: "Deployment trigger failed",
          },
        },
      },
    },
    "/deploy-komerz-backend": {
      get: {
        summary: "Deploy Komerz Backend (GET)",
        description: "Triggers deployment of the Komerz Backend service.",
        responses: {
          "200": {
            description: "Deployment triggered successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    target: { type: "string", example: "komerz-backend" },
                    output: { type: "string", example: "Successfully triggered deployment for komerz-backend" },
                  },
                },
              },
            },
          },
          "500": {
            description: "Deployment trigger failed",
          },
        },
      },
      post: {
        summary: "Deploy Komerz Backend (POST)",
        description: "Triggers deployment of the Komerz Backend service.",
        responses: {
          "200": {
            description: "Deployment triggered successfully",
          },
          "500": {
            description: "Deployment trigger failed",
          },
        },
      },
    },
  },
};

export const swaggerUiHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Deploy Bot API Swagger UI</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <style>
    html { box-sizing: border-box; overflow: -y-scroll; }
    *, *:before, *:after { box-sizing: inherit; }
    body { margin: 0; background: #fafafa; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        spec: ${JSON.stringify(openApiSpec)},
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        layout: "BaseLayout"
      });
    };
  </script>
</body>
</html>
`;
