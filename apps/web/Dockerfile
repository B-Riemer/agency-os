# Agency OS Web (React/Vite) → statisch via nginx.
FROM node:20-slim AS build
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app
COPY . .
RUN pnpm install
ARG VITE_API_URL=http://localhost:3100/api
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm --filter @agency-os/web build

FROM nginx:alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
