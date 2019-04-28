const mongoose=require("mongoose");
const passportLocalMongoose=require("passport-local-mongoose");
    
var MessageSchema=new mongoose.Schema({
    conversationId:{
        type:String,
       
    },
    body:{
        type:String,
       
    },
    participants:{
        from:String,
        to:String
    },
    status:{
        type:String,
         enum:['read','unread'],
         default:'unread',
    }
});



module.exports=mongoose.model("Message",MessageSchema);