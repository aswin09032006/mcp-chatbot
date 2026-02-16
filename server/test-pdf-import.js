const { PDFParse } = require('pdf-parse');

console.log('PDFParse imported successfully:', typeof PDFParse);

try {
    const parser = new PDFParse({ data: Buffer.from('dummy pdf content') });
    console.log('PDFParse instantiated successfully');
    // We expect getText to fail on dummy content, but we want to see if it's a function
    console.log('parser.getText is a function:', typeof parser.getText === 'function');
    console.log('parser.destroy is a function:', typeof parser.destroy === 'function');
} catch (e) {
    console.error('Error instantiating PDFParse:', e);
}
