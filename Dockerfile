# Use official Bun image
FROM oven/bun:1.2-slim AS base
WORKDIR /app

# Install dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source files
COPY . .

# Build application
RUN bun run build

# Expose port
EXPOSE 3000

ENV PORT=3000
ENV HOST=0.0.0.0

# Start server
CMD ["bun", "run", "dev", "--host", "0.0.0.0", "--port", "3000"]
