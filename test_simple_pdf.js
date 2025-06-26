// Test simple pour vérifier pdf-lib
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

async function testPDFLib() {
  try {
    console.log('Testing pdf-lib...');
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    page.drawText('Hello World!', {
      x: 50,
      y: 700,
      size: 24,
      font: font,
      color: rgb(0, 0, 0)
    });
    
    const pdfBytes = await pdfDoc.save();
    console.log('PDF generated successfully, size:', pdfBytes.length);
    
    require('fs').writeFileSync('test-simple.pdf', pdfBytes);
    console.log('PDF saved as test-simple.pdf');
    
  } catch (error) {
    console.error('Error in pdf-lib test:', error);
  }
}

testPDFLib();
