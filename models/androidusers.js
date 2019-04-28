var mongoose=require("mongoose");
var  passportLocalMongoose=require("passport-local-mongoose");
    
var AndroidUserSchema=new mongoose.Schema({
    username: String,
    fname:String,
    lname:String,
    profilepic:String,
    county:{type:String,enum:['Mombasa','Kwale','Kilifi','Tana River','Lamu','Taita-Taveta','Garissa','Wajir','Mandera','Marsabit','Isiolo','Meru','Tharaka-Nithi','Embu','Kitui','Machakos','Makueni','Nyandarua','Nyeri','Kirinyaga','Muranga','Kiambu','Turkana','West Pokot','Samburu','Trans-Nzoia','Uasin Gishu','Elgeyo-Marakwet','Nandi','Baringo','Laikipia','Nakuru','Narok','Kajiado','Kericho','Bomet','Kakamega','Vihiga','Bungoma','Busia','Siaya','Kisumu','Homa Bay','Migori','Kisii','Nyamira','Nairobi']},
    verifyToken :{type:String,unique:true},
    verifyExpires:Date,
    resetPasswordToken:{type:String,unique:true},
    resetPasswordExpires:String,
    
    isActive:{
        type:Boolean,
        default:false,
    },
    age:Number,
    createdAt:Number
    
});

AndroidUserSchema.plugin(passportLocalMongoose);

module.exports=mongoose.model("AndroidUser",AndroidUserSchema);