const express               = require("express");
const app                   = express();
const router                = express.Router();
const mongoose              = require("mongoose");
const nodemailer            = require('nodemailer');
const moment                = require("moment"); 
const middleware            = require("../middleware");
const passport              =require("passport");
const User                  = require("../models/user");
const Report                = require("../models/report");
const Messages              = require("../models/message");
const Notify                = require('../models/notifications');
const Android                =require("../models/androidusers");
const faker                 = require('faker/locale/en');
const async                 = require('async');
const logger                  = require('../logger/logger')
const cryptoRandomString = require('crypto-random-string');
var randomLocation = require('random-location')
//Random location radius set up
// Twitter HQ
const P = {
  latitude: -1.2872,
  longitude: 36.8283
}
 
const R = 30000 // meters
 
var data = new Array();
var messages= new Array();
for(var i =0;i<300;i++){
    var randomPoint = randomLocation.randomCirclePoint(P, R)
    var report = {
  ref_id: "SS"+cryptoRandomString(10)+"_"+cryptoRandomString(10),
  name: faker.name.findName(),
  username:faker.name.firstName(),
  type:faker.random.arrayElement(["leaking sewage","garbage","unsafe construction","potholes","leaking gas", "leaking water","riparian building","crime","any other"]),
  status: faker.random.arrayElement(["solved","escalated","reported"]),
  location:{
      'county':faker.random.arrayElement(['Mombasa','Kwale','Kilifi','Tana River','Lamu','Taita-Taveta','Garissa','Wajir','Mandera','Marsabit','Isiolo','Meru','Tharaka-Nithi','Embu','Kitui','Machakos','Makueni','Nyandarua','Nyeri','Kirinyaga','Muranga','Kiambu','Turkana','West Pokot','Samburu','Trans-Nzoia','Uasin Gishu','Elgeyo-Marakwet','Nandi','Baringo','Laikipia','Nakuru','Narok','Kajiado','Kericho','Bomet','Kakamega','Vihiga','Bungoma','Busia','Siaya','Kisumu','Homa Bay','Migori','Kisii','Nyamira','Nairobi']),
      'constituency':'TBD'
            },
  coordinates:randomPoint.latitude+","+ randomPoint.longitude,
  comment: faker.random.words()+faker.random.words(),
   upvotes:{
       'number':faker.random.number({
    'min': 10,
    'max': 500
   })
   },
  downvotes:{
      'number':faker.random.number({
    'min': 10,
    'max': 500
   })
  },
  isNotify:faker.random.arrayElement([true,false]),
  isUrgent:faker.random.arrayElement([true,false]),
  images:[ "https://source.unsplash.com/random/450x250","https://picsum.photos/450/250/?random","https://source.unsplash.com/random/450x251"],
  phone_number:faker.phone.phoneNumber('+2547########'),
  createdAt:moment().valueOf()   
};
if(report.location.county=="Nairobi"){
   report.location.constituency =faker.random.arrayElement(['Westlands','Dagoretti North','Dagoretti South','Langata','Kibra','Roysambu','Kasarani','Ruaraka','Embakasi South','Embakasi North','Embakasi Central','Embakasi East', 'Embakasi West', 'Makadara', 'Kamkunji', 'Starehe', 'Mathare']);
}
    
data.push(report);

}
for(var y =0;y<30;y++){
    var message ={
        conversationId:faker.random.arrayElement(['new_admin','new_report']),
        body:faker.lorem.sentence(),
        'participants.from':'system',
        'participants.to':faker.random.arrayElement(['5be3b0a03b331306ae199340','5be6a08007033e13739bac61','5be8a2a780d70025341741fc']),
        status:'unread'
    }
    messages.push(message);
}
//console.log(messages)


// Messages.create(messages, function (err, reports) {
//   if (err)     console.log(err);
 
//   // ...
// });

// Report.create(data, function (err, reports) {
//   if (err)     console.log(err);
 
//   // ...
// });
router.get("/",  (req,res)=>{
      if(req.user){
          req.flash("success","You are already logged in!");
          res.redirect('/panel');
       } else {
          res.render("login");
       }
   
});

