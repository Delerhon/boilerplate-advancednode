'use strict';
require('dotenv').config();
const express = require('express');
const myDB = require('./connection');
const fccTesting = require('./freeCodeCamp/fcctesting.js');
const session = require('express-session')
const passport = require('passport')
const { ObjectID } = require('mongodb')

const app = express();



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
  cookie: {secure: false}
}))

app.use(passport.initialize())
app.use(passport.session()) 


myDB(async client => {
  const myDataBase = await client.db('test').collection('users_templateExercise')

  app.route('/').get((req, res) => {
    res.render('index', {
      title: 'Connected to Database',
      message: 'Please login'
    })
  })

  passport.serializeUser((user, done) => {
    done(null, user._id)
  })
  
  passport.deserializeUser((id, done) => {
    myDataBase.findOne({ _id: new ObjectID(id) }, (err, doc) => {
      done (null, doc)
    })
  })
  
}).catch(err => {
  app.route('/').get((req,res) => {
    res.render('index', {
      title: err,
      message: 'Unable to cennect to database'
    })
  })
})

/* app.route('/').get((req, res) => {
  res.render('index', { title: 'Hello', message: 'Please log in'})
}); */



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Listening on port ' + PORT);
});
