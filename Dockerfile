# Dockerfile

# Stage 1: Install PNPM and dependencies
FROM node:18-alpine AS deps
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package.json and pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./
# Install dependencies using pnpm, including devDependencies for the build
RUN pnpm install --frozen-lockfile --prod=false

# Stage 2: Build the Next.js application
FROM node:18-alpine AS builder
WORKDIR /app

# Define ARG for build-time environment variables that will be passed by Cloud Build
# These names (ARG_SERVER_...) must match the --build-arg keys in cloudbuild.yaml
ARG ARG_SERVER_VAPI_PUBLIC_KEY
ARG ARG_SERVER_VAPI_ASSISTANT_ID

# Set them as ENV variables so 'next build' (via next.config.js) can access them
# during the build process in this stage. The names (SERVER_VAPI_...) must match
# what next.config.js expects from process.env.
ENV SERVER_VAPI_PUBLIC_KEY=${ARG_SERVER_VAPI_PUBLIC_KEY}
ENV SERVER_VAPI_ASSISTANT_ID=${ARG_SERVER_VAPI_ASSISTANT_ID}

# Install pnpm again
RUN npm install -g pnpm

# Copy dependencies from the 'deps' stage
COPY --from=deps /app/node_modules ./node_modules
# Copy the rest of your application source code
COPY . .

# Disable Next.js telemetry during the build (optional)
ENV NEXT_TELEMETRY_DISABLED 1

# Build the Next.js application using pnpm
# This 'pnpm run build' will now have access to the SERVER_VAPI_... environment variables
# which next.config.js will use to create the NEXT_PUBLIC_... variables for the client bundle.
RUN pnpm run build

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
# server.js is part of the .next/standalone output
CMD ["node", "server.js"]