# Multi-stage build: the build stage installs *all* dependencies (including
# devDependencies like typescript, needed for `npm run build`) regardless of
# NODE_ENV, then the runtime stage installs only production dependencies.
# This sidesteps a common buildpack gotcha where NODE_ENV=production causes
# devDependencies to be skipped during install, breaking the TS build.

FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
EXPOSE 4000
CMD ["node", "dist/server.js"]
