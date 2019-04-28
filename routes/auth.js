var express                =require("express");
var   router                 =express.Router();
const User                 =require("../models/user");
const Android              =require("../models/androidusers");
const Notify      = require('../models/notifications');
const Report               = require("../models/report");
var  passport               =require("passport");
var moment                 = require("moment"); 
var middleware             = require("../middleware");
var crypto                 = require("crypto");
const jwt                  = require("jsonwebtoken");
var Lowercase              =require("lower-case");
const SignUp               = require('../models/validation/signUp.js');
const SignUpAndroid        = require('../models/validation/signUpAndroid.js');

const register             = require('../models/validation/register.js');
const session              = require("express-session");
const logger               = require('../logger/logger')
const async                 = require("async");
const nodemailer            =  require("nodemailer");
const { body,validationResult } = require('express-validator/check');
const { sanitizeBody }      = require('express-validator/filter');
const cryptoRandomString    = require('crypto-random-string');
const multer                = require('multer');
const cloudinary            = require('cloudinary');
const Joi                   = require('joi')
const myCustomJoi           = Joi.extend(require('joi-phone-number'));
var today = new Date();
            var dd = today.getDate();
            var mm = today.getMonth()+1; //January is 0!
            var yyyy = today.getFullYear();
            
            if(dd<10) {
                dd = '0'+dd
            } 
            
            if(mm<10) {
                mm = '0'+mm
            } 
            today = dd + '/' + mm + '/' + yyyy;
//cloudinary config
cloudinary.config({ 
    cloud_name: 'devteamke', 
    api_key: 442155129588629, 
    api_secret: "ylF7sUCL0j1cb9rt0Khgk6inG_s"
  });

//Mutler configuration move during refactoring
var storage = multer.diskStorage({
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  },
   onError : function(err, next) {
   //   console.log('error', err);
      next(err);
    }
});
var fileFilter = function (req, file, cb) {
    // accept image files only
    if(req.originalUrl=='/profilepic_android'){
            if (!file.originalname.match(/\.(jpg|jpeg|png|gif|)$/i)) {
               req.fileValidationError ='Invalid file type';
                  cb(null, true);
            }
            cb(null, true);
    }else if(req.originalUrl=='/new_report_android'){
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif|mp4|)$/i)) {
              req.fileValidationError ='Invalid file type';
                  cb(null, true);
          }
         
            cb(null, true);
    }
};

var maxSize =1 * 1024 * 1024 *25
var upload = multer({ storage: storage,limits:{ fileSize: maxSize }, fileFilter: fileFilter, })

router.get("/login",(req,res)=>{
        res.render("login");
    })
    //renders the registtration page
router.get("/register",(req,res)=>{
    res.render("admin_signup");
})
router.post("/login", passport.authenticate("local",{  failureFlash :"Sorry, Wrong Credentials!",failureRedirect: "/login" }),function(req, res) {
   
 
    if(req.user.isActive == false){
    
         req.logout();
        req.flash("error","Your account is either inactive or your access has been suspended! Contact Super Admin");
        res.redirect("/login" )
        
    }else{
      logger.infoLog.info(middleware.capitalize(req.user.username ) + " has just logged in " +  " at " + moment(moment().valueOf()).format('h:mm:a,  Do MMMM  YYYY,,') )
     req.flash("success","Login successful!")
     res.redirect(req.session.returnTo || '/panel');
      delete req.session.returnTo;
    }
    
});
//register for authentication
router.post("/register",(req,res)=>{
    //console.log(req.body);
        var token=crypto.randomBytes(25).toString('hex');
         crypto.randomBytes(20,function(err,buf){
                 token = buf.toString('hex');
            });
        logger.infoLog.info("Admin registration request received from " + middleware.capitalize(req.body.fname));
        //console.log(req.body);
        //console.log("A new admin " + middleware.capitalize(req.body.fname)  +" using email: " + req.body.email + " has requested registration" + " at " + moment(moment().valueOf()).format('h:mm:a,  Do MMMM  YYYY,'));
         var isValid = register.validate({
             fname: req.body.fname,
             lname: req.body.lname,
            email: req.body.email,
            password:req.body.password
           });
        if(isValid.error){
       // console.log(isValid.error)
      //Add response to invalid on client side
          req.flash("error",isValid.error.message);
          res.redirect("back");
          return;
         }
         if(isValid.value.password!=req.body.confirmPassword){
             req.flash("error","Password do not match");
             res.redirect("back");
             return;
         }
            
            var uname=isValid.value.fname;
            var username=Lowercase(uname)+Math.floor(Math.random() * (+10000 - +0)) + +1;
            var today = new Date();
           
                               //check if email does not exists      
         User.findOne({email:isValid.value.email}, (error, email)=> {
                     if(email){
                         
                         req.flash("error"," The email you entered is already in use !");
                        res.redirect("back");   
                     }else{
                                                  User.register(new User({
                                                    username,
                                                    fname:isValid.value.fname,
                                                    verifyToken:token,
                                                    verifyExpires:Date.now()+3600000,
                                                    lname:isValid.value.lname,
                                                    county:req.body.county,
                                                    email:isValid.value.email,
                                                //    yearOfHire:today,
                                                    role:req.body.role,
                                                   
                                                    authority:req.body.authority,
                                                    }),isValid.value.password, function(err,user){
                            if(err){
                                    req.flash("error",err.message);
                                    res.redirect("register");
                            }else{
                                //req.flash("success","New admin has added successful.")
                                 logger.infoLog.info(isValid.value.fname + " has requested for registration");
                                  //console.log(token);
                                 Notify.create({body:' A new admin has just registered',
                                                type:'new_admin',
                                                ref_id:user._id
                                    
                                   },(err,notification)=>{
                                     req.io.sockets.to('masterRoom').emit('new-report/admin', user)
                                 })
                             async.waterfall([
                                 function(done){
                                var smtpTransport = nodemailer.createTransport({
                                    service:'Gmail',
                                    auth:{
                                        user:'webemailkip@gmail.com',
                                        pass:'parcel1002017'
                                    }
                                });
                                var mailOptions = {
                                    to: isValid.value.email,
                                    from:'webemailkip@gmail.com',
                                    subject:'StreetSweeperKE Account Confirmation',
                                    text:'Hello \b'+user.fname +'\b' +'\n\n' + 'Your request for admin registration has been received and pending for verification ' +'\n\n'+
                                    'Welcome to StreetSweeperKE'
                                    };
                                    smtpTransport.sendMail(mailOptions, function(err,info){
                                    req.io.sockets.to('masterRoom').emit('new-admin', uname) 
                                    
                                    req.flash('success','Your registration was successful and waiting for verification');
                                    res.redirect("/login");
                                   // console.log(info);
                                    done(err, 'done');
                                    });
                                }
                                ], function(err){
                                    if(err){ 
                                        // return next();
                                        console.log(err);
                                }else{
                                    
                                }
                             });
                           }
                      });
                     }    
               });
    
});
router.get("/verifications",middleware.isLoggedIn,middleware.isMasterAdmin,(req,res)=>{
    User.find({'isActive':false,'isVerified':false,registeredBy:null},(err,Users)=>{
            res.render("verifications",{users:Users});
        });
    });
