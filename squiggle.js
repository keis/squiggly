var fs = require('fs'),
    esprima = require('esprima'),
    escodegen = require('escodegen'),
    uglify = require('uglifyjs'),
    _ = require('underscore');

function findScope(tree, key) {
    var q = [],
        scope,
        node;

    function push(node) {
        node.scope = scope;
        q.push(node);
    }

    push(tree);

    while (node = q.pop()) {
        if (key(node)) {
            return node.scope;
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
        return;
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
}

function squiggle(file, wanted) {
    wanted.push('VERSION');

    fs.readFile(file, function (err, data) {
        var tree,
            main,
            newBody,
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

        newBody = [];
        main.body.forEach(function (node) {
            unassign(node, function (node) {
                var name = node.left.property.name;
                return ~wanted.indexOf(name);
            });

            if (exps = exported(node)) {
                console.error('exported ' + exps.map(function (f) { return f.property.name }).join(', '));
            }

            newBody.push(node);
        });
        main.body = newBody;

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

squiggle(process.argv[2], process.argv.slice(3));
