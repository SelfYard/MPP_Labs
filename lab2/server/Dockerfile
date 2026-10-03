FROM node:20-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

RUN mkdir -p /app/uploads

EXPOSE 3001
CMD ["node", "index.js"]