router.post("/verifications/:id",middleware.isLoggedIn,middleware.isMasterAdmin,(req,res)=>{
        if(req.body.choice==="Delete"){
         User.findByIdAndRemove(req.params.id,(err,user)=>{
          if(err){
              req.flash("error","Something went wrong");
              res.redirect("back");
          }else{
            
              req.flash("success","Admin request rejected");
              res.redirect("panel");
            }
         });
        }
       
        if(req.body.choice==="Activate"){
            Notify.Update({ref_id:req.params.id},{status:'read'});
        User.findByIdAndUpdate(req.params.id,{isActive:true,registeredBy:req.user.username,yearOfHire:today},{new:true},(err,user)=>{
             if(err){
              req.flash("error","Something went wrong");
              res.redirect("back");
          }else{
                    async.waterfall([
                                 function(done){
                                var smtpTransport = nodemailer.createTransport({
                                    service:'Gmail',
                                    auth:{
                                        user:'webemailkip@gmail.com',
                                        pass:'parcel1002017'
                                    }
                                });
                                var mailOptions = {
                                    to: user.email,
                                    from:'webemailkip@gmail.com',
                                    subject:'StreetSweeperKE Account Confirmation',
                                    text:'Hello \b'+user.fname +'\b' +'\n\n' + 'You are receiving this mail  from jenga Citi that your request for admin has been received and accepted.'+ '\n'+ 'Click on the link to verify your account and login.USE USERNAME TO LOGIN ' +'\n\n'+
                                    'Click on the link or paste it into your browser to go on.' + '\n\n' +' Your Username:\b' +user.username  + '\b'+ '\n\n' +
                                   'http://'+ req.headers.host +'/confirmaccount/'+ user.verifyToken+'/activated' +'\n\n'+
                                    'Welcome to StreetSweeperKE'
                                    };
                                    smtpTransport.sendMail(mailOptions, function(err,info){
                                     
                                    req.flash('success','Account successfully activated.');
                                    res.redirect("back");
                                   // console.log(info);
                                    done(err, 'done');
                                    });
                                }
                                ], function(err){
                                    if(err){ 
                                        return next();
                                }else{
                                    
                                }
                             });
          }
        });
    }
    })
   // router.post("/verifications/:id/")
