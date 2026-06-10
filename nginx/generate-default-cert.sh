#!/bin/sh
set -eu

CERT_PATH="/etc/nginx/certs/default.crt"
KEY_PATH="/etc/nginx/certs/default.key"

if [ -s "$CERT_PATH" ] && [ -s "$KEY_PATH" ]; then
  exit 0
fi

mkdir -p /etc/nginx/certs

openssl req \
  -x509 \
  -nodes \
  -newkey rsa:2048 \
  -days "${NGINX_SELF_SIGNED_CERT_DAYS:-3650}" \
  -keyout "$KEY_PATH" \
  -out "$CERT_PATH" \
  -subj "/CN=${NGINX_SELF_SIGNED_CERT_CN:-localhost}" \
  -addext "subjectAltName=DNS:localhost,DNS:filecano.local,IP:127.0.0.1"
