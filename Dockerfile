FROM node:20-slim

RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    make \
    g++ \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./

RUN npm install --production --legacy-peer-deps --ignore-scripts && \
    npm rebuild sharp

COPY . .

RUN mkdir -p tmp session data

ENV PORT=1000
EXPOSE 1000

CMD ["sh", "-c", "node restore-session.js && node index.js"]
