FROM nginx:1.27-alpine

RUN apk add --no-cache openssl

COPY nginx.conf /etc/nginx/nginx.conf
COPY proxy_params /etc/nginx/proxy_params
COPY generate-default-cert.sh /docker-entrypoint.d/10-generate-default-cert.sh

RUN sed -i 's/\r$//' /docker-entrypoint.d/10-generate-default-cert.sh \
    && chmod +x /docker-entrypoint.d/10-generate-default-cert.sh
