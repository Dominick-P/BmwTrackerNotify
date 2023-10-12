FROM node:19-bullseye

# Install Chromium and required dependencies
RUN apt-get install -y chromium

# Set environment variables
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true
ENV PUPPETEER_EXECUTABLE_PATH /usr/bin/chromium

WORKDIR /usr/src/app 

COPY package*.json ./
RUN npm install

COPY . .

CMD ["node", "index.js"]