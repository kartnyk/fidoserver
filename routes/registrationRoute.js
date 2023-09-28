const express = require('express')

const registrationRouter = express.Router()
const registartionController = require('../controller/registrationController')

registrationRouter.post('/generateRegistrationOptions/', registartionController.generateRegistrationOptions)

module.exports = registrationRouter