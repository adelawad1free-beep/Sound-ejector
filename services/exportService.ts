
import { jsPDF } from 'jspdf';

export const exportToText = (text: string, fileName: string) => {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName || 'transcription'}.txt`;
  link.click();
  URL.revokeObjectURL(url);
};

export const exportToPDF = (text: string, fileName: string) => {
  const doc = new jsPDF();
  
  // Note: Standard jsPDF has limited RTL support without custom fonts.
  // In a real production app, we would load a font like Tajawal.
  // For this demo, we'll provide the content in a structured way.
  doc.text("تفريغ صوتي من منصة مدون", 105, 10, { align: 'center' });
  const splitText = doc.splitTextToSize(text, 180);
  doc.text(splitText, 190, 20, { align: 'right' });
  doc.save(`${fileName || 'transcription'}.pdf`);
};

export const exportToWord = (text: string, fileName: string) => {
  const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' 
        xmlns:w='urn:schemas-microsoft-com:office:word' 
        xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>Export Word</title>
        <style>
        body { font-family: 'Arial', sans-serif; direction: rtl; }
        </style>
        </head><body>`;
  const footer = "</body></html>";
  const sourceHTML = header + text.replace(/\n/g, '<br>') + footer;
  
  const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
  const fileDownload = document.createElement("a");
  document.body.appendChild(fileDownload);
  fileDownload.href = source;
  fileDownload.download = `${fileName || 'transcription'}.doc`;
  fileDownload.click();
  document.body.removeChild(fileDownload);
};
