# Use an official Bun image as a parent image
FROM oven/bun:1 AS base

WORKDIR /usr/src/app

# Install dependencies first, to leverage Docker cache
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile

# Copy application source code
COPY . .

# Build the TypeScript application
# Ensure your tsconfig.json has a "outDir" specified, e.g., "dist"
# and your package.json "scripts" has a "build" command, e.g., "bun build ./src/index.ts --outdir ./dist"
RUN bun run build

# --- Production Stage ---
FROM oven/bun:1 AS production

WORKDIR /usr/src/app

# Copy only necessary files from the build stage
COPY --from=base /usr/src/app/node_modules ./node_modules
COPY --from=base /usr/src/app/package.json ./package.json
COPY --from=base /usr/src/app/bun.lockb ./bun.lockb
COPY --from=base /usr/src/app/dist ./dist
COPY --from=base /usr/src/app/public ./public

# Expose the port the app runs on
# Hono/Bun typically defaults to 3000 if not specified otherwise in your code (e.g., src/index.ts)
EXPOSE 3000

# Define the command to run the application
# This assumes your built output's entry point is dist/index.js
CMD ["bun", "run", "dist/index.js"]