var mongoose=require("mongoose");
var  passportLocalMongoose=require("passport-local-mongoose");
    
var UserSchema=new mongoose.Schema({
    username: String,
    fname:String,
    lname:String,
    email:{type:String,unique:true},
    role:{type:String,
        enum:['admin','master-admin','Supervisor','govt-official'],
         default:'admin',
        },
    authority:{type:String,enum:['pipeline','nema','land_commission','ntsa','police','nairobi_water']},
    county:{type:String,enum:['Mombasa','Kwale','Kilifi','Tana River','Lamu','Taita-Taveta','Garissa','Wajir','Mandera','Marsabit','Isiolo','Meru','Tharaka-Nithi','Embu','Kitui','Machakos','Makueni','Nyandarua','Nyeri','Kirinyaga','Muranga','Kiambu','Turkana','West Pokot','Samburu','Trans-Nzoia','Uasin Gishu','Elgeyo-Marakwet','Nandi','Baringo','Laikipia','Nakuru','Narok','Kajiado','Kericho','Bomet','Kakamega','Vihiga','Bungoma','Busia','Siaya','Kisumu','Homa Bay','Migori','Kisii','Nyamira','Nairobi']},
    verifyToken :{type:String,unique:true},
    verifyExpires:Date,
    resetPasswordToken:String,
    resetPasswordExpires:String,
    isVerified:{
        type:Boolean,
        default:false,
    },
    isActive:{
        type:Boolean,
        default:false,
    },
    age:String,
    yearofBirth:String,
    yearOfHire:String,
    registeredBy:String,
    createdAt:Number
    
});

UserSchema.plugin(passportLocalMongoose);

module.exports=mongoose.model("User",UserSchema);