router.get("/panel",  middleware.isLoggedIn, async (req,res)=>{
    var query = {}
    //android app users query
    var query2 = {}
    if(req.user.role=='admin'){
        var userCounty = req.user.county;
      var query= {
          'location.county':userCounty
      } 
      query2 ={'county':userCounty}
    }else if(req.user.role=='govt-official'){
        if(req.user.authority=='pipeline'){
            query={
                '$or': [ 
                    { 'type': 'leaking water' }, { 'type': 'leaking gas' } //also
                 ]  
            
                 }
        }else if(req.user.authority=='nema'){
             query={
                '$or': [ 
                    { 'type': 'garbage' }, { 'type': 'leaking sewage' } 
                 ]  
            
                 }
        }else if(req.user.authority=='ntsa'){
             query={
                '$or': [ 
                    { 'type': 'potholes' }, { 'type': '' } //also accidents
                 ]  
            
                 }
        }else if(req.user.authority=='land_commission'){
             query={
                '$or': [ 
                    { 'type': 'riparian building' }, { 'type': '' } //also c
                 ]  
            
                 }
        }else if(req.user.authority=='police'){
             query={
                '$or': [ 
                    { 'type': 'crime' }, { 'type': '' } //aso accidents
                 ]  
            
                 }
        }
        
    }
    //promise for latest reports
    let promise = new Promise((resolve, reject) => {
         Report.find(query).sort({_id:-1}).limit(10).exec((err,latestReports)=>{
             resolve(latestReports);
        });
    });   
     let latest = await promise;  
     //promise for trending reports
    let promise2 = new Promise((resolve, reject) => {
         Report.find(query).sort({'upvotes.number':-1}).limit(10).exec((err,latestReports)=>{
             resolve(latestReports);
        });
     });   
     let trending = await promise2;
     //promise forcount of app users
     let appUsers = new Promise((resolve,reject)=>{
         Android.countDocuments(query2,(err,count)=>{
             resolve(count)
         });
     });
     let totalUsers= await appUsers;
    //count for number of up users
    let unverifieduser=new Promise((resolve,reject)=>{
        User.find({isActive:false},(err,users)=>{
            resolve(users);
        })
    });
    let unverifiedusers=await unverifieduser;
    Report.countDocuments(query,(err, c)=>{
      
        //console.log(req.user.role)
       // console.log(query) 
        console.log('Return count: '+c)
       
        res.render("index",{trending:trending,reports:latest,count:c,appUsers:totalUsers,unverifiedusers:unverifiedusers});
        
    })
     
    // 
     
     
   // res.render("index",{reports:data});
})
// router.get("/reports",  middleware.isLoggedIn,(req,res)=>{
//    
// });
router.get("/reports",  middleware.isLoggedIn,(req,res)=>{
    res.render("reports_server",{reports:data});
});
router.post('/report/data', middleware.isLoggedIn, (req, res) =>{
   
//     var column = req.body.column;
//     var value = req.body.value;
//      console.log(req.body.column)
//     console.log(req.body.value)
//         var quer={}
     
//   if(req.user.role=='admin'){
//       var name = 'location.county';
//       quer[name] = req.user.county;
   
//     }else if(req.user.role=='govt-official'){
       
//         if(req.user.authority=='pipeline'){
//             quer={
              
//                 '$and':[{
//                              '$or':      [ 
//                           { 'type': 'leaking water' }, { 'type': 'leaking gas' } //also
                            
//                              ]  
//                     }]
//                  }
//         }else if(req.user.authority=='nema'){
//              quer={
              
//                 '$and':[{
//                              '$or':      [ 
//                           { 'type': 'garbage' }, { 'type': 'leaking sewage' } 
                            
//                              ]  
//                     }]
//                  }
//         }else if(req.user.authority=='ntsa'){
//              quer={
              
//                 '$and':[{
//                              '$or':      [ 
//                           { 'type': 'potholes' }, { 'type': '' } //also accidents
                            
//                              ]  
//                     }]
//                  }
//         }else if(req.user.authority=='land_commission'){
//              quer={
              
//                 '$and':[{
//                              '$or':      [ 
//                             { 'type': 'riparian building' }, { 'type': 'unsafe construction' }//aso accidents
                            
//                              ]  
//                     }]
//                  }
//         }else if(req.user.authority=='police'){
//              quer={
              
//                 '$and':[{
//                              '$or':      [ 
//                              { 'type': 'crime' },//aso accidents
                            
//                              ]  
//                     }]
//                  }
//         }
        
//     }
    
//     if(column === undefined || column.length == 0){
     
//         console.log('is null')
//     }else{
//         console.log('is not null')
        
      
//     if(column[0]==''&& column[1] ==''){
//              var name = column[2];
//             quer[name] = value[2];
            
//     }else if(column[0]==''){
//         console.log('column 0 is empty')
//         if(column.length==2){
//          var name = column[1];
//             quer[name] = value[1];
//         }else if(column.length==3){
//             var name = column[1];
//             quer[name] = value[1];
//             var name = column[2];
//             quer[name] = value[2];
//         }
//     }else{
//     for(var l=0;l<3;l++){
       
        
//          var name = column[l];
//         quer[name] = value[l];
//     }
//     }

      
//     }
  
//   console.log(quer)
//   var column = req.body.column;
//     var value = req.body.value;
//      console.log(req.body.column)
//     console.log(req.body.value)
   let quer={}
     
   if(req.user.role=='admin'){
       var name = 'location.county';
       quer[name] = req.user.county;
   
    }else if(req.user.role=='govt-official'){
       
        if(req.user.authority=='pipeline'){
            quer={
              
                '$and':[{
                             '$or':      [ 
                           { 'type': 'leaking water' }, { 'type': 'leaking gas' } //also
                            
                             ]  
                    }]
                 }
        }else if(req.user.authority=='nema'){
             quer={
              
                '$and':[{
                             '$or':      [ 
                           { 'type': 'garbage' }, { 'type': 'leaking sewage' } 
                            
                             ]  
                    }]
                 }
        }else if(req.user.authority=='ntsa'){
             quer={
              
                '$and':[{
                             '$or':      [ 
                           { 'type': 'potholes' }, { 'type': '' } //also accidents
                            
                             ]  
                    }]
                 }
        }else if(req.user.authority=='land_commission'){
             quer={
              
                '$and':[{
                             '$or':      [ 
                            { 'type': 'riparian building' }, { 'type': 'unsafe construction' }//aso accidents
                            
                             ]  
                    }]
                 }
        }else if(req.user.authority=='police'){
             quer={
              
                '$and':[{
                             '$or':      [ 
                             { 'type': 'crime' },//aso accidents
                            
                             ]  
                    }]
                 }
        }
        
    }
   
    req.body.columns.map((each,i)=>{
        let name = each.data;
            
        if(each.search.value !== ''){
            switch(name){
                case 'id':
                      quer['ref_id'] =  {$regex: each.search.value};
                break;
                case 'county':
                      quer['location.county'] = {$regex: each.search.value};
                break;
                case 'isUrgent':
                    if(each.search.value.toLowerCase()=='yes'){
                        quer[name] = true
                    }else if(each.search.value.toLowerCase()=='no'){
                         quer[name] = false
                    }
                break;
                default:
                  quer[name] = {$regex: each.search.value}
            }
      
        }
        
        
    })
    // if(column === undefined || column.length == 0){
     
    //     console.log('is null')
    // }else{
    //     console.log('is not null')
        
      
    // if(column[0]==''&& column[1] ==''){
    //          var name = column[2];
    //         quer[name] = value[2];
            
    // }else if(column[0]==''){
    //     console.log('column 0 is empty')
    //     if(column.length==2){
    //      var name = column[1];
    //         quer[name] = value[1];
    //     }else if(column.length==3){
    //         var name = column[1];
    //         quer[name] = value[1];
    //         var name = column[2];
    //         quer[name] = value[2];
    //     }
    // }else{
    // for(var l=0;l<3;l++){
       
        
    //      var name = column[l];
    //     quer[name] = value[l];
    // }
    // }

      
    // }
  
  //console.log(quer)
    
  Report.dataTables({
    find:quer,
    limit:15,
    order: req.body.order,
    columns: req.body.columns,
    skip: req.body.start,
    formatter: function (report) {
        var com_sub = report.comment.substring(0,50);
        if(report.status=="solved"){var label="success"}else if(report.status=="escalated"){var label="danger"}else if(report.status=="reported"){var label="info"};
        var date =report.createdAt;
                             var m = moment(date);  // or whatever start date you have
                      var today = moment().startOf('day');

                      var days = Math.round(moment.duration(today - m).asDays());var flash =''; if(days>3&&report.status=="reported"){flash='faa-flash animated '; label ="warning"}
        if(report.isUrgent==true){
           return  {  id:report.ref_id,
                      type:middleware.capitalize(report.type),
                      isUrgent:'Yes',
                      county:report.location.county,
                      status:'<span class="label label-'+label +' '+flash +'">'+middleware.capitalize(report.status)+'</span>',
                      comment: com_sub+'...',
                      full:'<a href="/reports_s/'+report.ref_id+'/view">Full report</a>',
           }
        }else{
             return   {  id:report.ref_id,
                      type:middleware.capitalize(report.type),
                      isUrgent:'No',
                      county:report.location.county,
                      status:'<span class="label label-'+label +' '+flash+' ">'+middleware.capitalize(report.status)+'</span>',
                      comment: com_sub+'...',
                      full:'<a href="/reports_s/'+report.ref_id+'/view">Full report</a>',
           }
        }
     
        
      
    },
    search: {
      value: req.body.search.value,
      fields: ['type','ref_id','status','location.county','location.constituency','status','comment']
    },
    sort: {
   type: 1
    }
  }).then(function (table) {
    res.json({data: table.data,
      recordsFiltered: table.total,
      recordsTotal: table.total}); // table.total, table.data
  })
});

