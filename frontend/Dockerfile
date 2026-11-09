# syntax=docker/dockerfile:1

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM build AS test
CMD ["npm", "test"]

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=3000
COPY --from=build /app/dist ./dist
COPY server.mjs ./
EXPOSE 3000
USER node
CMD ["node", "server.mjs"]
