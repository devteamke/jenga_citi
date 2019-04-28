const express = require('express');
const mongoose              = require("mongoose");
const path = require('path');
const http = require('http');
const bodyParser = require('body-parser');
const socketIO = require('socket.io');
const LocalStrategy           = require("passport-local");
const passportLocalMongoose   = require("passport-local-mongoose");
const flash                 = require("connect-flash"); 
const multer  = require('multer');
const session                 = require('express-session');
const MongoStore            = require('connect-mongo')(session);
const moment                  = require("moment"); 
//env port
const port = process.env.PORT || 3000;
const cloudinary = require('cloudinary');

//models
const User                  = require("./models/user");
//router
var indexRoutes           = require("./routes/index");

//other routes
const middleware = require("./middleware");
 
var   passport              = require("passport");
var   app              = express();
var   server                = require('http').createServer(app);
var   io                    = require("socket.io").listen(server);
//io file
const   ioFile = require('../socket.io/socket.io')(io);

mongoose.set('useCreateIndex', true)
mongoose.connect("mongodb://code:123456a@ds153763.mlab.com:53763/admin-panel",{ useNewUrlParser: true });

const publicPath = path.join(__dirname, './public');



app.use(require("express-session")({
    secret: "The assignment app",
    resave: false,
     resave:false,
    rolling: true,
    saveUninitialized:false,
     cookie: {
      maxAge:60*60*1000,
      
         },
      store: new MongoStore({url:"mongodb://root:rootcause2016@ds121371.mlab.com:21371/instantassignments"})
    
}));
//for displaying error
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(express.static(publicPath));
/*configure app to use body-parser*/
app.set("view engine" , "ejs" );
app.use(bodyParser.urlencoded({extended:true}))      
app.use(bodyParser.json())    

app.use((req,res,next)=>{
    //variables put in local
    //res.locals.currentUser = req.user;
      //log visit if user is logged in
    if(req.user&&(req.originalUrl!="/favicon.ico")&&(req.originalUrl!="/app/js/lib/deparam.js")){
        console.log(middleware.capitalize(req.user.username ) +" has visited " + req.originalUrl + " at " + moment(moment().valueOf()).format('h:mm:a,  Do MMMM  YYYY,'))
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
    
  
    next();
});

//Use routes exported from other files

app.use(indexRoutes);



server.listen(port, ()=>{
    console.log(`Admin pannel is running on port ${port} `);
});


