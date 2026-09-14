# Etapa 1: Build de la app móvil con Node.js
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build

# Etapa 2: Servidor web Nginx de alto rendimiento
FROM nginx:alpine

# Copiar build optimizado de la app
COPY --from=build /app/www /usr/share/nginx/html

# Exponer puerto HTTP
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
