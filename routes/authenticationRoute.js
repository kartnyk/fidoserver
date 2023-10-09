const express = require('express')

const authenticationRouter = express.Router()
const authenticationController = require('../controller/authenticationController')

authenticationRouter.post('/generateAuthenticationOptions/', authenticationController.generateAuthenticationOptions)
authenticationRouter.post('/verifyAuthenticationData/', authenticationController.verifyAuthenticationData)

module.exports = authenticationRouter