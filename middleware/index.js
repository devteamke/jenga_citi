const User   = require("../models/user");


const crypto                  = require("crypto");
const async                   = require("async");
const nodemailer              =  require("nodemailer");
const express               = require("express");
const app                  = express();
const middlewareObj = {};
const moment = require('moment');
const Verifier =require("email-verifier");
const logger               = require('../logger/logger')

// middlewareObj.emailVerifier=function(req,res){
//     var email=req.body.email;
//     let verifier=new Verifier("at_8EuvZm3nDak0xfhj2tE1mN1XhcHte");
    
//     verifier.verify("email",(err,data) =>{
//         if (err) {
//             console.log(err);
//           return res.redirect('back');
//         }else
//         {
//               console.log(data);
//         }
  
//     });
    
// }

//To check is user is logged in
middlewareObj.isLoggedIn = function (req, res, next){

    if(req.isAuthenticated()){
       
        return next();
    }
    req.flash("error","Please login first !");
    req.session.returnTo = req.path; 
    res.redirect("/login");
}
//To check is user is Admin
middlewareObj.isAdmin = function (req, res, next){
    if(req.user.role === 'admin'){
        
        return next();
    }
   
    res.redirect("/somethinguser");
}
middlewareObj.isMasterAdmin=function(req,res,next){
            if(req.user.role==='master-admin'){
                return next();
            }else{
                logger.infoLog.info(req.user.username + " has just tried to access Master-admin route ::"+"\x1b[31m"+" Access Denied!"+"\x1b[0m" );
                
                req.flash("error","You are not privilegded to access this route!")               
                res.redirect("/");
            }
    }
middlewareObj.isRealString = function(str){
    return typeof str === 'string' && str.trim().length > 0;
};

 middlewareObj.isActive=(req,res,next)=>{
   //  console.log(req.body);
            User.findOne(req.body.username,(err,user)=>{
               console.log(user);
                if(err){
                    res.redirect("back");
                    
                }else{
                        return next();
                }
    })
 }

middlewareObj.isInArray = function(value, array){

       return array.indexOf(value) > -1;
 
};
middlewareObj.stripEndQuotes = function (s){
	var t=s.length;
	s=s.substring(1,t--);
	 s=s.substring(0,t);
	return s;
}
//To check is user is counelor
// middlewareObj.isCounselor = function (req, res, next){
//     if(req.user.role === 'counselor'){
//         return next();
//     }
//     res.redirect("/counselling");
// }
// //To check if user is client
// middlewareObj.isClient = function (req, res, next){
//   if(req.user){
//         if(req.user.role === 'member'){
//         return next();
//     }
//      res.redirect("/user/personal");
//   }
//   else{
//       next();
//   }
// }
//Capitalize first letter
middlewareObj.capitalize = function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
// to check if it is empty
middlewareObj.isEmpty = function (str) {
    return (!str || 0 === str.length);
}

middlewareObj.emailConfirmation = function (req,res){
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
                    console.log(err + "No accont exists");
                 req.flash("error"," The email you entered does not belong to an account !");
                    return res.redirect('back');
                }
                       user.verifyToken = token;
                 user.verifyExpires = Date.now()+3600000;//1hr
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
                from:'webemailkip@gmail.com',
                subject:'dmin Panel ',
                text:'You are receiving this to confirm your email address  ' +'\n\n'+
                'Click on the link or paste it into your browser to complete the process'+'\n\n' +
                'http://'+ req.headers.host +'/verify/'+token + '\n\n'+
                'if you did not request this please igonre this email'
                };
                smtpTransport.sendMail(mailOptions, function(err){
            
                req.flash('success','An email has been sent to '+ user.email + ' with further instructions.');
                done(err, 'done');
                });
        }
        ], function(err){
            if(err) return next(err);
            res.redirect('back');
        }
        );
}
//function generate random string
    middlewareObj.randomStr = function () {
      var text = "";
      var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    
      for (var i = 0; i < 12; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    
      return text;
    }
//Delete values from array
 middlewareObj.removeA = function (arr) {
     var what, a = arguments, L = a.length, ax;
    while (L > 1 && arr.length) {
        what = a[--L];
        while ((ax= arr.indexOf(what)) !== -1) {
            arr.splice(ax, 1);
        }
    }
    return arr;
    }
//Delete values from array
 middlewareObj.checkOnlineUsers = function (users,clients) {
      var resArr = [] ;
            users.forEach(function(user){
                   if (clients[user]){
                      
                        var status = {
                            'user':user,
                            'status':'online'
                        }
                        resArr.push(status);
                     } else {
                      
                           var status = {
                            'user':user,
                            'status':'offline'
                        }
                        resArr.push(status);
                     }  
            
        });
    return resArr;
    }
//ignore favicon
middlewareObj.ignoreFavicon =function (req, res, next) {
  if (req.originalUrl === '/favicon.ico') {
    res.status(204).json({nope: true});
  } else {
    next();
  }
}
middlewareObj.createToken=function (){
                crypto.randomBytes(20,(err,buf)=>{
                var token = buf.toString('hex');
                return token;
            });
        }
//Middlware to determine number of unread messages
middlewareObj.unread =function (req, res, next) {
 Message.aggregate(
  [
    {
      $match: {
        to:req.user.username , status:'unread', type:'chat'
      }
    },
    {"$group" : {_id:"$from", count:{$sum:1}}}
  ]
 ).exec(function(err, found){
        if(err){console.log(err)}
        else{
            console.log(found)
            res.locals.unread = found;
        }
    });
      next();
}

    module.exports = middlewareObj;