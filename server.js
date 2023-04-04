'use strict';
const routes = require('./routes.js');
const auth = require('./auth.js')
require('dotenv').config();
const express = require('express');
const myDB = require('./connection');
const fccTesting = require('./freeCodeCamp/fcctesting.js');
const session = require('express-session')
const passport = require('passport')
const { ObjectID } = require('mongodb')
const LocalStrategy = require('passport-local')
const bcrypt = require('bcrypt')
const GitHubStrategy = require('passport-github').Strategy
const app = express();
const http = require('http').createServer(app)
const io = require('socket.io')(http)
const cookieParser = require('cookie-parser')
const passportSocketIo = require('passport.socketio')

const MongoStore = require('connect-mongo')(session);
const URI = process.env.MONGO_URI;
const store = new MongoStore({ url: URI });


const clientID = process.env.GITHUB_CLIENT_ID || process.env['GITHUB_CLIENT_ID']
const clientSecret = process.env.CLIENT_SECRET || process.env['CLIENT_SECRET']
const callbackURL = 'https://boilerplate-advancednode.delerhon.repl.co/auth/github/callback'

function onAuthorizeSuccess(data, accept) {
  console.log('successful connection to socket.io');

  accept(null, true);
}

function onAuthorizeFail(data, message, error, accept) {
  if (error) throw new Error(message);
  console.log('failed connection to socket.io:', message);
  accept(null, false);
}


app.set('view engine', 'pug')
app.set('views', './views/pug')
fccTesting(app); //For FCC testing purposes
app.use('/public', express.static(process.cwd() + '/public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const secret = process.env['SESSION_SECRET'] || process.env.SESSION_SECRET
app.use(session( {
  secret: secret,
  resave: true,
  saveUninitialized: true,
  cookie: {secure: false},
  key: 'express.sid',
  store: store
}))

app.use(passport.initialize())
app.use(passport.session()) 


myDB(async client => {
  const myDataBase = await client.db('database').collection('users');

  routes(app, myDataBase)
  auth(app, myDataBase)

}).catch(e => {
  app.route('/').get((req, res) => {
    res.render('index', { title: e, message: 'Unable to connect to database' });
  });
});

let currentUsers = 0

io.use(
  passportSocketIo.authorize({
    cookieParser: cookieParser,
    key: 'express.sid',
    secret: process.env.SESSION_SECRET || process.env['SESSION_SECRET'],
    store: store,
    success: onAuthorizeSuccess,
    fail: onAuthorizeFail
  })
);

io.on('connection', socket => {
  console.log('A user has connected')
  console.log('user ' + socket.request.user.username + ' connected');
  ++currentUsers
  io.emit('user', {
    username: socket.request.user.username,
    currentUsers,
    connected: true
  })
  
  socket.on('chat message', (message) => {
    io.emit('chat message', {
      username: socket.request.user.username,
      message})
  })
  
  socket.on('disconnect', () => {
    console.log('A user has disconnected');
    currentUsers--
      io.emit('user', {
      username: socket.request.user.username,
      currentUsers,
      connected: false
    })
  })


})

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log('Listening on port ' + PORT);
});
