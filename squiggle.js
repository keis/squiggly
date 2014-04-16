var fs = require('fs'),
    esprima = require('esprima'),
    escodegen = require('escodegen'),
    uglify = require('uglifyjs'),
    _ = require('underscore');

function findScope(tree, key) {
    var q = [],
        scope,
        info,
        node;

    function push(node) {
        q.push({node: node, scope: scope});
    }

    push(tree);

    while (info = q.pop()) {
        node = info.node;
        if (key(node)) {
            return info.scope;
        }

        if (node.type == 'BlockStatement') {
            scope = node;
        }

        if (node.expression) {
            push(node.expression);
        }

        if (node.body) {
            node.body.forEach ? node.body.forEach(push) : push(node.body);
        }

        if (node.callee) {
            node.arguments.forEach(push);
            push(node.callee);
        }

        if (node.object) {
            push(node.object);
        }
    }
}

function assignment(node, nval) {
    var i,
        d;

    if (node.type === 'ExpressionStatement' && node.expression.type === 'AssignmentExpression') {
        return node.expression = (nval || node.expression);
    }

    if (node.type === 'VariableDeclaration') {
        for (i = 0; i < node.declarations.length; i++) {
            d = node.declarations[i];
            if (d.init && d.init.type === 'AssignmentExpression') {
                return d.init = (nval || d.init);
            }
        }
    }
    return null;
}

function exported(node) {
    var exported = [],
        right,
        exp;

    if (exp = assignment(node)) {
        exported.push(exp.left);
        right = exp.right;

        while (right && right.type == 'AssignmentExpression') {
            exported.push(right.left);
            right = right.right;
        }

        return exported;
    }
    return false;
}

function unassign(node, keep) {
    var curr = assignment(node),
        latest;

    if (!curr) {
        return true;
    }

    while (curr && curr.type == 'AssignmentExpression') {
        if (keep(curr)) {
            latest = curr;
        } else if (latest) {
            latest.right = curr.right;
        } else {
            assignment(node, curr.right);
        }
        curr = curr.right;
    }

    return node.type === 'VariableDeclaration' || assignment(node);
}

function pruneExportedFunctions (body, options) {
    var newBody = [],
        wanted = options.wanted;

    body.forEach(function (node) {
        var keep = unassign(node, function (node) {
            var name = node.left.property.name;
            return ~wanted.indexOf(name);
        });

        if (exps = exported(node)) {
            console.error('exported ' + exps.map(function (f) { return f.property.name }).join(', '));
        }

        if (keep) {
            newBody.push(node);
        }
    });

    return newBody;
}

function noGlobalExport(body, options) {
    return body.filter(function (node) {
        return !(node.type === 'IfStatement' &&
                 node.test.left &&
                 node.test.left.argument &&
                 node.test.left.argument.name === 'exports')
    });
}

function noOOP(body, options) {
    var oop = false;
    return body.filter(function (node) {
        if (oop) {
            return (oop++ > 4)
        }
        return !(oop = node.declarations && node.declarations[0].id.name === 'result')
    });
}

function squiggle(file, options) {
    var transforms = [],
        patch = [],
        tag;

    _.defaults(options, {wanted: []});
    options.wanted.push('VERSION');

    if (options['disable-oop']) {
        patch.push('disable-oop');
        transforms.push(noOOP);
    }

    if (options['disable-oop']) {
        patch.push('no-global');
        transforms.push(noGlobalExport);
    }

    transforms.push(pruneExportedFunctions);

    tag = 'squiggle ' +
          'patches= ' + patch + ' ' +
          'functions= ' + options.wanted;

    fs.readFile(file, function (err, data) {
        var tree,
            main,
            out;

        if (err) {
            return console.error(err);
        }

        tree = esprima.parse(data);
        main = findScope(tree, function (node) {
            var i;
            if (node.type === 'VariableDeclaration') {
                for (i = 0; i < node.declarations.length; i++) {
                    d = node.declarations[i];
                    if (d.id.name == '_') {
                        return true;
                    }
                }
            }
            return false;
        });

        main.body = _.reduce(transforms, function (body, phase) {
            return phase(body, options);
        }, main.body);

        // TODO: Avoid parsing again. uglify2 supports converting from esprima AST
        out = uglify.minify(escodegen.generate(tree), {
            fromString: true,
            compress: true,
            mangle: false,
            warnings: true,
            output: { beautify: true }
        });

        console.log('/*' + tag + '\n*/')
        console.log(out['code']);
    });
}

require.main === module && (function main() {
    var options = {},
        yargs,
        argv,
        source,
        options;

    yargs = require('yargs')
        .usage('$0 [options] sourcefile [function]...')
        .describe('disable-oop', 'exclude oo wrapper')
        .describe('no-global', "don't expose _ on global namespace");

    argv = yargs.argv;

    if (argv.help) {
        yargs.showHelp();
        return;
    }

    options.wanted = argv._.slice(1);
    _.extend(options, _.pick(argv, ['disable-oop', 'no-global']));

    squiggle(argv._[0], options);
}());
