FROM node:20-slim

# Install OS dependencies for Puppeteer
RUN apt-get update && apt-get install -y \
  fonts-liberation libatk-bridge2.0-0 libatk1.0-0 libcups2 libdrm2 \
  libxcomposite1 libxdamage1 libxrandr2 libgbm1 libasound2 libpangocairo-1.0-0 \
  libgtk-3-0 libnss3 libxss1 libxtst6 ca-certificates wget gnupg \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000
CMD ["npm", "start"]
