FROM node:20-alpine

# Install OpenSSL and other dependencies required by Prisma
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy Prisma schema
COPY prisma ./prisma/

# Generate Prisma Client
RUN npx prisma generate

# Copy application files
COPY . .

# Expose port
EXPOSE 3002

# Run migrations and start server
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]

