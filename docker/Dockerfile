FROM node:20-bookworm

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-pip python3-venv \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . /app

RUN npm install \
    && python3 -m pip install --no-cache-dir . \
    && python3 -m playwright install --with-deps chromium \
    && npx prisma generate \
    && npx prisma db push \
    && npx prisma db seed \
    && npm run build:ehr

EXPOSE 3000 8000
ENTRYPOINT ["./docker/entrypoint.sh"]