router.get("/reports_s/:id/view",  middleware.isLoggedIn, async (req,res)=>{
    var doc =  req.params.id;
     let promise = new Promise((resolve, reject) => {
        
        Report.findOne({ref_id:doc},function(err, doc){
            if(err){
                logger.errorLog.error(err);
                reject(err);
            }else{
                console.log('found report')
                resolve(doc);
            }
            
            }) ; 
    });
    let report = await promise;
    report =report.toObject();
    report.full = [];
    let replace = new Promise((resolve)=>{
        if(report.images.length>0){
           report.images.forEach((image,i)=>{
                console.log(image.search("res"))
                    if(image.search("res")>0){
                        report.full[i] = image
                        report.images[i] =image.replace('upload/','upload/c_fill,h_250,w_450/')
                        //console.log(image)
                    }else  if(image.search("450/250")>0){
                    
                        report.full[i]=image.replace('450/250','1650/850')
                         
                       
                    }else  if(image.search("/random/450x250")>0){
                         report.full[i] =image.replace('/random/450x250','/random/1650x850')
                    }else if(image.search("/random/450x251")>0){
                         report.full[i]=image.replace('450x251','1650x851')
                    }
                    
                if(i==report.images.length-1){
                    resolve();
                }
            })
       }else{
           resolve();
       }
            
    });
  
    await replace;      
   
    if(req.user.role=='admin'){
        //console.log(report.location.county+"vs"+req.user.county)
        if(report.location.county==req.user.county){
          //  console.log(report)
           
             res.render("full_report",{report:report});
        }else{
            req.flash('error','You do not have enough priviledges to access this report');
            res.redirect('/reports');
        }
    }else{
         console.log(report)
    res.render("full_report",{report:report});
  }
});
router.post("/reports_s/:id/view",  middleware.isLoggedIn, async (req,res)=>{
    var doc =  req.params.id;

        res.send('This module is yet to be implemented');
        Report.findOne({ref_id:doc},function(err,report){
            if(err){
                logger.errorLog.error(err);
                
            }else{
                console.log('found report')
               
               
            }
            
            }) ; 
   

    
  
   
});