router.get("/add_admin",middleware.isLoggedIn,middleware.isMasterAdmin,(req,res)=>{
           // res.render("verifications",);
            res.render("add_admin");
     
});
router.post("/add_admin", middleware.isMasterAdmin,(req, res)=> {
        console.log(req.body);
        var token=crypto.randomBytes(25).toString('hex');
         crypto.randomBytes(20,function(err,buf){
                 token = buf.toString('hex');
            });
        logger.infoLog.info("Admin registration request received from " + middleware.capitalize(req.user.username));
        //console.log(req.body);
        //console.log("A new admin " + middleware.capitalize(req.body.fname)  +" using email: " + req.body.email + " has requested registration" + " at " + moment(moment().valueOf()).format('h:mm:a,  Do MMMM  YYYY,'));
         var isValid = SignUp.validate({
             fname: req.body.fname,
             lname: req.body.lname,
             email: req.body.email,
           });
        if(isValid.error){
       // console.log(isValid.error)
      //Add response to invalid on client side
          req.flash("error",isValid.error.message);
          res.redirect("back");
          return;
         }
         
            var password = "123";
            var uname=isValid.value.fname;
            var username=Lowercase(uname)+Math.floor(Math.random() * (+10 - +0)) + +1;
            var today = new Date();
            var dd = today.getDate();
            var mm = today.getMonth()+1; //January is 0!
            var yyyy = today.getFullYear();
            
            if(dd<10) {
                dd = '0'+dd
            } 
            
            if(mm<10) {
                mm = '0'+mm
            } 
            
            today = dd + '/' + mm + '/' + yyyy;
                               //check if email does not exists      
         User.findOne({email:isValid.value.email}, (error, email)=> {
                     if(email){
                         
                         req.flash("error"," The email you entered is already in use !");
                        res.redirect("add_admin");   
                     }else{
                                            
                                                   User.register(new User({
                                                    username,
                                                    fname:isValid.value.fname,
                                                    verifyToken:token,
                                                    isActive:true,
                                                    verifyExpires:Date.now()+3600000,
                                                    lname:isValid.value.lname,
                                                    county:req.body.county,
                                                    email:isValid.value.email,
                                                    yearOfHire:today,
                                                   role:req.body.role,
                                                    authority:req.body.authority,
                                                    registeredBy:req.user.username
                                                    }),password, function(err,user){
                            if(err){
                                    req.flash("error",err.message);
                                    res.redirect("add_admin");
                            }else{
                                //req.flash("success","New admin has added successful.")
                                 logger.infoLog.info(isValid.value.fname + " has been successfully registered ");
                                  //console.log(token);
                                // console.log(user);
                                  logger.infoLog.info("Sending"+isValid.value.fname+" email for account completion setup  ");
                             async.waterfall([
                                 function(done){
                                var smtpTransport = nodemailer.createTransport({
                                    service:'Gmail',
                                    auth:{
                                        user:'webemailkip@gmail.com',
                                        pass:'parcel1002017'
                                    }
                                });
                                var mailOptions = {
                                    to: isValid.value.email,
                                    from:'webemailkip@gmail.com',
                                    subject:'StreetSweeperKE Account Confirmation',
                                    text:'Hello \b'+user.fname +'\b' +'\n\n' + 'You are receiving this  from StreetSweeperKE mail that you have been added as an Admin. Complete by  setting up your password for the account' +'\n\n'+
                                    'Click on the link or paste it into your browser to go on.' + '\n\n' +' Your Username:\b' + username  + '\b'+ '\n\n' +
                                    'http://'+ req.headers.host +'/confirmaccount/'+ token + '\n\n'+
                                    'Welcome to StreetSweeperKE'
                                    };
                                    smtpTransport.sendMail(mailOptions, function(err,info){
                                     
                                    req.flash('success','An email has been sent to '+ user.email + ' with further instructions to verify the account.');
                                    res.redirect("/add_admin");
                                   // console.log(info);
                                    done(err, 'done');
                                    });
                                }
                                ], function(err){
                                    if(err){ 
                                        return next();
                                }else{
                                    
                                }
                             });
                           }
                      });
                     }    
               });
        });
 
router.get("/confirmaccount/:token",function(req, res) {
        var token=req.params.token;
      // console.log(token);
       User.findOne({'verifyToken':token},(err,user)=>{
           if(user){
               if(!user.isActive){
                   req.flash('success','Account successfully verified. Login');
                   res.render("register",{user:user});
               }else{
                   req.flash('success','Kindly Set Up the Password and username of your choice');
                 res.render("register",{user:user});
               }
           }else
           {
                logger.infoLog.info("A user has just tried to confirm account with an expired token");
                req.flash('error','Confirm Account token is invalid or has expired');
                res.redirect("/login");
           }
       })
});
 router.get("/confirmaccount/:token/activated",async(req,res)=>{
           
                 User.findOne({'verifyToken':req.params.token},(err,user)=>{
                     if(user){
                        // console.log(user);
                        res.render("register",{user:user,req});
                      //  console.log(req.url);
                     }else{
                         req.flash("error","It seems you have confirmed your account.Login ")
                         res.redirect("/login")
                     }
                 });
     });
