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
        if (node.type === 'IfStatement' && node.test.left && node.test.left.argument.name === 'exports') {
            return false;
        }
        return true;
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
    var transforms = [];

    _.defaults(options, {wanted: [], patch: []});
    options.wanted.push('VERSION');

    ~options.patch.indexOf('disable-oop') && transforms.push(noOOP);
    ~options.patch.indexOf('no-global') && transforms.push(noGlobalExport);
    transforms.push(pruneExportedFunctions);

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

        console.log(out['code']);
    });
}

require.main === module && (function main() {
    var options = {},
        argv,
        source,
        options;

    argv = require('optimist')
        .usage('$0 [options] sourcefile [function]...')
        .demand(1)
        .alias('p', 'patch')
        .argv;

    options.wanted = argv._.slice(1);
    if (argv.patch) {
        options.patch = typeof argv.patch === 'string' ? [argv.patch] : argv.patch;
    }

    squiggle(argv._[0], options);
}());
