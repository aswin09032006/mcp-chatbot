const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

console.log('--- Testing pdf-parse ---');
const pdf = pdfParse.default || pdfParse;
console.log('Type of pdf:', typeof pdf);

try {
    // Create a dummy PDF buffer (minimal PDF structure)
    const dummyPdfBuffer = Buffer.from('%PDF-1.0\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 3 3]>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000010 00000 n\n0000000060 00000 n\n0000000117 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n173\n%%EOF');

    console.log('Attempting to parse dummy PDF...');
    pdf(dummyPdfBuffer).then(data => {
        console.log('PDF Parse Success!');
        console.log('Parsed text:', data.text);
    }).catch(err => {
        console.error('PDF Parse Failed:', err.message);
    });
} catch (e) {
    console.error('PDF Parse Immediate Error:', e);
}

console.log('\n--- Testing mammoth ---');
console.log('Type of mammoth:', typeof mammoth);
console.log('mammoth.extractRawText:', typeof mammoth.extractRawText);

try {
    // Create a dummy Docx buffer is too complex, checking function existence is usually enough for import check
    if (typeof mammoth.extractRawText === 'function') {
        console.log('mammoth.extractRawText is a function. Import looks good.');
    } else {
        console.error('mammoth.extractRawText is NOT a function!');
    }
} catch (e) {
    console.error('Mammoth Check Error:', e);
}
