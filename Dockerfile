FROM node:12-alpine

# Node JS configuration
ENV PATH /opt/outline/node_modules/.bin:/opt/node_modules/.bin:$PATH
ENV NODE_PATH /opt/outline/node_modules:/opt/node_modules
ENV APP_PATH /opt/outline

# Default configuration
ENV ENABLE_UPDATES false
ENV WEBSOCKETS_ENABLED true
ENV DEPLOYMENT self

# Install dependencies
WORKDIR $APP_PATH
COPY package.json yarn.lock ./
RUN yarn install --pure-lockfile \
 && cp -r /opt/outline/node_modules /opt/node_modules

# Build application
COPY . .
RUN yarn build

# Container configuration
EXPOSE 3000
CMD yarn start
