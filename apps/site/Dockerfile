# Questing's frontpage, which Coolify builds and runs at questing.fi (DEPLOYMENT.md).
# Build context: the repository root (it uses the app's logo and icons).

FROM node:24-slim AS build
WORKDIR /repo
COPY apps/app/assets/logo apps/app/assets/logo
COPY apps/app/public/icons apps/app/public/icons
COPY apps/app/src/constants/icon-version.ts apps/app/src/constants/
COPY apps/site apps/site
ARG SITE_URL=https://questing.fi
ARG APP_URL=https://app.questing.fi
RUN SITE_URL=$SITE_URL APP_URL=$APP_URL node apps/site/build.mjs

FROM nginx:1.29-alpine
ARG APP_URL=https://app.questing.fi
ENV APP_URL=$APP_URL
COPY apps/site/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /repo/apps/site/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=5s --start-period=5s \
    CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1
