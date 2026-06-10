FROM node:25-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

ENV PATH="/app/node_modules/.bin:$PATH"

COPY . .

COPY entrypoint.sh ./entrypoint.sh
RUN sed -i 's/\r$//' ./entrypoint.sh \
    && chmod +x ./entrypoint.sh

EXPOSE 5173

ENTRYPOINT ["sh", "./entrypoint.sh"]
