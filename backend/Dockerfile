FROM node:20

WORKDIR /app

# Install ffmpeg for audio processing
RUN apt-get update && apt-get install -y ffmpeg

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy app files
COPY . .

# Create logs directory
RUN mkdir -p logs

EXPOSE 5001

CMD ["npm", "start"]