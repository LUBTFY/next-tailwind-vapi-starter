# Dockerfile

# Stage 1: Install dependencies
FROM node:18-alpine AS deps
WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock, etc.)
COPY package.json package-lock.json* ./
# Install dependencies using npm ci for reliable builds
RUN npm ci

# Stage 2: Build the Next.js application
FROM node:18-alpine AS builder
WORKDIR /app

# Copy dependencies from the 'deps' stage
COPY --from=deps /app/node_modules ./node_modules
# Copy the rest of your application source code
COPY . .

# Disable Next.js telemetry during the build (optional)
ENV NEXT_TELEMETRY_DISABLED 1

# Build the Next.js application for production
RUN npm run build

# Stage 3: Production image - minimal and optimized
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
# Disable Next.js telemetry for the running application (optional)
ENV NEXT_TELEMETRY_DISABLED 1

# Create a non-root user and group for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary production assets from the 'builder' stage
# This structure assumes `output: 'standalone'` is enabled in next.config.js
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Switch to the non-root user
USER nextjs

# Expose the port the Next.js standalone server listens on
# The server.js will listen on process.env.PORT (set by Cloud Run) or default to 3000
EXPOSE 3000

# Command to run the Next.js standalone server
CMD ["node", "server.js"]