router.get("/profile",middleware.isLoggedIn,(req,res)=>{
             res.render("profile");
})
router.get("/admins",middleware.isLoggedIn,middleware.isMasterAdmin,(req,res)=>{
    User.find({},(err,Users)=>{
            res.render("admins",{users:Users});
    });
 });
 router.get("/admins/:id/view",middleware.isLoggedIn,middleware.isMasterAdmin,(req,res)=>{
     //console.log(req.params.id);
      User.findById(req.params.id,(err,user)=>{
          if(user!==null){
              console.log(req.user.username +" viewed " +user.username);
              res.render("profileview",{admin:user});
          }else{
              req.flash('error','User does not exist')
              res.redirect('/panel')
          }
      });
 });
 router.post("/admins/:id/view",middleware.isLoggedIn,middleware.isMasterAdmin,(req,res)=>{
     console.log('delete request received');
     if(req.body.choice==="Delete"){
         User.findByIdAndRemove(req.params.id,(err,user)=>{
          if(err){
              req.flash("error","Something went wrong");
              res.redirect("admins");
          }else{
            
              req.flash("success","Admin successfully removed");
              res.redirect("/admins");
          }
      });
    }
    if(req.body.choice==="Deactivate"){
       
        User.findByIdAndUpdate(req.params.id,{'isActive':false},{new:true},(err,user)=>{
             if(err){
              req.flash("error","Something went wrong");
              res.redirect("back");
          }else{
              console.log(req.user.username + " deactivated "+ user.username);
              req.flash("success"," Admin successfully deactivated");
              res.redirect("back");
          }
        });
    }
       if(req.body.choice==="Activate" ){
        User.findByIdAndUpdate(req.params.id,{isActive:true},{new:true},(err,user)=>{
             if(err){
              req.flash("error","Something went wrong");
              res.redirect("back");
          }else{
                   console.log(req.user.username + "activated "+ user.username);
              req.flash("success"," Admin successfully activated");
              res.redirect("back");
          }
        });
    }
      
 });
