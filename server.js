'use strict';
require('dotenv').config();
const express = require('express');
const myDB = require('./connection');
const fccTesting = require('./freeCodeCamp/fcctesting.js');
const session = require('express-session')
const passport = require('passport')
const { ObjectID } = require('mongodb')
const LocalStrategy = require('passport-local')

const app = express();

const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next()
  }
  res.redirect('/')
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
  cookie: {secure: false}
}))

app.use(passport.initialize())
app.use(passport.session()) 


myDB(async client => {
  const myDataBase = await client.db('test').collection('users_templateExercise')

  app.route('/').get((req, res) => {
    res.render('index', {
      title: 'Connected to Database',
      message: 'Please login',
      showLogin: true,
      showRegistration: true
    })
  })

  app.route('/login').post(passport.authenticate('local', {failureRedirect: '/'})), (req, res) => {
    res.redirect('/profile')
  }

  app.route('/profile').get(ensureAuthenticated, (req, res) => {
    res.render('profile', {username: req.user.username})
  })

  app.route('/logout').get((req,res) => {
    req.logout()
    res.redirect('/')
  })

  app.use((req, res, next) => {
    res.status(404)
      .type('text')
      .send('Not found')
  })  

  app.route('/register')
    .post((req, res, next) => {
      myDataBase.findOne({ username: req.body.username }, (err, user) => {
        if (err) {
          next(err);
        } else if (user) {
          res.redirect('/');
        } else {
          myDataBase.insertOne({
            username: req.body.username,
            password: req.body.password
          },
            (err, doc) => {
              if (err) {
                res.redirect('/');
              } else {
                // The inserted document is held within
                // the ops property of the doc
                next(null, doc.ops[0]);
              }
            }
          )
        }
      })
    },
      passport.authenticate('local', { failureRedirect: '/' }),
      (req, res, next) => {
        res.redirect('/profile');
      }
    );
  
  passport.use(new LocalStrategy((username, password, done) => {
    myDataBase.findOne({username: username}, (err, user) => {
      console.log(`User ${username} attempted to Log in.`)
      if (err) return done(err)
      if (!user) return done(null, false)
      if (password !== user.password) return done(null, false)
      return done(null, user)
    })
  }))
    

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
