FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev

COPY src ./src

EXPOSE 5000

CMD ["sh", "-c", "npx prisma migrate deploy && node src/app.js"]
