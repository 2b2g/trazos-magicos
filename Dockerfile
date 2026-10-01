# ============================================================
# Trazos Mágicos — imagen de producción
# Multi-stage: 1) build con Node (tsc + vite + legacy ES5)
#              2) nginx alpine sirviendo dist/ (~30 MB final)
# Sin backend: todo el estado vive en el navegador del niño.
# ============================================================

# ---------- etapa 1: build ----------
FROM node:20-alpine AS build
WORKDIR /app

# dependencias reproducibles con lockfile
COPY package.json package-lock.json ./
RUN npm ci

# fuentes y build (typecheck + vite build, genera bundle ES5 legacy)
COPY . .
RUN npm run build

# ---------- etapa 2: runtime ----------
FROM nginx:1.27-alpine AS runtime

# configuración SPA + caché + cabeceras (ver nginx.conf)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# artefacto estático compilado
COPY --from=build /app/dist /usr/share/nginx/html

# nginx sin privilegios de root: escucha 8080
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
