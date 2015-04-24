var fs = require('fs')
  , Readable = require('stream').Readable
  , esprima = require('esprima')
  , escodegen = require('escodegen')
  , uglify = require('uglifyjs')
  , _ = require('underscore')

module.exports = squiggle

// Perform a breadth-first search over the AST while keeping track of the
// containing scope until the filter function `key` returns true. The scope is
// returned.
function findScope(tree, key) {
  var q = []
    , scope
    , info
    , node

  // Queue node for processing.
  function push(node) {
    q.push({node: node, scope: scope})
  }

  push(tree)

  while ((info = q.pop())) {
    node = info.node
    scope = info.scope

    // Stop processing and return the scope if this is the wanted node.
    if (key(node)) {
      return scope
    }

    // Add child nodes to visit from select attributes of this node, if the
    // current node is a block it will be used as the scope for the child
    // nodes otherwise the scope is inherited from the parent.

    if (node.type === 'BlockStatement') {
      scope = node
    }

    if (node.expression) {
      push(node.expression)
    }

    if (node.body) {
      if (node.body.forEach) {
        node.body.forEach(push)
      } else {
        push(node.body)
      }
    }

    if (node.callee) {
      node.arguments.forEach(push)
      push(node.callee)
    }

    if (node.object) {
      push(node.object)
    }
  }
}

// Read or update the right hand value of a node representing an assignment
// either as a plain expression or as a variable declaration with a
// initializer. If no 2nd argument is given the value is not modified.
function assignment(node, nval) {
  var i
    , d

  if (node.type === 'ExpressionStatement' &&
      node.expression.type === 'AssignmentExpression'
  ) {
    return node.expression = (nval || node.expression)
  }

  if (node.type === 'VariableDeclaration') {
    for (i = 0; i < node.declarations.length; i++) {
      d = node.declarations[i]
      if (d.init && d.init.type === 'AssignmentExpression') {
        return d.init = (nval || d.init)
      }
    }
  }

  return null
}

// Assemble a list of all names assigned to by the node. This method takes care
// of resolving chaining of the assignment operator like `foo = bar = 5`.
function exported(node) {
  var names = []
    , right
    , exp

  if ((exp = assignment(node))) {
    names.push(exp.left)
    right = exp.right

    while (right && right.type === 'AssignmentExpression') {
      names.push(right.left)
      right = right.right
    }

    return names
  }

  return null
}

// Prune all assigned names from node except those for which `keep` returns
// true.
function unassign(node, keep) {
  var curr = assignment(node)
    , latest

  if (!curr) {
    return true
  }

  // Walk the expression chain and prune assignments while making sure to
  // close the gap.
  while (curr && curr.type === 'AssignmentExpression') {
    if (keep(curr)) {
      latest = curr
    } else if (latest) {
      latest.right = curr.right
    } else {
      assignment(node, curr.right)
    }
    curr = curr.right
  }

  // Return truthy if there is anything left of the node.
  return node.type === 'VariableDeclaration' || assignment(node)
}

// Filter the values exported by `body` to only include those from the
// `options.wanted` list.
function pruneExportedFunctions (body, options) {
  var newBody = []
    , wanted = options.wanted

  function keep(node) {
    return ~wanted.indexOf(node.left.property.name)
  }

  function name(exp) {
    return exp.property.name
  }

  body.forEach(function (node) {
    var keepNode = unassign(node, keep)
      , exps

    if ((exps = exported(node))) {
      console.error('exported ' + exps.map(name).join(', '))
    }

    if (keepNode) {
      newBody.push(node)
    }
  })

  return newBody
}

// Remove the assignment of `_` on the root object from the body.
function noGlobalExport(body /*, options*/) {
  return body.filter(function (node) {
    return !(node.type === 'IfStatement' &&
         node.test.left &&
         node.test.left.argument &&
         node.test.left.argument.name === 'exports')
  })
}

// Remove the OO wrapper from the body.
function noOOP(body /*, options*/) {
  var oop = false
  return body.filter(function (node) {
    if (oop) {
      return (oop++ > 4)
    }
    return !(oop = node.declarations &&
             node.declarations[0].id.name === 'result')
  })
}

// Find the AMD define call and change the name.
function rename(body, options) {
  var name = options.rename

  function isAmdBlock(node) {
    return (node.type === 'IfStatement' &&
      node.test.left && node.test.left.type === 'BinaryExpression' &&
      node.test.left.left.operator === 'typeof' &&
      node.test.left.left.argument.name === 'define')
  }

  body.forEach(function (node) {
    var expr

    if (isAmdBlock(node)) {
      expr = node.consequent.body[0].expression
      if (expr.callee.name !== 'define') {
        return
      }
      expr.arguments[0].value = name
    }
  })

  return body
}

function squiggle(file, options) {
  var transforms = []
    , patch = []
    , stream
    , tag

  _.defaults(options, {wanted: []})

  if (options['disable-oop']) {
    patch.push('disable-oop')
    transforms.push(noOOP)
  }

  if (options['no-global']) {
    patch.push('no-global')
    transforms.push(noGlobalExport)
  }

  if (options.rename) {
    patch.push('rename(' + options.rename + ')')
    transforms.push(rename)
  }

  transforms.push(pruneExportedFunctions)

  tag = 'squiggle ' +
      'patches= ' + patch + ' ' +
      'functions= ' + options.wanted

  options.wanted.push('VERSION')

  stream = new Readable()
  stream._read = function () {}

  fs.readFile(file, function (err, data) {
    var tree
      , main
      , out

    if (err) {
      return console.error(err)
    }

    tree = esprima.parse(data)
    main = findScope(tree, function (node) {
      var i
        , d

      if (node.type === 'VariableDeclaration') {
        for (i = 0; i < node.declarations.length; i++) {
          d = node.declarations[i]
          if (d.id.name === '_') {
            return true
          }
        }
      }
      return false
    })

    main.body = _.reduce(transforms, function (body, phase) {
      return phase(body, options)
    }, main.body)

    // TODO: Avoid parsing again. uglify2 supports converting from esprima AST
    out = uglify.minify(
      escodegen.generate(tree),
      { fromString: true
      , compress: true
      , mangle: false
      , warnings: true
      , output: { beautify: true }
      })

    stream.push('/*' + tag + '\n*/\n')
    stream.push(out.code)
    stream.push('\n')
    stream.push(null)
  })

  return stream
}

function main() {
  var options = {}
    , yargs
    , argv

  yargs = require('yargs')
    .demand(1)
    .usage('$0 [options] sourcefile [function]...')
    .describe('rename', 'change name module is exposed as with amd')
    .describe('disable-oop', 'exclude oo wrapper')
    .describe('no-global', "don't expose _ on global namespace")

  argv = yargs.argv

  if (argv.help) {
    yargs.showHelp()
    return
  }

  options.wanted = argv._.slice(1)
  _.extend(options, _.pick(argv, ['disable-oop', 'rename']))
  if (argv.global === false) {
    options['no-global'] = true
  }

  squiggle(argv._[0], options).pipe(process.stdout)
}

if (require.main === module) {
  main()
}
