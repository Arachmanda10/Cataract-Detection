#Build dependencies with TSC
FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./   
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

#Dependencies for production
FROM node:22-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

#Final image
FROM node:22-slim AS final
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
COPY models ./models
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s \
    CMD node -e "fetch('http://localhost:'+(process.env.PORT || 3000)+'/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "dist/index.js"]