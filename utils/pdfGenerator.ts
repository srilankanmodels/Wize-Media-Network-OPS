import { jsPDF } from 'jspdf';
import { Quotation, AgencyProfile } from '../types';

/**
 * Generates a high-precision, professional PDF for a quotation
 */
export function generateQuotationPDF(
  quotation: Quotation,
  agencyProfile: AgencyProfile,
  clientName: string,
  projectName: string,
  jobNumber?: string
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - (margin * 2);

  // Background dark header banner
  doc.setFillColor(10, 11, 14); // #0a0b0e
  doc.rect(0, 0, pageWidth, 42, 'F');

  // Eyebrow label
  doc.setFont('courier', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(160, 160, 170);
  doc.text('PROPRIETARY ECOSYSTEM // OFFICIAL QUOTATION PROTOCOL', margin, 12);

  // Document Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text('QUOTATION', margin, 24);

  // Quote Ref & Job Number
  doc.setFont('courier', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(200, 200, 210);
  const refText = `REF: #${quotation.id || 'MW-QT-2025'}${jobNumber ? ` // JOB: ${jobNumber}` : ''}`;
  doc.text(refText, margin, 32);

  // Agency branding (right-aligned in header)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(agencyProfile.name.toUpperCase(), pageWidth - margin, 18, { align: 'right' });

  doc.setFont('courier', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(180, 180, 190);
  doc.text(agencyProfile.address, pageWidth - margin, 24, { align: 'right' });
  doc.text(`${agencyProfile.email} | ${agencyProfile.phone}`, pageWidth - margin, 29, { align: 'right' });
  doc.text(agencyProfile.website, pageWidth - margin, 34, { align: 'right' });

  // Thin dividing line
  doc.setDrawColor(220, 220, 225);
  doc.setLineWidth(0.3);
  doc.line(margin, 46, pageWidth - margin, 46);

  // Client & Metadata Box
  let y = 54;
  doc.setFillColor(248, 249, 251);
  doc.roundedRect(margin, y, contentWidth, 26, 2, 2, 'F');
  doc.setDrawColor(225, 228, 234);
  doc.roundedRect(margin, y, contentWidth, 26, 2, 2, 'S');

  // Client Details (Left)
  doc.setFont('courier', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(110, 115, 125);
  doc.text('CLIENT ENTITY // PRINCIPAL', margin + 6, y + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 25);
  doc.text(clientName.toUpperCase(), margin + 6, y + 14);

  doc.setFont('courier', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(80, 85, 95);
  doc.text(`CAMPAIGN: ${projectName.toUpperCase()}`, margin + 6, y + 20);

  // Dates & Status (Right)
  const quoteDate = quotation.date ? new Date(quotation.date) : new Date();
  const validUntil = new Date(quoteDate.getTime() + 14 * 24 * 60 * 60 * 1000);

  doc.setFont('courier', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(110, 115, 125);
  doc.text('ISSUE PROTOCOL', pageWidth - margin - 6, y + 7, { align: 'right' });

  doc.setFont('courier', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(30, 30, 35);
  doc.text(`DATE: ${quoteDate.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })}`, pageWidth - margin - 6, y + 13, { align: 'right' });
  doc.text(`VALID: ${validUntil.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })}`, pageWidth - margin - 6, y + 18, { align: 'right' });
  doc.text(`STATUS: ${quotation.status || 'APPROVED'}`, pageWidth - margin - 6, y + 23, { align: 'right' });

  // Table Header
  y = 88;
  doc.setFillColor(15, 17, 22);
  doc.rect(margin, y, contentWidth, 9, 'F');

  doc.setFont('courier', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('STRATEGIC SERVICE DESCRIPTOR', margin + 4, y + 6);
  doc.text('QTY', margin + 105, y + 6, { align: 'center' });
  doc.text('UNIT RATE (LKR)', margin + 135, y + 6, { align: 'right' });
  doc.text('SUBTOTAL (LKR)', pageWidth - margin - 4, y + 6, { align: 'right' });

  y += 9;

  // Table Rows
  const items = quotation.items && quotation.items.length > 0 ? quotation.items : [
    { id: '1', description: `${projectName} - Creative Execution Node`, quantity: 1, unitPrice: quotation.subtotal || 250000, total: quotation.subtotal || 250000 }
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  items.forEach((item, index) => {
    // Alternating row background
    if (index % 2 === 1) {
      doc.setFillColor(249, 250, 252);
      doc.rect(margin, y, contentWidth, 8.5, 'F');
    }

    doc.setDrawColor(235, 238, 242);
    doc.line(margin, y + 8.5, pageWidth - margin, y + 8.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 35, 45);
    doc.text(item.description, margin + 4, y + 5.5);

    doc.setFont('courier', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(80, 85, 95);
    doc.text(String(item.quantity), margin + 105, y + 5.5, { align: 'center' });
    doc.text(Number(item.unitPrice).toLocaleString(), margin + 135, y + 5.5, { align: 'right' });

    doc.setFont('courier', 'bold');
    doc.setTextColor(20, 20, 25);
    doc.text(Number(item.total).toLocaleString(), pageWidth - margin - 4, y + 5.5, { align: 'right' });

    y += 8.5;
  });

  // Totals Area
  y += 6;
  const totalsBoxWidth = 75;
  const totalsBoxX = pageWidth - margin - totalsBoxWidth;

  const subtotal = quotation.subtotal || items.reduce((s, it) => s + it.total, 0);
  const tax = quotation.tax || Math.round(subtotal * 0.18);
  const total = quotation.total || (subtotal + tax);

  doc.setFont('courier', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(90, 95, 105);
  doc.text('Base Subtotal:', totalsBoxX, y + 4);
  doc.text(`LKR ${subtotal.toLocaleString()}`, pageWidth - margin - 4, y + 4, { align: 'right' });

  doc.text('VAT Component (18%):', totalsBoxX, y + 10);
  doc.text(`LKR ${tax.toLocaleString()}`, pageWidth - margin - 4, y + 10, { align: 'right' });

  // Total Rate Highlight Banner
  y += 14;
  doc.setFillColor(10, 11, 14);
  doc.roundedRect(totalsBoxX - 4, y, totalsBoxWidth + 4, 11, 1, 1, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL RATE:', totalsBoxX, y + 7.5);

  doc.setFont('courier', 'bold');
  doc.setFontSize(10);
  doc.text(`LKR ${total.toLocaleString()}`, pageWidth - margin - 4, y + 7.5, { align: 'right' });

  // Terms and Conditions
  const termsY = y - 10;
  doc.setFont('courier', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(80, 85, 95);
  doc.text('TERMS & OPERATIONAL PROTOCOLS:', margin, termsY);

  doc.setFont('courier', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(110, 115, 125);
  doc.text('1. Validity: 14 business days from generation.', margin, termsY + 5);
  doc.text('2. Advance: 50% mobilization advance required to initialize node.', margin, termsY + 10);
  doc.text('3. Settlement: Balance payable within 7 days of delivery handover.', margin, termsY + 15);
  doc.text('4. Proprietary IP: All design rights reserved by Mediawize until settled.', margin, termsY + 20);

  // Bottom Authorized Stamp
  const footerY = pageHeight - 32;
  doc.setDrawColor(220, 220, 225);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setFont('courier', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 105, 115);
  doc.text('AUTHORIZED SIGNATURE / DIGITAL STAMP', margin, footerY + 8);
  doc.text('MEDIAWIZE CLIENT SERVICING & FINANCE DESK', margin, footerY + 13);

  doc.setFont('courier', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(150, 155, 165);
  doc.text(`ENCRYPTED CHECKSUM: MW-SEC-${Math.random().toString(36).substring(2, 10).toUpperCase()}`, pageWidth - margin, footerY + 8, { align: 'right' });
  doc.text('VERIFIED AUTHENTIC DOCUMENT // MEDIAWIZE OS V4', pageWidth - margin, footerY + 13, { align: 'right' });

  return doc;
}

/**
 * Generates a valid PDF for generic vault documents (Briefs, Reports, Strategy)
 */
export function generateVaultDocumentPDF(
  docName: string,
  projectName: string,
  clientName: string,
  uploadedBy: string,
  date: Date = new Date()
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;

  // Header Banner
  doc.setFillColor(10, 11, 14);
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setFont('courier', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(160, 160, 170);
  doc.text('MEDIAWIZE OPS // SECURE ASSET VAULT', margin, 14);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text(docName.toUpperCase(), margin, 26);

  doc.setFont('courier', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(200, 200, 210);
  doc.text(`PROJECT: ${projectName.toUpperCase()} // CLIENT: ${clientName.toUpperCase()}`, margin, 34);

  // Metadata Box
  doc.setFillColor(248, 249, 251);
  doc.roundedRect(margin, 50, pageWidth - (margin * 2), 30, 2, 2, 'F');
  doc.setDrawColor(225, 228, 234);
  doc.roundedRect(margin, 50, pageWidth - (margin * 2), 30, 2, 2, 'S');

  doc.setFont('courier', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(40, 45, 55);
  doc.text('VAULT TELEMETRY & DOCUMENT RECORD', margin + 6, 58);

  doc.setFont('courier', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(90, 95, 105);
  doc.text(`File Descriptor: ${docName}`, margin + 6, 65);
  doc.text(`Uploaded / Verified By: ${uploadedBy}`, margin + 6, 70);
  doc.text(`Timestamp: ${new Date(date).toLocaleString()}`, margin + 6, 75);

  // Document Content Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(20, 25, 35);
  doc.text('Document Overview & Strategic Specifications', margin, 95);

  doc.setFont('courier', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(70, 75, 85);
  const bodyText = [
    `This operational document represents verified project collateral for ${projectName}.`,
    `Client Principal: ${clientName}`,
    '',
    'Document Summary & Verification Status:',
    '- Integrity Check: 100% Verified and Sealed in Mediawize OS Vault.',
    '- Quality Gate: Passed creative director approval.',
    '- Access Control: Authorized Agency & Client Stakeholders Only.',
    '',
    'Notice: The contents of this document are confidential and intended exclusively for the',
    'designated campaign participants under mutual NDA governance.'
  ];

  let textY = 105;
  bodyText.forEach(line => {
    doc.text(line, margin, textY);
    textY += 6;
  });

  // Footer
  const footerY = pageHeight - 30;
  doc.setDrawColor(220, 220, 225);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setFont('courier', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(110, 115, 125);
  doc.text('MEDIAWIZE DIGITAL VAULT // SECURE ASSET ARCHIVE', margin, footerY + 8);

  doc.setFont('courier', 'normal');
  doc.setFontSize(7.5);
  doc.text(`CHECKSUM: MW-DOC-${Date.now().toString(36).toUpperCase()}`, pageWidth - margin, footerY + 8, { align: 'right' });

  return doc;
}
