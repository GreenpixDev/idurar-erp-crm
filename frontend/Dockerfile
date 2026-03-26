FROM node:20-alpine AS build
WORKDIR /app

ARG VITE_BACKEND_SERVER=/
ARG VITE_FILE_BASE_URL=/
ARG PROD=true

COPY package*.json ./
RUN npm ci
COPY ./ ./

RUN printf 'VITE_BACKEND_SERVER="%s"\nVITE_FILE_BASE_URL="%s"\nPROD=%s\n' "$VITE_BACKEND_SERVER" "$VITE_FILE_BASE_URL" "$PROD" > .env.production \
    && npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]