router.post("/confirmaccount/:token/activated",(req,res,next)=>{
    console.log(req.body);
          User.findOneAndUpdate({verifyToken:req.params.token},{isVerified:true,verifyToken:undefined,verifyExpires:undefined},{new:true},(err,user)=>{
           if(err){
               console.log(err);
               req.flash("error","Something went wrong");
               res.redirect("back");
           }else{
               req.flash("success","Your account has been verified, Login")
               res.redirect("/login");
           }
      })

      
});     
router.post("/confirmaccount/:token", (req, res)=> {
    
            
            async.waterfall([
        function(done){
                       User.findOne({verifyToken:req.params.token,verifyExpires:{ $gt:Date.now()} },function(err,user,next){
                            // console.log(user);
                            if(!user){
                                //console.log(user);
                                //console.log("token time has expired or invalid");
                                //console.log(err);
                                 req.flash('error','Your verify account token is invalid or has expired.Please contact master admin');
                                 res.redirect("back");
                            }else if(user){
                               // console.log('code')
                            //console.log(req.body.password +" vs "+req.body.confirmPassword);
                                 if(req.body.password===req.body.confirmPassword){
                                  user.setPassword(req.body.password,function(err,user){
                                 user.isVerified=true;
                                 user.isActive=true;
                                 user.verifyToken=undefined;
                                 user.verifyExpires=undefined;
                                     user.save(function(){//saves the new details for the user to database
                                         req.logIn(user,function(err){
                                         req.flash('success','Password Succesfully set. Welcome');
                                            done(err,user);
                                         });
                                    
                                    });
                                 });
                             }else{
                                 req.flash('error','Passwords does not match');
                                 res.redirect("/confirmaccount/"+ req.params.token);
                             }
                            //  console.log(req.user.email);
                                
                         }
                            
                     });
        },
         function( user, done){
            var smtpTransport = nodemailer.createTransport({
                service:'Gmail',
                auth:{
                    user:'webemailkip@gmail.com',
                    pass:'parcel1002017'
                
                }
            });
            var mailOptions = {
                to: user.email,
                from:'webemailkip@gmail.com',
                subject:'Street Sweeper Account Confirmation',
                html:"Hello \b" +user.username + "\bThis is a confirmation that the password for your streetSweepeer admin account " + user.email +" has been set and your account has been verified\n\n"
                        +"Welcome"
                };
                smtpTransport.sendMail(mailOptions, function(err){
                 logger.infoLog.info(middleware.capitalize( user.username) + "has changed their password");
                 req.flash('success','Your account has been verified.');
                 res.redirect("/panel");
                done(err,'done');
                });
        }
        ], function(err){
            if(err){ 
                return next();
                
            }
             
        }
)
 });
    
 router.post("/changepassword/:id", (req, res)=> {
            async.waterfall([
        function(done){
                       User.findOne({username:req.user.username },function(err,user,next){
                             console.log(user);
                           if(user){
                               // console.log('code')
                             console.log(req.body.password +" vs "+req.body.confirmPassword);
                             if(req.body.password===req.body.confirmPassword){
                                  user.setPassword(req.body.password,function(err,user){
                                     user.save(function(err){//saves the new details for the user to database
                                        if(err){
                                            req.flash("err","something went wrong");
                                            res.redirect("back");
                                        }else{
                                             req.flash('success','Password Succesfully Changed.');
                                                res.redirect("back");
                                    
                                        }
                                    });
                                 });
                             }else{
                                 req.flash('error','Passwords does not match');
                                 res.redirect("/profile");
                             }
                            //  console.log(req.user.email);
                                
                         }
                     });
        },
         function( user, done){
            var smtpTransport = nodemailer.createTransport({
                service:'Gmail',
                auth:{
                    user:'webemailkip@gmail.com',
                    pass:'parcel1002017'
                
                }
            });
            var mailOptions = {
                to: user.email,
                from:'webemailkip@gmail.com',
                subject:'Street Sweeper Account Confirmation',
                html:"Hello \b" +req.body.username + "\bYour apssword has been successfully changed" 
                        +"Welcome"
                };
                smtpTransport.sendMail(mailOptions, function(err){
                 logger.infoLog.info(middleware.capitalize(user.username) + " has successfully changed their password");
                 req.flash('success','Password was successfully changed.');
                 res.redirect("/panel");
                done(err,'done');
                });
        }
        ], function(err){
            if(err){ 
                return next();
                
            }
             
        }
)
 });
router.post("/editaccount/:id/profile",middleware.isLoggedIn,(req, res)=>{
            User.findByIdAndUpdate(req.params.id,{'yearofBirth':req.body.yob},{new:true},(err,user)=>{
                if(err){
                    req.flash("error","Sorry,something went wrong");
                    res.redirect("back");
                }else{
                    req.flash("success","Details successfully set");
                    res.redirect("back");
                }
            });
});

//logout router
router.get("/logout", function(req,res){
   
    if(req.isAuthenticated()){
        
        logger.infoLog.info(middleware.capitalize(req.user.username ) + " has just logged out " +  " at " + moment(moment().valueOf()).format('h:mm:a, Do MMMM  YYYY,') )
        req.logout();
        req.session.destroy(function(err){
            if(err){
               logger.errorLog.error(err);
            } else {
                //req.flash("error","Please Login First");
                res.redirect("/");
            }
        });
    }else{
        req.flash('error','Your were not logged in');
          res.redirect("/");
    }
   
});


router.get("/resetPassword",function(req, res,err) {
        res.render("forgot_password");
});
router.post("/resetPassword",function(req,res){
     async.waterfall([
        function(done){
            crypto.randomBytes(20,function(err,buf){
                var token = buf.toString('hex');
                done(err,token);
            });
            
        },
        function(token, done){
            
            if(req.body.email){
                var email = req.body.email;
            }
            else{
                var email = req.user.email;
            }
            User.findOne({email:email},function(err,user){
                if(!user){
                  //  console.log(err + "No accont exists");
                 req.flash("error"," The email you entered does not belong to an account !");
                    return res.redirect('back');
                }
                 user.resetPasswordToken = token;
                 user.resetPasswordExpires = Date.now()+3600000;//1hr
                 user.save(function(err){
                    done(err, token, user);
                    
                });
            });
        },
        function(token, user, done){
            var smtpTransport = nodemailer.createTransport({
                service:'Gmail',
                auth:{
                    user:'webemailkip@gmail.com',
                    pass:'parcel1002017'
                
                }
            });
            var mailOptions = {
                to: user.email,
                from:'StreetSweeperKE',
                subject:'Account Password Reset',
                text:'You are receiving this  mail to set your password and account  ' +'\n\n'+
                'Click on the link or paste it into your browser to go on and reset your password'+'\n\n' +
                'http://'+ req.headers.host +'/resetpassword/'+token + '\n\n'+
                'if you did not request password reset . Kindly s please ignore this email'
                };
                smtpTransport.sendMail(mailOptions, function(err){
                 //console.log(mailOptions);
                req.flash('success','An email has been sent to you with further instructions to reset your password.');
                res.redirect("/login");
                done(err, 'done');
                });
        }
        ], function(err){
            if(err){ 
                return next();
        }else{
            
        }
    });
});

router.get("/resetPassword/:token",function(req, res) {
    User.findOne({resetPasswordToken:req.params.token,resetPasswordExpires:{ $gt:Date.now()} },function(err,user){
        if(!user){
           // console.log("token time has expired or invalid");
             req.flash('error','reset password token is invalid or has expired');
             res.redirect("/login");
        }
      else{
          console.log(req.body);
           res.render("resetpassword",{token: req.params.token,});
    
      }
})
});

