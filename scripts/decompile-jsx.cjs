const fs = require('fs');
const recast = require('recast');
const parser = require('@babel/parser');
const t = require('@babel/types');

if (process.argv.length < 4) {
  console.error('Usage: node decompile-jsx.js <input-file> <output-file>');
  process.exit(1);
}

const inputFile = process.argv[2];
const outputFile = process.argv[3];

const code = fs.readFileSync(inputFile, 'utf8');

const ast = recast.parse(code, {
  parser: {
    parse(source) {
      return parser.parse(source, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
        tokens: true,
      });
    },
  },
});

const b = recast.types.builders;

recast.visit(ast, {
  visitCallExpression(path) {
    const node = path.node;
    if (
      t.isIdentifier(node.callee) &&
      (node.callee.name === '_jsx' || node.callee.name === '_jsxs')
    ) {
      const [tag, propsObj] = node.arguments;
      
      let jsxTag;
      if (t.isStringLiteral(tag)) {
        jsxTag = b.jsxIdentifier(tag.value);
      } else if (t.isIdentifier(tag)) {
        if (tag.name === '_Fragment') {
          jsxTag = b.jsxIdentifier('Fragment');
        } else {
          jsxTag = b.jsxIdentifier(tag.name);
        }
      } else if (t.isMemberExpression(tag)) {
          // Handle cases like React.Fragment if they exist
          jsxTag = b.jsxMemberExpression(
              b.jsxIdentifier(tag.object.name),
              b.jsxIdentifier(tag.property.name)
          );
      }

      const attributes = [];
      let children = [];

      if (t.isObjectExpression(propsObj)) {
        propsObj.properties.forEach(prop => {
          if (t.isObjectProperty(prop)) {
            const keyName = prop.key.name || prop.key.value;
            if (keyName === 'children') {
              if (t.isArrayExpression(prop.value)) {
                children = prop.value.elements.map(el => {
                  if (t.isJSXElement(el) || t.isJSXFragment(el)) return el;
                  if (t.isStringLiteral(el)) return b.jsxText(el.value);
                  if (t.isNullLiteral(el)) return null;
                  return b.jsxExpressionContainer(el);
                }).filter(Boolean);
              } else {
                if (t.isJSXElement(prop.value) || t.isJSXFragment(prop.value)) {
                  children = [prop.value];
                } else if (t.isStringLiteral(prop.value)) {
                  children = [b.jsxText(prop.value)];
                } else if (t.isNullLiteral(prop.value)) {
                  children = [];
                } else {
                  children = [b.jsxExpressionContainer(prop.value)];
                }
              }
            } else {
              let attrValue;
              if (t.isStringLiteral(prop.value)) {
                attrValue = prop.value;
              } else {
                attrValue = b.jsxExpressionContainer(prop.value);
              }
              attributes.push(b.jsxAttribute(b.jsxIdentifier(keyName), attrValue));
            }
          } else if (t.isSpreadElement(prop)) {
              attributes.push(b.jsxSpreadAttribute(prop.argument));
          }
        });
      }

      const opening = b.jsxOpeningElement(jsxTag, attributes);
      opening.selfClosing = children.length === 0;
      const closing = children.length > 0 ? b.jsxClosingElement(jsxTag) : null;
      
      const jsxElement = b.jsxElement(opening, closing, children);
      path.replace(jsxElement);
    }
    this.traverse(path);
  }
});

// Remove the jsx-runtime import and add Fragment to react import if needed
let usesFragment = false;
recast.visit(ast, {
  visitIdentifier(path) {
      if (path.node.name === 'Fragment' && path.parentPath.node.type === 'JSXIdentifier') {
          usesFragment = true;
      }
      return false;
  }
});

recast.visit(ast, {
  visitImportDeclaration(path) {
    if (path.node.source && path.node.source.value === 'react/jsx-runtime') {
      path.prune();
    }
    if (path.node.source && path.node.source.value === 'react' && usesFragment) {
        const hasFragment = path.node.specifiers.some(s => s.imported && s.imported.name === 'Fragment');
        if (!hasFragment) {
            path.node.specifiers.push(b.importSpecifier(b.identifier('Fragment')));
        }
    }
    return false;
  }
});

// Merge imports from the same source
const importsBySource = {};
recast.visit(ast, {
  visitImportDeclaration(path) {
    if (!path.node.source) return false;
    const source = path.node.source.value;
    if (!importsBySource[source]) {
      importsBySource[source] = path;
    } else {
      const firstImport = importsBySource[source];
      path.node.specifiers.forEach(spec => {
        if (t.isImportSpecifier(spec)) {
            const alreadyExists = firstImport.node.specifiers.some(s => 
              t.isImportSpecifier(s) && s.imported.name === spec.imported.name
            );
            if (!alreadyExists) {
              firstImport.node.specifiers.push(spec);
            }
        } else if (t.isImportDefaultSpecifier(spec)) {
            const alreadyExists = firstImport.node.specifiers.some(s => t.isImportDefaultSpecifier(s));
            if (!alreadyExists) {
                firstImport.node.specifiers.push(spec);
            }
        }
      });
      path.prune();
    }
    return false;
  }
});

const output = recast.print(ast).code;
fs.writeFileSync(outputFile, output);
console.log(`Decompiled ${inputFile} to ${outputFile}`);
