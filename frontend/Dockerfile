FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3124
ENV PORT=3124
CMD ["npm", "run", "start", "--", "-p", "3124"]