router.post("/resetPassword/:token",function(req, res) {
     async.waterfall([
        function(done){
                     User.findOne({resetPasswordToken:req.params.token,resetPasswordExpires:{ $gt:Date.now()} },function(err,user,next){
                if(!user){
                    console.log("token time has expired or invalid");
                    console.log(err);
                     req.flash('error','reset password token is invalid or has expired');
                     res.redirect("/login");
                }
                if(req.body.password===req.body.confirmPassword){
                 //console.log(req.body.password);
                //  console.log(req.user.email);
                 user.setPassword(req.body.password,function(err){
                     user.resetPasswordToken = undefined;//The reset tokesn are removed
                     user.resetPasExpires = undefined;//
                     
                     user.save(function(){//saves the new details for the user to database
                    req.logIn(user,function(err){
                           req.flash('success','Password Succesfully set. Welcome');
                        done(err,user);
                    });
                    
                 });
             });
             }else
             {
                   req.flash('error','Password do not match');
                     res.redirect("back");
             }
            });
        },
         function( user, done){
            var smtpTransport = nodemailer.createTransport({
                service:'Gmail',
                auth:{
                    user:'webemailkip@gmail.com',
                    pass:'parcel1002017'
                
                }
            });
            var mailOptions = {
                to: user.email,
                from:'webemailkip@gmail.com',
                subject:'Admin Panel',
                text:"Hello\n\n" + "This is a confirmation that the password for your StreetSweeperKE Admin account has just been changed successfully"
                };
                smtpTransport.sendMail(mailOptions, function(err){
            logger.infoLog.info(middleware.capitalize(user.username) + "has successfully changed their password");
                req.flash('success','Success,Your password has been changed.');
                done(err);
                });
        }
        ], function(err){
            if(err){ 
                return next();
                
            }
             res.redirect("/panel");
        }
)});
//Android APIs
router.post("/signup_android",(req,res)=>{
  //  console.log(req.body.firstName);
     if (!req.body.number || !req.body.firstName || !req.body.lastName || !req.body.county )
        return res.status(200).json({
                                                      success: false,
                                                      message: 'Invalid Input received!',
                                                      
                                                    });;

    Android.findOne({ username:  req.body.number }, function(err, user) {
        if (user) {
            return res.status(200).json({
                                                      success: false,
                                                      message: 'User already exists!',
                                                      
                                                    });;
        } else {
      var number = myCustomJoi.string().phoneNumber({ defaultCountry: 'KE', format: 'e164' }).validate(req.body.number);
         
         if(number.value.length>13){
             number.error= 'Too long';
         }
         // console.log(number);  
          if(number.error){
              return  res.status(200).json({
                                                      success: false,
                                                      message: 'Invalid phone number',
                                                      
                                                    });;
          }
            Android.register(new Android({
                                      username:number.value ,
                                      fname:req.body.firstName,
                                      lname:req.body.lastName,
                                      county:req.body.county,
                                      createdAt:moment().valueOf()
                                     }),req.body.password, function(err,user){
                                     if(err){
                                         console.log(err)
                                          return res.status(200).json({success:false,message:err.message});
                                     }else{
                                            var token = jwt.sign(user,'Secret do not share with anyone', { expiresIn: 1440 });
                                             user = user.toObject();
                                             user.joined = moment(user.createdAt).format('MMMM Do YYYY, h:mm:ss a');
                                              user.token = token
                                             delete user.createdAt;
                                             delete user.salt;
                                             delete user['hash'];
                                             delete user['__v'];
                                             console.log(user.username)
                                        //  res.writeHead(200, {"Content-Type": "application/json"});
                                        //  res.end(JSON.stringify(user));
                                         
                                         
                                            //console.log(token)
                                             logger.infoLog.info(middleware.capitalize(user.fname)+' has just registered  via api');
                                             return    res.status(200).json({
                                                                              success: true,
                                                                              message: 'Registration successful!',
                                                                               _id:user._id,
                                                                               
                                                                              token: token,
                                                                              user:user
                                                                            });
                                                             }
                                                             });

        }
    });
    
});

