FROM node:20-slim

WORKDIR /app

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma

RUN npm install

RUN npx prisma generate

COPY src ./src

EXPOSE 5000

CMD ["sh", "-c", "npx prisma migrate deploy && node src/app.js"]