router.get("/androidusers",middleware.isLoggedIn,(req,res)=>{
  // console.log(req.user.role);
    /*We will review this approach once we seek clarification */
    if(req.user.role==='admin'){
       // console.log(req.user.role);
     
        var location=req.user.county;
        Android.find({},(err,androidusers)=>{
            res.render("androidusers",{users:androidusers});
        });
    }else if(req.user.role==='master-admin'){
        Android.find({},(err,androidusers)=>{
            //console.log(req.user.role);
            if(err){
                req.flash("err","Sorry,something went wrong");
                res.redirect("back");
            }else{
                console.log(req.user.role);
                res.render("androidusers",{users:androidusers})
            }
        });
    }
});
router.get("/androidusers/:id/view",async(req,res)=>{
    let androiduser=new Promise((resolve,reject)=>{
        Android.findById(req.params.id,(err,user)=>{
            if(err){
                logger.errorLog.error(err);
                reject(err);
            }else{
                resolve(user);
            }
        })
    });
    let founduser=await androiduser;
    let profile=new Promise((resolve,reject)=>{
        if(founduser.profilepic){
             founduser.profilepic.replace('upload/','upload/h_250,w_250,crop: thumb, gravity: face, radius: max ----------------8-88888888888888888888888888888888888888888888-/')
        }
        resolve(founduser.profilepic);
    });
    await profile;
    //console.log(founduser);
    res.render("profileview",{admin:founduser});
});
router.get('/notifications', middleware.isLoggedIn, (req,res)=>{
  if(req.user.role=='admin'){
        Notify.find({type:"new_report"})
          .sort({'createdAt':-1})
          .then((notifications)=>{
             res.render('notifications', {notifications:notifications});
            // console.log('[notifcations]', notifcations);
          })    
          .catch((err)=> console.log('[err]',err))
    
  }else{
        Notify.find({})
          .sort({'createdAt':-1})
          .then((notifications)=>{
             res.render('notifications', {notifications:notifications});
            // console.log('[notifcations]', notifcations);
          })
          .catch((err)=> console.log('[err]',err))
    
  }
});
module.exports = router;