router.post("/login_android",(req,res,next)=>{
     passport.authenticate('android-local', function(err, user, info) {
            if (err)
                return res.status(200).json({
                                                      success: false,
                                                      message: 'Login Failed!',
                                                      
                                                    });
            if(!user){
                 return res.status(200).json({
                                                      success: false,
                                                      message: 'Login Failed!',
                                                      
                                                    });
            }
           // console.log(info);
               
            req.logIn(user, function(err) {
               //console.log(user)
                if (err){
                     console.log('error occured');
                     //console.log(err)
                    return res.status(200).json({
                                                      success: false,
                                                      message: err.message,
                                                      
                                                    });
                    
                }
                if (!err){
                    var token = jwt.sign(user.toJSON(),'Secret do not share with anyone', { expiresIn: 1440000 });
                    //console.log(token)
                     logger.infoLog.info(middleware.capitalize(user.fname)+' has just logged in  via api');
                                         user = user.toObject();
                                          user.joined = moment(user.createdAt).format('MMMM Do YYYY, h:mm:ss a');
                                          user.token = token
                                         delete user.createdAt;
                                         delete user.salt;
                                         delete user['hash'];
                                         delete user['__v'];
                     return    res.status(200).json({
                                                      error:null,        
                                                      success: true,
                                                      _id:user._id,
                                                      
                                                      message: 'Login successful!',
                                                      token: token,
                                                      user:user
                                                    });
                }
                
            });
        })(req, res, next);
    
});
router.post("/profile_android",isLoggedInById,(req,res,next)=>{
    //console.log(req.decoded) 
    logger.infoLog.info(middleware.capitalize(req.decoded.fname)+' has accessed profile_android api');
      Android.findOne({ username: req.decoded.username }, function(err, user) {
        if (user) {
         //   res.writeHead(200, {"Content-Type": "application/json"});
            user = user.toObject();
            user.joined = moment(user.createdAt).format('MMMM Do YYYY, h:mm:ss a');
            delete user.createdAt;
            delete user.salt;
            delete user.hash;
            delete user.__v;
            res.status(200).json({
                                                      success: true,
                                                      message: 'User was found!',
                                                     
                                                      user:user
                                                    });
        } else {
            return res.status(200).json({
                                                      success: false,
                                                      message: 'User not found!',
                                                      
                                                    });
        }
    });
    
});
router.post("/profilepic_android",isLoggedInById, upload.single('image'), async(req,res,next)=>{
     logger.infoLog.info(req.decoded.fname+' has accessed profilepic_android api');
     if(req.fileValidationError){
          return res.status(200).json({
                                                      success: false,
                                                      message: req.fileValidationError,
                                                      
                                                    });
     }
    if(!req.file){
   
    return res.status(200).json({success:false, message:'Profile pic not changed'});
        
    }else{
        var file=req.file.path;
       // console.log(req.file);
      //  return
        cloudinary.v2.uploader.upload(file,(error, result)=> {
            if(error){
              return res.status(200).json({success:false, message:'An error occured in changing your profile pic'});
            }else{
            console.log(result)
            Android.findByIdAndUpdate(req.decoded._id,{profilepic:result.secure_url},{new: true},(err,profile)=>{
                if(err){
                    return res.status(200).json({success:false, message:'An error occured in changing your profile pic'}); 
                }else{
                     return res.status(200).json({success:true, message:'Profile pic changed',user:profile});
                }
            })
            }
            
        });
    
    }
    
});
router.post("/myreports_android",isLoggedInById,(req,res,next)=>{
    //console.log(req.decoded) 
    logger.infoLog.info(middleware.capitalize(req.decoded.fname)+' has accessed myreports_android api');
      Report.find({ username: req.decoded.username }).sort({createdAt:-1}).limit(20).exec( function(err, reports) {
          console.log('[before null]',reports)
          if(reports.length==0){
              return res.status(200).json({
                                                      success: false,
                                                      message: 'No report found',
                                                      
                                                    });   
          }
        if (reports) {
         var sendData =  Array();
            reports.forEach((report,i)=>{
                report= report.toObject();
                report.county= report.location.county;
                report.constituency= report.location.constituency;
                if(report.images.length>0){
                   
                report.image =report.images[0];
              
                report.image = report.image.replace('upload/','upload/q_30/c_fill,h_250,w_450/')
                }
                report.upvote_no = report.upvotes.number; 
                report.downvote_no = report.downvotes.number;
                
                   report.createdTime = moment(report.createdAt).format('MMMM Do YYYY, h:mm:ss a');
                 delete report.createdAt;
                delete report.__v;
                delete report._id;
                delete report.location;
                delete report.reviewed;
                delete report.images;
             
                delete report.isUrgent;
                delete report.isNotify;
                delete report.upvotes;
                delete report.downvotes;
            
                sendData.push(report);
                if(i==reports.length-1){
                    //console.log("[reports being sent to app]",sendData)
                    res.status(200).json(sendData );  
                }
            }) 
        } else {
            return res.status(200).end('User not found');
        }
    });
    
});
router.post("/otherreports_android",isLoggedInAndroid,(req,res,next)=>{
    //console.log(req.decoded) 
    logger.infoLog.info(middleware.capitalize(req.decoded.fname)+' has accessed otherreports_android api');
      Report.find({ username: { $ne: req.decoded.username } }).sort({_id:1}).limit(20).exec(function(err, reports) {
        if (reports) {
            //res.writeHead(200, {"Content-Type": "application/json"});
           
            res.status(200).json({success:true, message:'Query successful!',reportsCount:reports.length,reports:reports});
        } else {
            return res.status(400).end('No report found');
        }
    });
    
});
router.post("/allreports_android",(req,res)=>{
    logger.infoLog.info('All reports api has been accessed');
    //console.log(req.decoded) 
   // logger.infoLog.info(middleware.capitalize(req.decoded.fname)+' has accessed myreports_android api');
   /*Return sort to upvotes.number*/
      Report.find({}).sort({'createdAt':-1}).skip(0).limit(200000).exec(function(err, reports) {
          if(err){
              console.log(err);
          }
        if (reports) {
            var sendData =  Array();
            reports.forEach((report,i)=>{
                report= report.toObject();
                report.county= report.location.county;
                report.constituency= report.location.constituency;
                if(report.images.length>0){
                   
                report.image =report.images[0];
              
                report.image = report.image.replace('upload/','upload/q_30/c_fill,h_250,w_450/')
                }
                report.upvote_no = report.upvotes.number; 
                report.downvote_no = report.downvotes.number;
                
                   report.createdTime = moment(report.createdAt).format('MMMM Do YYYY, h:mm:ss a');
                 delete report.createdAt;
                delete report.__v;
                delete report._id;
                delete report.location;
                delete report.reviewed;
                delete report.images;
             
                delete report.isUrgent;
                delete report.isNotify;
                delete report.upvotes;
                delete report.downvotes;
            
                sendData.push(report);
                if(i==reports.length-1){
                    //console.log("[reports being sent to app]",sendData)
                    res.status(200).json(sendData );  
                }
            }) 
           
        } else {
            return res.status(400).end('No report found');
        }
    });
    
});
router.post("/mycountyreports_android",isLoggedInById,(req,res)=>{
    //console.log(req.decoded) 
   logger.infoLog.info(middleware.capitalize(req.decoded.fname)+' has accessed myreports_android api');
      Report.find({'location.county':req.decoded.county}).sort({createdAt:-1}).limit(300).exec(function(err, reports) {
          if(err){
              console.log(err);
          }
        if(err){
              console.log(err);
          }
        if (reports) {
            var sendData =  Array();
            reports.forEach((report,i)=>{
                report= report.toObject();
                report.county= report.location.county;
                report.constituency= report.location.constituency;
                report.image =report.images[1];
                report.upvote_no = report.upvotes.number; 
                report.downvote_no = report.downvotes.number;
                
                   report.createdTime = moment(report.createdAt).format('MMMM Do YYYY, h:mm:ss a');
                 delete report.createdAt;
                delete report.__v;
                delete report._id;
                delete report.location;
                delete report.reviewed;
                delete report.images;
             
                delete report.isUrgent;
                delete report.isNotify;
                delete report.upvotes;
                delete report.downvotes;
            
                sendData.push(report);
                if(i==reports.length-1){
                    res.status(200).json(sendData );  
                }
            }) 
           
        } else {
            return res.status(400).end('No report found');
        }
    });
    
});
router.post("/blacklist_android",isLoggedInAndroid,(req,res)=>{
    //console.log(req.decoded) 
   logger.infoLog.info(middleware.capitalize(req.decoded.fname)+' has accessed blacklist_android api');
     
});
router.post('/edit_profile_android', isLoggedInById, (req, res) => {
    const { body } = req;
    const { decoded } = req;
    console.log('[data of request]', req.body)
    console.log('[decoded]', req.decoded)
   
    return  res.json({success:true});
   Android.findOneAndUpdate({_id:req.decoded._id},{email:body.email,fname:body.fname,lname:body.lname,phone_number:body.phone_number}, {new: true})
       .then((user)=>{
        user = user.toObject()
        delete user.password;
        delete user.updatedAt;
        delete user.__v;
        delete user.role;
         console.log(user)
         res.json({success:true,message:'Query successful', user:user})
       })
       .catch((err)=>{
         console.log(err)
       })
});
router.post("/new_report_android", upload.array('images'), isLoggedInById, async (req,res,next)=>{
    // console.log('post new report starting...')
     if(req.fileValidationError){
          return res.status(200).json({
                                                      success: false,
                                                      message: req.fileValidationError,
                                                      
                                                    });
     }
//   if(filePaths.length>5){
//          res.send({success:false,'message':'Too many files!'})
//   }
   // console.log(req.decoded)
     /* we would receive a request of file paths as array */
    // console.log(req.files)
    let filePaths = req.files;
    //console.log("File paths:");
    // console.log(filePaths);
   // console.log(filePaths[0].path)
   var notify, urgent = false
   if(req.body.notify=='yes'){
       notify=true;
   }
   if(req.body.urgent =='yes'){
       urgent=true 
   }
    var report_android = {
                  ref_id: "SS"+cryptoRandomString(10)+"_"+cryptoRandomString(10),
                  username: req.decoded.username,
                  name: req.decoded.fname +" "+req.decoded.lname,
                  type:req.body.type,
                
                  location:{
                      'county':'Nairobi',
                      'constituency':req.body.constituency
                            },
                  coordinates:req.body.coordinates,
                  comment: req.body.comment,
                  isNotify:notify,
                  isUrgent:urgent,
                  images:[],
                  createdAt:moment().valueOf(),
                  phone_number:req.decoded.username,
                 
                }
     res.send({success:true,message:'Your report has been successfully submitted','report':report_android})
         if(filePaths.length>0&&filePaths.length<6){
             if(req.files[0].mimetype=='video/mp4'){
                 console.log('File is a video, it might take a while to upload, be patient..')
                 let videoupload = new Promise(async (resolve,reject)=>{
                        cloudinary.v2.uploader.upload(req.files[0].path,{ resource_type: "video" },(error, result)=> {
                       
                      if(error){
                            
                            reject();
                      }else if(result){
                          console.log(result)
                            report_android.video=result.secure_url
                            resolve();
                      }
                            
                   });
                     
                 })
                 .then((result)=>{
                     
                 })
                 .catch((error)=>{
                    res.send({success:true,message:'An error occured in uploading the video'})
                 })
                 await videoupload;
                
             }else{
             console.log('file is not video');
                   let multipleUpload = new Promise(async (resolve, reject) => {
                     let upload_len = filePaths.length
                        ,upload_res = new Array();
                        //console.log(upload_len + ' atline 56');
                        for(let i = 0; i < upload_len ; i++)
                        {
                            let filePath = filePaths[i].path;
                            await cloudinary.v2.uploader.upload(filePath, (error,result) => {
                               console.log( upload_res.length +"vs"+ upload_len)
                                if(upload_res.length === upload_len-1)
                                {
                                  /* resolve promise after upload is complete */
                                   upload_res.push(result)
                                  resolve(upload_res)
                                }else if(result)      {
                                  /*push public_ids in an array */  
                                  upload_res.push(result);
                                } else if(error) {
                                 // console.log(error)
                                  reject(error)
                                }
                
                            })
                
                        } 
                    })
                   .then((result) => result)
                   .catch((error) => error)
        
                    /*waits until promise is resolved before sending back response to user*/
                    let upload = await multipleUpload; 
                       
                    // console.log('atline 84');
                    console.log(upload)
                    upload.forEach((upload,)=>{
                        report_android.images.push(upload.secure_url);
                    });
            
            }
             Report.create(report_android, function (err, report) {
                      if (err)  {   
                          res.end(JSON.stringify(err));
                        }else{
                      Notify.create({body:' A new '+ report.type+' report has just been received',
                                    type:'new_report',
                                    ref_id:report.ref_id
                                    
                                   },(err,notification)=>{
                           req.io.sockets.to('masterRoom').emit('new-report/admin', report)
                      })
                  //    res.send({success:true,message:'Your report has been successfully submitted','report':report})
                        }
                      // ...
                    });
        }
        else{
            
             res.send({success:false,'message':'Too little or to many files received!'})
        }
     

    
});

