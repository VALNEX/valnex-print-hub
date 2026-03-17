FROM node:24-alpine

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml* ./

RUN pnpm install --frozen-lockfile

COPY prisma ./prisma
RUN pnpm prisma generate

COPY . .
RUN pnpm build

# Copiar archivos generados de Prisma al dist (ya que tsconfig.build excluye 'generated')
RUN mkdir -p dist/generated && cp -r generated/prisma dist/generated/

EXPOSE 3000

CMD ["node", "dist/src/main.js"]