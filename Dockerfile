FROM node

ENV MONGO_DB_USERNAME=admin
ENV MONGO_DB_PWD=password

RUN mkdir -p /home/app

# set current folder
WORKDIR /home/app

# install node dependencies
COPY package*.json ./
RUN npm install

COPY . .

CMD [ "node", "./server/server.js" ]