router.post("/api/allreports",(req,res)=>{
    logger.infoLog.info('All reports clone api has been accessed');
    //console.log(req.decoded) 
   // logger.infoLog.info(middleware.capitalize(req.decoded.fname)+' has accessed myreports_android api');
      Report.find({}).sort({'upvotes.number':-1}).skip(20).limit(20).exec(function(err, reports) {
          if(err){
              console.log(err);
          }
        if (reports) {
    
          
                    res.status(200).json({success:true, message:"Query successful",Reports:reports} );  
                
           
        } else {
            return res.status(400).end('No report found');
        }
    });
    
});
router.post("/api/mycountyreports",isLoggedInAndroid,  (req,res)=>{
    logger.infoLog.info('My county reports clone api has been accessed');
    //console.log(req.decoded) 
   // logger.infoLog.info(middleware.capitalize(req.decoded.fname)+' has accessed myreports_android api');
      Report.find({'location.county':req.decoded.county}).sort({'upvotes.number':-1}).skip(20).limit(20).exec(async (err, reports)=> {
          if(err){
              console.log(err);
          }
        if (reports) {
                 let replace = new Promise((resolve)=>{
                    reports.map((report,i)=>{
                          //  report= report.toObject();
                     if(report.images.length>0){
                           report.images.forEach((image,i)=>{
                               // console.log(image.search("res"))
                                if(image.search("res")>0){
                                    report.images[i] =image.replace('upload/','upload/c_fill,h_250,w_450/')
                                    //console.log(image)
                                }
                                if(i==report.images.length-1){
                                
                                }
                            })
                       }
                     
                     
                       if(report.upvotes.voters.indexOf(req.decoded.username)>-1){
                              report.voted =true;
                              report.voteType='up';
                       }else  if(report.downvotes.voters.indexOf(req.decoded.username)>-1){
                          report.voted =true;
                           report.voteType='down';
                       }else{
                         report.voted =false;
                         report.voteType='sasa';
                       }
                     
                           report.key = report._id
                      if(i==reports.length-1){
                           report;
                           resolve()
                       }
                       //console.log(report)
                       return report
                    })
                 })
           
                 await replace; 
                 console.log('awaited')
                 res.status(200).json({success:true, message:"Query successful",Reports:reports} );  
                
           
        } else {
            return res.status(400).end('No report found');
        }
    });
    
});
router.post("/api/login",(req,res,next)=>{
     passport.authenticate('android-local', function(err, user, info) {
            if (err)
                return res.status(200).json({
                                                      success: false,
                                                      message: 'Invalid username or password!',
                                                      
                                                    });
            if(!user){
                 return res.status(200).json({
                                                      success: false,
                                                      message: 'Invalid username or password! ',
                                                      
                                                    });
            }
           // console.log(info);
               
            req.logIn(user, function(err) {
               //console.log(user)
                if (err){
                     console.log('error occured');
                     //console.log(err)
                    return res.status(200).json({
                                                      success: false,
                                                      message: err.message,
                                                      
                                                    });
                    
                }
                if (!err){
                    var token = jwt.sign(user.toJSON(),'Secret do not share with anyone', { expiresIn: 1440000 });
                    //console.log(token)
                     logger.infoLog.info(middleware.capitalize(user.fname)+' has just logged in  via api');
                                         user = user.toObject();
                                         
                                         delete user.salt;
                                         delete user['hash'];
                                         delete user['__v'];
                     return    res.status(200).json({
                                                      
                                                      success: true,
                                                     
                                                      
                                                      message: 'Login successful!',
                                                      token: token,
                                                    
                                                    });
                }
                
            });
        })(req, res, next);
    
});

