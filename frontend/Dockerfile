FROM node:18-alpine

WORKDIR /app

# Install deps first (for better caching)
COPY package*.json ./
RUN npm install

# Copy the rest of the frontend
COPY . .

EXPOSE 3000

# CRA dev server
CMD ["npm", "start"]
