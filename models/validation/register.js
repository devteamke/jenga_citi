const Joi = require('joi')

module.exports = Joi.object().keys({
//username: Joi.string().trim().required().lowercase().options({ convert: false}).error(new Error('Your username must be in lowercase !')), 
 fname: Joi.string().trim().required().error(new Error('Invalid First Name ')), 
 lname: Joi.string().trim().required().error(new Error('Invalid Last Name')), 
 email: Joi.string().email().lowercase().error(new Error('Invalid email')),

password: Joi.string().trim().required().regex(/^(?=.*[a-z])(?=.*[A-Z])/).error(new Error('Password is to weak. It must contain at least one uppercase and lowercase letter')),

});