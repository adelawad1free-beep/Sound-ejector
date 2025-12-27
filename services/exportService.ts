
import { jsPDF } from 'jspdf';

export const exportToText = (text: string, fileName: string) => {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName || 'تفريغ_صوتي'}.txt`;
  link.click();
  URL.revokeObjectURL(url);
};

export const exportToPDF = (text: string, fileName: string) => {
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4',
  });
  
  // Note: For full Arabic support in jsPDF, one would normally embed a font.
  // Here we use standard settings and a professional header.
  doc.setFontSize(22);
  doc.text("تقرير تفريغ صوتي - منصة مدون", 105, 20, { align: 'center' });
  
  doc.setFontSize(12);
  const margin = 20;
  const width = 170;
  const splitText = doc.splitTextToSize(text, width);
  
  doc.text(splitText, 190, 40, { align: 'right' });
  doc.save(`${fileName || 'تفريغ_مدون'}.pdf`);
};

export const exportToWord = (text: string, fileName: string) => {
  const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' 
        xmlns:w='urn:schemas-microsoft-com:office:word' 
        xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>تفريغ صوتي من مدون</title>
        <style>
        body { font-family: 'Arial', sans-serif; direction: rtl; text-align: right; }
        .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: 20px; color: #1e3a8a; }
        </style>
        </head><body>
        <div class="header"><h1>منصة مدون للتفريغ الصوتي</h1></div>
        <p>${text.replace(/\n/g, '<br>')}</p>
        </body></html>`;
  
  const blob = new Blob([header], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileName || 'تفريغ_مدون'}.doc`;
  link.click();
  URL.revokeObjectURL(url);
};
