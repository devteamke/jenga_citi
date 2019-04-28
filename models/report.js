var mongoose=require("mongoose");
var  passportLocalMongoose=require("passport-local-mongoose");
var dataTables = require('mongoose-datatables')   
var ReportSchema=new mongoose.Schema({
    name: {type:String,unique:false},
    username: {type:String,sparse: true},
    type:String,
    ref_id:{type:String,
        unique:true
    },
    status:{type:String,
    enum:['solved','escalated','reported'],
        default:'reported'
    },
    location:{
        county:  String,
      constituency:String },
    coordinates:String,
    comment:String,
    upvotes: {
        number:{type:Number,default:0},
        voters:[{type:String}] }, 
    downvotes: {
        number:{type:Number,default:0},
        voters:[{type:String}] },
   images: [{
            type: String
            }],
    
 
    isUrgent:{
        type:Boolean,
        default:false,
    },
    isNotify:{
        type:Boolean,
        default:false,
    },
    phone_number:String,
    video:String,
    createdAt:Number,
    reviewed:[
        {by:String},
        {action:String},
        {reason:String},
        {at:Number}
          ],
    voted:{type:Boolean,
         default:false,
         },
    voteType:{
        type:String,
        default:''
    }  
   
    
});
ReportSchema.plugin(dataTables,{
  formatter: {
    toPublic : function (report) {
        if(report.isUrgent==true){
           return  {  isUrgent:'Yes'}
        }else{
             return  {  isUrgent:'No'}
        }
     
        
      
    }
  }
  })
ReportSchema.plugin(passportLocalMongoose);

module.exports=mongoose.model("Report",ReportSchema);