# Build image for the scraping service
FROM node:20

WORKDIR /app

# Install dependencies from the monorepo
COPY package.json ./
RUN npm install

# Copy scraping sources
COPY scraping ./scraping

# Build scraping project
RUN npm run build:scraping

# Run scraping service
CMD ["node", "scraping/dist/index.js"]
