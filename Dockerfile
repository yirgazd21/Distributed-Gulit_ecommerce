# Use a slim Node.js base image
FROM node:20-alpine

# Set working directory inside the container
WORKDIR /app

# Copy package files for server only, install dependencies
COPY server/package*.json ./
RUN npm install --production

# Copy server source files
COPY server/ ./

# Expose the port your Express app uses
EXPOSE 3000

# Start the backend
CMD ["node", "index.js"]
