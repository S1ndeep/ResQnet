FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies (only package.json and lockfiles first for caching)
COPY package*.json ./

# Use npm ci when lockfile present for reproducible builds; fallback to npm install
RUN if [ -f package-lock.json ]; then npm ci --only=production; else npm install --production; fi

# Copy app source
COPY . .

# Set environment
ENV NODE_ENV=production

# Expose default server port
EXPOSE 5000

# Start the server
CMD ["node", "server.js"]
