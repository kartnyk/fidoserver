const express = require('express')

const registrationRouter = express.Router()
const registrationController = require('../controller/registrationController')

registrationRouter.post('/generateRegistrationOptions/', registrationController.generateRegistrationOptions)
registrationRouter.post('/verifyRegistrationData/', registrationController.verifyRegistrationData)

module.exports = registrationRouter