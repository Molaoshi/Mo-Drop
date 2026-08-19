# ---------- Build stage ----------
FROM node:20-alpine AS build
RUN npm install -g npm@11
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# ---------- Runtime stage ----------
FROM node:20-alpine
RUN npm install -g npm@11
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY --from=build /app/dist ./dist
COPY db ./db
# No .env in the image: config comes from env vars (Railway variables / preview injection)

# Uploads live here — mount a Railway volume at /app/data so footage survives redeploys
EXPOSE 3000
CMD ["node", "dist/boot.js"]
