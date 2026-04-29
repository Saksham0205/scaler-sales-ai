const fs = require('fs');

const b64 = fs.readFileSync('b64.txt', 'utf8');
let pdfCode = fs.readFileSync('lib/pdf.ts', 'utf8');

pdfCode = pdfCode.replace(
  /const logoBase64 = 'data:image\/jpeg;base64,[^']+';/,
  `const logoBase64 = 'data:image/jpeg;base64,${b64}';`
);

fs.writeFileSync('lib/pdf.ts', pdfCode);
console.log('Fixed base64 in lib/pdf.ts');