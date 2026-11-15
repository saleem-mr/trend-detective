FROM node:20-alpine AS engine
RUN apk add --no-cache g++ make
WORKDIR /src
COPY engine/trend_detect.cpp engine/
RUN g++ -O3 -std=c++17 engine/trend_detect.cpp -o engine/trend-detect

FROM node:20-alpine AS run
ENV NODE_ENV=production PORT=3000
WORKDIR /app
COPY --from=engine /src/engine/trend-detect /app/engine/trend-detect
COPY server.js package.json ./
COPY web ./web
COPY data ./data
COPY scripts ./scripts
RUN mkdir -p cache
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:3000/api/health || exit 1
CMD ["node","server.js"]