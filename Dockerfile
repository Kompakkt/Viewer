FROM docker.io/node:lts-slim
RUN apt-get update && apt-get install -y git jq zstd brotli pigz 7zip
RUN npm install -g bun
WORKDIR /app
COPY . .
RUN git submodule update --init --recursive
RUN bun install
CMD [ "tail", "-f", "/dev/null" ]
