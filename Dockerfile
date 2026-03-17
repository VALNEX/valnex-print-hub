# Etapa base
FROM node:24-alpine

WORKDIR /app

# Instalar pnpm globalmente
RUN npm install -g pnpm

# Copiar dependencias y lockfile (importante para reproducibilidad)
COPY package.json pnpm-lock.yaml* ./

# Instalar dependencias con pnpm
RUN pnpm install --frozen-lockfile

# Copiar prisma y generar cliente
COPY prisma ./prisma
RUN pnpm prisma generate

# Copiar el resto de los archivos y compilar
COPY . .
RUN pnpm build

EXPOSE 3000

CMD ["node", "dist/src/main.js"]