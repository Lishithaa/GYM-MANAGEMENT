# HourlyGym React app (CRA + Craco) — build then serve static files with nginx
FROM node:20-bookworm AS build

WORKDIR /app

RUN corepack enable && corepack prepare yarn@1.22.22 --activate

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .

# URL the browser will use to reach the API (set at build time for CRA)
ARG REACT_APP_BACKEND_URL=http://127.0.0.1:8000
ENV REACT_APP_BACKEND_URL=${REACT_APP_BACKEND_URL}

RUN yarn build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
