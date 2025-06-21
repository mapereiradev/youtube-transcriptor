FROM debian:bullseye-slim

# Set environment
ENV DEBIAN_FRONTEND=noninteractive
ENV DISPLAY=:99

# Install dependencies
RUN apt-get update && apt-get install -y \
  curl gnupg wget unzip xauth xvfb \
  libnss3 libxss1 libasound2 libx11-xcb1 libxcomposite1 \
  libxcursor1 libxdamage1 libxrandr2 libxtst6 libglib2.0-0 \
  libgtk-3-0 libgbm-dev xdg-utils libu2f-udev libvulkan1 \
  fonts-liberation ca-certificates --no-install-recommends && \
  rm -rf /var/lib/apt/lists/*

# Install Brave browser
RUN curl -fsSLo /usr/share/keyrings/brave-browser-archive-keyring.gpg https://brave-browser-apt-release.s3.brave.com/brave-browser-archive-keyring.gpg && \
  echo "deb [signed-by=/usr/share/keyrings/brave-browser-archive-keyring.gpg] https://brave-browser-apt-release.s3.brave.com/ stable main" > /etc/apt/sources.list.d/brave-browser-release.list && \
  apt-get update && apt-get install -y brave-browser && \
  rm -rf /var/lib/apt/lists/*

# Install Node.js (LTS)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs

# Create app directory
WORKDIR /app

# Copy source files
COPY . .

# Install app dependencies
RUN npm install

# Expose server port
EXPOSE 3000

# Run app inside Xvfb
CMD ["sh", "-c", "Xvfb :99 -screen 0 1280x1024x24 & node index.js"]