function isLoggedIn(req, res, next){
    if(req.isAuthenticated()){
        return next();
    }
    res.redirect("/login",middleware.isLoggedIn,(req,res)=>{
        
        
    });
};
function isLoggedInById (req, res, next ){
    //console.log('[data from app]', req.body)
    //let length = req.body._id.length;
    let _id = req.body._id;
    Android.findById(_id)
           .then((found)=>{
                  if(found!== null){
                        req.decoded = found
                       next();
                  }else{
                       return res.status(401).send({ 
                            success: false, 
                            message: 'Unauthorized!.' 
                        });
                  }
           })
}
function isLoggedInAndroid(req, res, next) {
    var token = req.body.token|| req.query.token ||req.headers['x-access-token'];
  //  console.log(req.body)
    // decode token
  if (token) {

    // verifies secret and checks exp
    jwt.verify(token, 'Secret do not share with anyone', function(err, decoded) {       if (err) {
        return res.json({ success: false, message: 'Failed to authenticate, token Invalid or Expired!' });       } else {
        // if everything is good, save to request for use in other routes
        req.decoded = decoded;         next();
      }
    });

  } else {

    // if there is no token
    // return an error
    return res.status(403).send({ 
        success: false, 
        message: 'No token provided.' 
    });

  }
}

module.exports=router;
