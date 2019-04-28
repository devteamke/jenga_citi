const express                 = require('express');
const mongoose                = require("mongoose");
const path                    = require('path');
const http                    = require('http');
const bodyParser              = require('body-parser');
const socketIO                = require('socket.io');
const LocalStrategy           = require("passport-local");
const passportLocalMongoose   = require("passport-local-mongoose");
const flash                   = require("connect-flash"); 
const multer                  = require('multer');
const session                 = require('express-session');
const MongoStore              = require('connect-mongo')(session);
const moment                  = require("moment"); 
const logger                  = require('./logger/logger')
const passportSocketIo        = require("passport.socketio");
//env port
const port                    = process.env.PORT || 3000;
const cloudinary              = require('cloudinary');
const Joi = require('joi')
const myCustomJoi = Joi.extend(require('joi-phone-number'));

//models
const User                    = require("./models/user");
const Android                =require("./models/androidusers");


//other routes
const middleware = require("./middleware");
 
var   passport              = require("passport");
var   app              = express();
var   server                = require('http').createServer(app);
var   io                    = require("socket.io").listen(server);
//io file
const  ioFile              = require('./socket.io/socket.io')(io);
//router
var indexRoutes               = require("./routes/index");
var authRoutes                = require("./routes/auth");
// Make io accessible to our router
app.use(function(req,res,next){
    req.io = io;
    next();
});

mongoose.set('useCreateIndex', true)
mongoose.connect("mongodb://code:123456a@ds153763.mlab.com:53763/admin-panel",{ useNewUrlParser: true });
useMongoClient: true 

const publicPath = path.join(__dirname, './public');

//logger.infoLog.info('Logs should work');
//logger.errorLog.error('Errors should log');

app.use(require("express-session")({
    secret: "The assignment app",
    resave: false,
    resave:false,
    rolling: true,
    saveUninitialized:true,
    cookie: {
      maxAge:60*60*1000,
      
         },
      store: new MongoStore({url:"mongodb://code:123456a@ds153763.mlab.com:53763/admin-panel"})
    
}));
//for displaying error
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.use('android-local', new LocalStrategy({
      usernameField: 'number',
     passwordField: 'password' // this is the virtual field on the model
    },
    function(number, password, done) {
         var numberS = myCustomJoi.string().phoneNumber({ defaultCountry: 'KE', format: 'e164' }).validate(number);
         
         if(numberS.value.length>13){
             number.error= 'Too long';
         }
         // console.log(numberS);  
          if(numberS.error){
               return done(null, false, {
            message: 'Invalid phone number.'
          });
          }
      Android.findOne({
        username: numberS.value
      }, function(err, user) {
        if (err) return done(err);

        if (!user) {
          return done(null, false, {
            message: 'Account does not exist.'
          });
        }
           user.authenticate(password, function(err,model,passwordError){
                        if(passwordError){
                            console.log(err)
                           // res.send('The given password is incorrect!!')
                             return done(null, false, {
                                message: 'Incorrect mobile number or password.'
                              });
                        } else if(model) {
                         //   console.log("correct password ")
                          //    *run other code stuff*
                           // res.send('2fa enabled for this account')
                           return done(null, user);
                        }
                    })
        // if (!user.authenticate(password)) {
         
        // }
        
      });
    }
  ));

passport.serializeUser(
    
//     function(user, done) {   
//         console.log('k')
//         console.log(user)
//   if (isUser(user)) {
//   User.serializeUser()
//   } else if (isAndroid(user)) {
//     Android.serializeUser()
//   }
// }
 Android.serializeUser()
    );
passport.deserializeUser(User.deserializeUser());
//Passport socket io configuration
io.use(passportSocketIo.authorize({
  cookieParser: require('cookie-parser'),       // the same middleware you registrer in express
 // key:          'express.sid',       // the name of the cookie where express/connect stores its session_id
  secret:       'JeNgA ThIs MaNeNo 2o3o',    // the session_secret to parse the cookie
  store:        new MongoStore({url:"mongodb://code:123456a@ds153763.mlab.com:53763/admin-panel"}),        // we NEED to use a sessionstore. no memorystore please
  success:      onAuthorizeSuccess,  // *optional* callback on success - read more below
  fail:         onAuthorizeFail,     // *optional* callback on fail/error - read more below
}));
function onAuthorizeSuccess(data, accept){
  //console.log('successful connection to socket.io');

  
  accept();
}
function onAuthorizeFail(data, message, error, accept){
  if(error)
   // console.log(message);
  console.log('failed connection to socket.io:', message);

  // We use this callback to log all of our failed connections.
  accept(null, false);

  
}


app.use(express.static(publicPath));
/*configure app to use body-parser*/
app.set('views', __dirname + '/views');
app.set("view engine" , "ejs" );
app.use(bodyParser.urlencoded({extended:true}))      
app.use(bodyParser.json())    

app.use((req,res,next)=>{
    //variables put in local
    //res.locals.currentUser = req.user;
      //log visit if user is logged in
    if(req.user&&(req.originalUrl!="/favicon.ico")&&(req.originalUrl!="/app/js/lib/deparam.js")){
   
        logger.infoLog.info(middleware.capitalize(req.user.username ) +" has visited " + req.originalUrl + " at" );
    }
    var today = new Date();
    var dd = today.getDate();
    var yy = today.getFullYear();
    var mm = today.getMonth()+1;
    var currentDate = yy+'-'+mm+'-'+dd;
    res.locals.currentDate = currentDate;
    res.locals.currentUser = req.user;
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");
    res.locals.route =req.originalUrl;
    res.locals.moment = moment;
    res.locals.isInArray = middleware.isInArray ;
    res.locals.capitalize = middleware.capitalize;
    res.locals.stripEndQuotes = middleware.stripEndQuotes;
    res.locals.version = 0.01
    
  
    next();
});

//generate admin logo
app.use((req,res,next)=>{
   

if (req.user) {
   var logo=''; 
   var alt=''
   if(req.user.role=='admin'){
       logo='County Admin'
       
   }
   else if(req.user.role=='master-admin'){
       logo='Super Admin'
       
   }
   else if(req.user.role=='govt-official'){
         if(req.user.authority=='pipeline'){
           logo='Kenya Pipeline Commission'
           alt='KPC'
       }else if(req.user.authority=='nema'){
           logo='NEEMA'
             alt='NEEMA'
       }else if(req.user.authority=='land_commission'){
           logo='Kenya Land Commission'
             alt='KLC'
       }else if(req.user.authority=='ntsa'){
           logo='NTSA'
             alt='NTSA'
       }else if(req.user.authority=='police'){
           logo='Police Service'
             alt='KPS'
       }else if(req.user.authority=='nairobi_water'){
           logo='Nairobi Water'
           alt=  alt='NW'
       }
   }
} 
res.locals.logo =logo;
res.locals.alt =alt;
next();
})
//Use routes exported from other files

app.use(indexRoutes);
app.use(authRoutes);


server.listen(port, ()=>{
    console.log(`JeNgA iS rUnNiNg On PoRt ${port} `);

});

//server.listen(0, () => console.log(server.address().port))

