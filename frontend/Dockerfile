FROM node:25-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/ui/package.json ./packages/ui/package.json
RUN npm install

ENV PATH="/app/node_modules/.bin:$PATH"

COPY . .

EXPOSE 5173

CMD ["npm", "--workspace", "web", "run", "dev", "--", "--host", "0.0.0.0"]
