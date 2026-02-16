const pdf = require('pdf-parse');
console.log('Type of pdf:', typeof pdf);
console.log('pdf export:', pdf);

if (typeof pdf !== 'function') {
    if (pdf.default && typeof pdf.default === 'function') {
        console.log('pdf.default is a function');
    }
}
