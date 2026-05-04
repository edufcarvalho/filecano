FROM node:25-alpine

WORKDIR /app

COPY package*.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/ui/package.json ./packages/ui/package.json
RUN npm install

ENV PATH="/app/node_modules/.bin:$PATH"

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--filter=web", "--", "--host", "0.0.0.0"]
