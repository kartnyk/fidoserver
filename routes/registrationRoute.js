const express = require('express')

const registrationRouter = express.Router()
const registartionController = require('../controller/registrationController')

registrationRouter.post('/generateRegistrationOptions/', registartionController.generateRegistrationOptions)
registrationRouter.post('/verifyRegistrationData/', registartionController.verifyRegistrationData)

module.exports = registrationRouter