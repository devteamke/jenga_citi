const mongoose=require("mongoose");

    
var NotificationSchema=new mongoose.Schema({
   
    body:{
        type:String,
       
    },
    type:{
          type:String,
          enum:['new_report','new_admin'],
         default:'new_report',
    },
    ref_id:String,
    status:{
        type:String,
         enum:['read','unread'],
         default:'unread',
    }
},{ timestamps: true });

NotificationSchema.methods.toJSON = function() {
  return {
    _id: this._id,
    body:this.body,
    type:this.type,
    status:this.status,
   
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    
  };
};

module.exports=mongoose.model("Notification",NotificationSchema);