const express = require('express')
const users = require('./users.js')
const guilds = require('./guilds.js')
const api = express.Router()
const feeds = require('./guilds.feeds.js')
const filters = require('./guilds.feeds.filters.js')
const feedSubscriptions = require('./guilds.feeds.subscriptions.js')
const channels = require('./guilds.channels.js')
const statusCodes = require('../../constants/codes.js')

// All API routes tries to mirror Discord's own API routes

// Make sure the access token isn't expired for every route here, otherwise refresh it
api.use((req, res, next) => {
  if (!req.session.auth) return res.status(statusCodes['401'].code).json({ code: statusCodes['401'].code, message: statusCodes['401'].message })
  const accessTokenObject = req.app.get('oauth2').accessToken.create(req.session.auth)
  if (!accessTokenObject.expired()) return next()
  accessTokenObject.refresh()
    .then(result => {
      req.session.auth = result.token
      next()
    })
    .catch(next)
})

api.use('/users', users)
api.use('/guilds', guilds)
guilds.use('/:guildId/feeds', feeds)
guilds.use('/:guildId/channels', channels)
feeds.use('/:feedId/subscriptions', feedSubscriptions)
feeds.use('/:feedId/filters', filters)

// Handle PATCH, POST and DELETE mongoose results
api.use((req, res, next) => {
  if (req.method === 'PATCH' || req.method === 'POST' || req.method === 'PUT') {
    const result = req.patchResult || req.postResult || req.putResult
    if (!result) return next()
    if (result.ok !== 1) return res.status(500).json({ code: 500, message: statusCodes['500'].message })
    if (result.n === 0) return res.status(404).json({ code: 404, message: statusCodes['404'].message })
    if (result.upserted) return res.status(201).json(req.guildRss)
    else if (result.nModified !== 1) return res.status(304).json({ code: 304, message: statusCodes['304'].message })
    return res.json(req.guildRss)
  } else if (req.method === 'DELETE') {
    const { deleteResult } = req
    if (!deleteResult) return next()
    if (deleteResult.ok !== 1) return res.status(500).json({ code: 500, message: statusCodes['500'].message })
    if (deleteResult.n === 0) return res.status(404).json({ code: 404, message: statusCodes['404'].message })
    // nModified may also be available since the mongoose operation is sometimes "updateOne"
    if (deleteResult.nModified !== undefined && deleteResult.nModified !== 1) return res.status(304).json({ code: 304, message: statusCodes['304'].message })
    return res.status(204).end()
  } else return next()
})

// Handle API route errors
api.use((err, req, res, next) => {
  if (err.response) {
    // Axios errors for Discord API calls
    const status = err.response.status
    const data = err.response.data
    const message = data ? data.message ? data.message : data : statusCodes[status] ? statusCodes[status].message : err.response.statusText
    return res.status(status).json({ code: status, message, discord: true })
  } else {
    console.log(err)
    res.status(500).json({ code: 500, message: statusCodes['500'].message })
  }
})

module.exports = api
