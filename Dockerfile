FROM node:18-alpine

WORKDIR /usr/src/app

COPY backend/package*.json ./backend/
RUN npm install --prefix backend

COPY backend ./backend
COPY frontend ./frontend

EXPOSE 3000

WORKDIR /usr/src/app/backend
CMD ["npm", "start"]
