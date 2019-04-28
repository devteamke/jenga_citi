const moment                  = require("moment"); 
const middleware              = require("../middleware");
const User                  = require("../models/user");
const Report                  = require("../models/report");
const Notify                  =require("..//models/notifications");
const Messages              = require("../models/message");
const async                   = require('async');
//validation

exports = module.exports = function(io){
 var clients = {};
 var checkOnline = []
//MAIN IO

io.on('connection',(socket)=>{
   // console.log('New client connected');
     //console.log(socket.request.user.logged_in);
     socket.nickname =socket.request.user.fname;
    // console.log(socket.nickname)
        if(socket.request.user.role=='admin'){
          socket.join('adminRoom');
        
        }else{
          socket.join('masterRoom');
          // var clients =io.sockets.adapter.rooms['masterRoom'].sockets
          //  console.log(clients)
        }
     socket.on('fetch notifications no', (data, cb)=>{
      if(socket.request.user.role=='admin'){
       console.log('[notifications] Admin is requesting notifications no')
       Notify.countDocuments({type:"new_report"},(err,count)=>{
            console.log(err,count);
            cb({count:count})
         });
       
      }else{
       console.log('[notifications] Master Admin  is requesting notifications no')
       Notify.countDocuments({},(err,count)=>{
            console.log(err,count);
            cb({count:count})
         });
       
      }
      
     })
     socket.on('fetch chart data', async (data,cb)=>{
   //   console.log(socket.request.user.role)
     // console.log(socket.request.user.authority)
         if(socket.request.user.role=='admin'){
             var response = {}
             var county =socket.request.user.county ;
             let promise = new Promise((resolve) => {
             Report.aggregate([ { $match : { 'location.county' :socket.request.user.county  } } ,
                            	{
                            	 "$group" : {_id:"$location.constituency", count:{$sum:1}}
                            	},
                            	{
                            	   $sort:{"count":-1}
                            	},
                            	{$limit : 10}
                            	]).exec((err,data)=>{
                                     //console.log(data)
                                     response['donChart'] = data;
                                     //console.log(response)
                                     resolve()
                                    //  
                                 });
            });
            await promise;
             Report.aggregate([ { $match : { 'location.county' :socket.request.user.county  } } ,
                            	{
                            	 "$group" : {_id:"$type", count:{$sum:1}}
                            	},
                            	{
                            	   $sort:{"count":-1}
                            	},
                            	{$limit : 10}
                            	]).exec((err,data)=>{
                                    // console.log(data)
                                     response['polar'] = data;
                                      cb(response);
                                     //console.log(response)
                                     
                                    //  
                                 });
           
         }else if(socket.request.user.role=='govt-official'){
                 var response = {}
               //   var var quer={}
             var county =socket.request.user.county ;
          
             if(socket.request.user.authority=='pipeline'){
            var quer={
              
                '$and':[{
                             '$or':      [ 
                           { 'type': 'leaking water' }, { 'type': 'leaking gas' } //also
                            
                             ]  
                    }]
                 }
        }else if(socket.request.user.authority=='nema'){
             var quer={
              
                
                             '$or':      [ 
                           { 'type': 'garbage' }, { 'type': 'leaking sewage' } 
                            
                             ]  
                    
                       
                 }
        }else if(socket.request.user.authority=='ntsa'){
             var quer={
              
                '$and':[{
                             '$or':      [ 
                           { 'type': 'potholes' }, { 'type': '' } //also accidents
                            
                             ]  
                    }]
                 }
        }else if(socket.request.user.authority=='land_commission'){
             var quer={
              
                '$and':[{
                             '$or':      [ 
                            { 'type': 'riparian building' }, { 'type': 'unsafe construction' }//aso accidents
                            
                             ]  
                    }]
                 }
        }else if(socket.request.user.authority=='police'){
             var quer={
              
                '$and':[{
                             '$or':      [ 
                             { 'type': 'crime' },//aso accidents
                            
                             ]  
                    }]
                 }
        }
     
        //console.log(quer)
             let promise = new Promise((resolve) => {
             Report.aggregate([ { $match : quer } ,
                            	{
                            	 "$group" : {_id:"$location.county", count:{$sum:1}}
                            	},
                            	{
                            	   $sort:{"count":-1}
                            	},
                            	{$limit : 10}
                            	]).exec((err,data)=>{
                                     //console.log(data)
                                     response['donChart'] = data;
                                     //console.log(response)
                                     resolve()
                                    //  
                                 });
            });
            await promise;
             Report.aggregate([ { $match :quer} ,
                            	{
                            	 "$group" : {_id:"$type", count:{$sum:1}}
                            	},
                            	{
                            	   $sort:{"count":-1}
                            	},
                            	{$limit : 10}
                            	]).exec((err,data)=>{
                                    // console.log(data)
                                    data.forEach((data)=>{
                                      var color;
                                 if(data._id=='leaking sewage'){
                                  color='pink'
                                 }else if(data._id=='garbage'){
                                  color='yellow'
                                 }else if(data._id=='unsafe construction'){
                                  color='blue'
                                 }else if(data._id=='potholes'){
                                  color='black'
                                 }else if(data._id=='leaking gas'){
                                  color='orange'
                                 }else if(data._id=='leaking water'){
                                  color='aqua'
                                 }else if(data._id=='riparian building'){
                                  color='purple'
                                 }else if(data._id=='crime'){
                                  color='red'
                                 }else if(data._id=='any other'){
                                  color='brown'
                                 }
                                 data.color =color;
                                 
                                    });
                                     response['polar'] = data;
                                      cb(response);
                                     //console.log(response)
                                     
                                    //  
                                 });
         }else{
            
               var response = {}
               let promise = new Promise((resolve) => {
               Report.aggregate([ 
                            	{
                            	 "$group" : {_id:"$location.county", count:{$sum:1}}
                            	},
                            	{
                            	   $sort:{"count":-1}
                            	},
                            	{$limit : 10}
                            	]).exec((err,data)=>{
                                     //console.log(data)
                                     response['donChart'] = data;
                                     resolve();
                                      //cb(data);
                                 });
              });
              await promise;
              Report.aggregate([ 
                            	{
                            	 "$group" : {_id:"$type", count:{$sum:1}}
                            	},
                            	{
                            	   $sort:{"count":-1}
                            	},
                            	{$limit : 10}
                            	]).exec((err,data)=>{
                                     //console.log(data)
                                      data.forEach((data)=>{
                                      var color;
                                 if(data._id=='leaking sewage'){
                                  color='pink'
                                 }else if(data._id=='garbage'){
                                  color='yellow'
                                 }else if(data._id=='unsafe construction'){
                                  color='blue'
                                 }else if(data._id=='potholes'){
                                  color='black'
                                 }else if(data._id=='leaking gas'){
                                  color='orange'
                                 }else if(data._id=='leaking water'){
                                  color='aqua'
                                 }else if(data._id=='riparian building'){
                                  color='purple'
                                 }else if(data._id=='crime'){
                                  color='red'
                                 }else if(data._id=='any other'){
                                  color='brown'
                                 }
                                 data.color =color;
                                 
                                    });
                                     response['polar'] = data;
                                      cb(response);
                                     //console.log(response)
                                     
                                    //  
                                 });
         };
       // console.log('fetch chart data request recieved')
       
     });
     socket.on('fetch notifications',(data,cb)=>{
     // console.log('message request received from '+socket.request.user._id)
      var id = socket.request.user._id +'';
      // console.log(id)
       Messages.aggregate([ { $match : {'participants.to':id  } } ,
                            	{
                            	 "$group" : {_id:"$conversationId", count:{$sum:1}}
                            	},
                            	{
                            	   $sort:{"count":-1}
                            	},
                            	{$limit : 10}
                            	]).exec((err,data)=>{
                                     // console.log(data)
                                     
                                      cb(data);
                                     //console.log(response)
                                     
                                    //  
                                 });
      
      
     });
     //Multiple report locations
    socket.on('fetch-report-locations',(data,cb)=>{
    // var ref_id= data.substring(11,34)
    // //console.log(ref_id)
    // Report.findOne({ref_id:ref_id},(err,report)=>{
    //  //console.log(report.coordinates);
    //  var arr = report.coordinates.split(',')

    //  var cbData ={
    //   'lat':arr[0],
    //   'long':arr[1],
    //  }
    
    // })
          var query = {}
    if(socket.request.user.role=='admin'){
        var userCounty = socket.request.user.county;
      var query= {
          'location.county':userCounty
      } 
    }else if(socket.request.user.role=='govt-official'){
        if(socket.request.user.authority=='pipeline'){
            query={
                '$or': [ 
                    { 'type': 'leaking water' }, { 'type': 'leaking gas' } //also
                 ]  
            
                 }
        }else if(socket.request.user.authority=='nema'){
             query={
                '$or': [ 
                    { 'type': 'garbage' }, { 'type': 'leaking sewage' } 
                 ]  
            
                 }
        }else if(socket.request.user.authority=='ntsa'){
             query={
                '$or': [ 
                    { 'type': 'potholes' }, { 'type': '' } //also accidents
                 ]  
            
                 }
        }else if(socket.request.user.authority=='land_commission'){
             query={
                '$or': [ 
                    { 'type': 'riparian building' }, { 'type': 'unsafe construction' } //also c
                 ]  
            
                 }
        }else if(socket.request.user.authority=='police'){
             query={
                '$or': [ 
                    { 'type': 'crime' }, { 'type': '' } //aso accidents
                 ]  
            
                 }
        }
        
    }
    var locations =[]
      Report.find(query,{ type: 1, coordinates: 1, ref_id: 1 },(err,reports)=>{
       //console.log(reports)
       reports.forEach((report,i)=>{
          var singleReport =[]
          var arr = report.coordinates.split(',')
          var lat = parseFloat(arr[0]);
          var long = parseFloat(arr[1]);
          var num =reports.length -i;
          singleReport.push(report.type);
          singleReport.push(lat);
          singleReport.push(long);
          singleReport.push(num);
         
          var color;
          if(report.type=='leaking sewage'){
           color='pink'
          }else if(report.type=='garbage'){
           color='yellow'
          }else if(report.type=='unsafe construction'){
           color='blue'
          }else if(report.type=='potholes'){
           color='black'
          }else if(report.type=='leaking gas'){
           color='orange'
          }else if(report.type=='leaking water'){
           color='aqua'
          }else if(report.type=='riparian building'){
           color='purple'
          }else if(report.type=='crime'){
           color='red'
          }else if(report.type=='any other'){
           color='brown'
          }
          singleReport.push(color);
          //console.log("push" + i);
           singleReport.push(report.ref_id);
          locations.push(singleReport);
          if(i==reports.length-1){
             cb(locations)
          }
       })
          
         
        });
      
    });
    
     //On fetch single report location
    socket.on('fetch-location',(data,cb)=>{
    var ref_id= data.substring(11,34)
    //console.log(ref_id)
    Report.findOne({ref_id:ref_id},(err,report)=>{
     //console.log(report.coordinates);
     var arr = report.coordinates.split(',')
    var color;if(report.type=='leaking sewage'){ color='pink'}else if(report.type=='garbage'){color='yellow'}else if(report.type=='unsafe construction'){ color='blue'}else if(report.type=='potholes'){color='black'
                         }else if(report.type=='leaking gas'){  color='orange' }else if(report.type=='leaking water'){color='aqua'}else if(report.type=='riparian building'){ color='purple'}else if(report.type=='crime'){ color='red'}else if(report.type=='any other'){color='brown' }
               
     var cbData ={
      'lat':arr[0],
      'long':arr[1],
      'color':color
     }
     cb(cbData)
    })
     
    });
    
    socket.on('disconnect', ()=>{
        //console.log('Client disconnected');
         if(socket.request.user.role=='admin'){
          socket.leave('adminRoom');
         
        }else{
          socket.leave('masterRoom');
           // var clients =io.sockets.adapter.rooms['masterRoom'].sockets
           // console.log(clients)
        }
    });
});

}