fs = require 'fs'
path = require 'path'
_ = require 'underscore'
squiggle = require '../../squiggle'

extractOptions = (path, callback) ->
    fs.readFile path, 'utf-8', (err, data) ->
        return callback err if err

        header = data.match /squiggle patches= ([a-z,()/-]*) functions= ([a-zA-Z,]*)/
        version = data.match(/_.VERSION = "([^"]*)"/)[1]
        patches = header[1].split ','
        wanted = header[2].split ','

        opts = {wanted, version}
        for p in patches
            m = p.match /([a-z-]+)(?:\(([a-z/]+)\))?/
            opts[m[1]] = m[2] or true

        callback null, opts, data


readStream = (stream, callback) ->
    buf = ''
    stream.on 'data', (data) ->
        buf += data.toString()
    stream.on 'end', ->
        callback null, buf


describe "squiggly", ->
    dir = process.cwd() + '/test/data/ref/'
    files = fs.readdirSync dir

    _.each files, (file) ->
        describe file, ->
            it "matches the expected output", (done) ->
                p = path.join dir, file
                extractOptions p, (err, opts, reference) ->
                    return done err if err

                    src = process.cwd() + "/test/data/src/underscore-#{opts.version}.js"
                    stream = squiggle src, opts
                    readStream stream, (err, actual) ->
                        assert.equal actual, reference
                        done()
