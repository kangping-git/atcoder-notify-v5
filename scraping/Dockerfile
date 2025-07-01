# Build image for the scraping service
FROM node:20

WORKDIR /app

# Install dependencies from the monorepo
COPY package.json ./
COPY package-lock.json ./
RUN npm ci --verbose

# Copy scraping sources
COPY scraping ./scraping
COPY prisma ./prisma
COPY .env production.env

RUN npx prisma generate
# Build scraping project
RUN npm run build:scraping

# Run scraping service
EXPOSE 4082
CMD ["node", "scraping/dist/index.js"]
