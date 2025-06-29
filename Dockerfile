# Build image for AtCoder Notify V5 except scraping
FROM node:20

WORKDIR /app

# Install root dependencies
COPY package.json ./
RUN npm install

# Install dependencies for subprojects
COPY frontend/package.json frontend/package.json
RUN npm install --prefix frontend

COPY backend/package.json backend/package.json
RUN npm install --prefix backend

COPY backend/web/package.json backend/web/package.json
RUN npm install --prefix backend/web

COPY judgement/package.json judgement/package.json
RUN npm install --prefix judgement

COPY status/package.json status/package.json
RUN npm install --prefix status

# Copy project source excluding scraping
COPY backend ./backend
COPY backend/web ./backend/web
COPY frontend ./frontend
COPY judgement ./judgement
COPY status ./status
COPY fonts ./fonts
COPY docs ./docs
COPY prisma ./prisma

# Build subprojects except scraping
RUN npm run build:frontend && npm run build:backend && npm run build:judge

CMD ["npm", "start"]

