import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as PDFDocument from 'pdfkit';
import { Readable } from 'stream';

interface QuotationItem {
  hsn: string;
  productName: string;
  pack: string;
  qty: number;
  batch: string;
  mfg: string;
  exp: string;
  mrp: number;
  rate: number;
  dis: number;
  sgst: number;
  sgstValue: number;
  cgst: number;
  cgstValue: number;
  amount: number;
}

interface QuotationData {
  invoiceNo: string;
  invoiceDate: string;
  orderNo: string;
  orderDate: string;
  lrDate: string;
  dueDate: string;
  partyName: string;
  partyAddress: string;
  partyPhone: string;
  partyGSTIN: string;
  partyDLNo: string;
  items: QuotationItem[];
  totalSGST: number;
  totalCGST: number;
  grandTotal: number;
  totalItems: number;
  totalQty: number;
}

@Injectable()
export class PdfService {
  constructor(private configService: ConfigService) {}

  async generateQuotationPDF(data: QuotationData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 30,
          bufferPages: true,
        });

        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });
        doc.on('error', reject);

        // Start building the PDF
        this.buildQuotationPDF(doc, data);
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private buildQuotationPDF(doc: PDFKit.PDFDocument, data: QuotationData) {
    const pageWidth = doc.page.width - 60; // Account for margins
    const leftMargin = 30;
    const rightMargin = doc.page.width - 30;
    let yPosition = 50;

    // Draw border around the entire document
    doc
      .rect(leftMargin, 30, pageWidth, doc.page.height - 60)
      .stroke('#000000');

    // Header Section - Company Info and Party Info
    yPosition = this.drawHeader(doc, data, leftMargin, yPosition, pageWidth);

    // Invoice Details Section
    yPosition = this.drawInvoiceDetails(
      doc,
      data,
      leftMargin,
      yPosition,
      pageWidth,
    );

    // Items Table
    yPosition = this.drawItemsTable(doc, data, leftMargin, yPosition, pageWidth);

    // GST Summary and Totals
    yPosition = this.drawGSTSummary(doc, data, leftMargin, yPosition, pageWidth);

    // Bank Details and Terms
    this.drawBankDetailsAndTerms(doc, data, leftMargin, yPosition, pageWidth);
  }

  private drawHeader(
    doc: PDFKit.PDFDocument,
    data: QuotationData,
    leftMargin: number,
    yPosition: number,
    pageWidth: number,
  ): number {
    const rightSectionX = leftMargin + pageWidth - 180; // Position from right edge

    // Left Section - Company Logo and Details
    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .fillColor('#1F2937')
      .text('24R', leftMargin + 10, yPosition);

    doc
      .fontSize(16)
      .fillColor('#1F2937')
      .text('x', leftMargin + 62, yPosition + 8);

    // Horizontal line under logo
    doc
      .moveTo(leftMargin + 10, yPosition + 35)
      .lineTo(leftMargin + 120, yPosition + 35)
      .lineWidth(2)
      .stroke('#1F2937');

    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#000000')
      .text('24RX MEDICAL ENTERPRISES', leftMargin + 10, yPosition + 45);

    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#000000')
      .text('2ND STREET CHURCH ROAD', leftMargin + 10, yPosition + 60)
      .text('KADRU, RANCHI', leftMargin + 10, yPosition + 72)
      .text('RANCHI-834001 (JHARKHAND)', leftMargin + 10, yPosition + 84)
      .text('Phone: 7004052004, 7070414040', leftMargin + 10, yPosition + 96)
      .text('D.L. No: JH-RNS-15350015301', leftMargin + 10, yPosition + 108)
      .text('GSTIN: 20GAKPK4400G1Z7', leftMargin + 10, yPosition + 120)
      .text('E-Mail: 24rxmedicalsupply@gmail.com', leftMargin + 10, yPosition + 132);

    // Top Right Section - QUOTATION/Proforma Invoice
    const quotationX = rightSectionX + 20;
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#000000')
      .text('QUOTATION', quotationX, yPosition + 5);

    doc
      .fontSize(9)
      .font('Helvetica-Oblique')
      .fillColor('#000000')
      .text('Proforma Invoice', quotationX + 5, yPosition + 23);

    // Party Name and Details
    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .fillColor('#000000')
      .text('Party Name', rightSectionX, yPosition + 45);

    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#000000')
      .text(data.partyName, rightSectionX, yPosition + 58, {
        width: 170,
        align: 'left',
      });

    doc
      .fontSize(7)
      .font('Helvetica')
      .text(data.partyAddress, rightSectionX, yPosition + 72, {
        width: 170,
        align: 'left',
      });

    if (data.partyPhone) {
      doc.text(`PHONE: ${data.partyPhone}`, rightSectionX, yPosition + 100);
    }
    if (data.partyGSTIN) {
      doc.text(`GSTIN: ${data.partyGSTIN}`, rightSectionX, yPosition + 112);
    }
    if (data.partyDLNo) {
      doc.text(`D.L.No: ${data.partyDLNo}`, rightSectionX, yPosition + 124);
    }

    return yPosition + 150;
  }

  private drawInvoiceDetails(
    doc: PDFKit.PDFDocument,
    data: QuotationData,
    leftMargin: number,
    yPosition: number,
    pageWidth: number,
  ): number {
    // Draw horizontal line
    doc
      .moveTo(leftMargin, yPosition)
      .lineTo(leftMargin + pageWidth, yPosition)
      .stroke('#000000');

    yPosition += 5;

    const col1X = leftMargin + 5;
    const col2X = leftMargin + 100;
    const col3X = leftMargin + 200;
    const col4X = leftMargin + 300;
    const col5X = leftMargin + 400;

    doc
      .fontSize(7)
      .font('Helvetica-Bold')
      .fillColor('#000000');

    // Row 1
    doc.text('Invoice No', col1X, yPosition);
    doc.text('Invoice Date', col1X, yPosition + 12);
    doc.text('Order No', col1X, yPosition + 24);
    doc.text('Order Date', col1X, yPosition + 36);
    doc.text('Transport', col1X, yPosition + 48);

    doc.font('Helvetica');
    doc.text(data.invoiceNo, col2X, yPosition);
    doc.text(data.invoiceDate, col2X, yPosition + 12);
    doc.text(data.orderNo || '-', col2X, yPosition + 24);
    doc.text(data.orderDate || '-', col2X, yPosition + 36);
    doc.text('-', col2X, yPosition + 48);

    doc.font('Helvetica-Bold');
    doc.text('L.R. No.', col3X, yPosition);
    doc.text('L.R. Date', col3X, yPosition + 12);
    doc.text('Cases', col3X, yPosition + 24);
    doc.text('Due Date', col3X, yPosition + 36);

    doc.font('Helvetica');
    doc.text('-', col4X, yPosition);
    doc.text(data.lrDate, col4X, yPosition + 12);
    doc.text('0', col4X, yPosition + 24);
    doc.text(data.dueDate, col4X, yPosition + 36);

    yPosition += 65;

    // Draw horizontal line
    doc
      .moveTo(leftMargin, yPosition)
      .lineTo(leftMargin + pageWidth, yPosition)
      .stroke('#000000');

    return yPosition + 5;
  }

  private drawItemsTable(
    doc: PDFKit.PDFDocument,
    data: QuotationData,
    leftMargin: number,
    yPosition: number,
    pageWidth: number,
  ): number {
    // Table Header
    const headerY = yPosition;
    doc.fontSize(6).font('Helvetica-Bold').fillColor('#000000');

    const colPositions = {
      s: leftMargin + 3,
      hsn: leftMargin + 15,
      product: leftMargin + 50,
      pack: leftMargin + 140,
      qty: leftMargin + 165,
      free: leftMargin + 185,
      batch: leftMargin + 205,
      mfg: leftMargin + 235,
      exp: leftMargin + 260,
      mrp: leftMargin + 280,
      rate: leftMargin + 305,
      dis: leftMargin + 330,
      sgst: leftMargin + 350,
      sgstVal: leftMargin + 370,
      cgst: leftMargin + 395,
      cgstVal: leftMargin + 415,
      amount: leftMargin + 445,
    };

    doc.text('S', colPositions.s, headerY);
    doc.text('HSN', colPositions.hsn, headerY);
    doc.text('Product Name', colPositions.product, headerY);
    doc.text('Pack', colPositions.pack, headerY);
    doc.text('Qty', colPositions.qty, headerY);
    doc.text('Free', colPositions.free, headerY);
    doc.text('Batch', colPositions.batch, headerY);
    doc.text('Mfg', colPositions.mfg, headerY);
    doc.text('Exp', colPositions.exp, headerY);
    doc.text('M.R.P', colPositions.mrp, headerY);
    doc.text('Rate', colPositions.rate, headerY);
    doc.text('Dis', colPositions.dis, headerY);
    doc.text('SGST', colPositions.sgst, headerY);
    doc.text('Value', colPositions.sgstVal, headerY);
    doc.text('CGST', colPositions.cgst, headerY);
    doc.text('Value', colPositions.cgstVal, headerY);
    doc.text('Amount', colPositions.amount, headerY);

    yPosition += 12;

    // Draw line below header
    doc
      .moveTo(leftMargin, yPosition)
      .lineTo(leftMargin + pageWidth, yPosition)
      .stroke('#000000');

    yPosition += 5;

    // Table Rows
    doc.fontSize(7).font('Helvetica').fillColor('#000000');

    data.items.forEach((item, index) => {
      if (yPosition > 700) {
        doc.addPage();
        yPosition = 50;
      }

      doc.text((index + 1).toString(), colPositions.s, yPosition);
      doc.text(item.hsn || '', colPositions.hsn, yPosition);
      doc.text(item.productName, colPositions.product, yPosition, {
        width: 85,
        height: 15,
      });
      doc.text(item.pack || '', colPositions.pack, yPosition);
      doc.text(item.qty.toString(), colPositions.qty, yPosition);
      doc.text('-', colPositions.free, yPosition);
      doc.text(item.batch || '', colPositions.batch, yPosition);
      doc.text(item.mfg || '', colPositions.mfg, yPosition);
      doc.text(item.exp || '', colPositions.exp, yPosition);
      doc.text(item.mrp.toFixed(2), colPositions.mrp, yPosition);
      doc.text(item.rate.toFixed(2), colPositions.rate, yPosition);
      doc.text(item.dis.toFixed(2), colPositions.dis, yPosition);
      doc.text(item.sgst.toFixed(2), colPositions.sgst, yPosition);
      doc.text(item.sgstValue.toFixed(2), colPositions.sgstVal, yPosition);
      doc.text(item.cgst.toFixed(2), colPositions.cgst, yPosition);
      doc.text(item.cgstValue.toFixed(2), colPositions.cgstVal, yPosition);
      doc.text(item.amount.toFixed(2), colPositions.amount, yPosition);

      yPosition += 15;
    });

    // Fill remaining rows if needed (to maintain table structure)
    const minRows = 8;
    const currentRows = data.items.length;
    if (currentRows < minRows) {
      for (let i = currentRows; i < minRows; i++) {
        yPosition += 15;
      }
    }

    // Draw line after items
    doc
      .moveTo(leftMargin, yPosition)
      .lineTo(leftMargin + pageWidth, yPosition)
      .stroke('#000000');

    return yPosition + 5;
  }

  private drawGSTSummary(
    doc: PDFKit.PDFDocument,
    data: QuotationData,
    leftMargin: number,
    yPosition: number,
    pageWidth: number,
  ): number {
    doc.fontSize(7).font('Helvetica-Bold').fillColor('#000000');

    const col1X = leftMargin + 5;
    const col2X = leftMargin + 80;
    const col3X = leftMargin + 150;
    const col4X = leftMargin + 220;
    const col5X = leftMargin + 290;
    const col6X = leftMargin + 360;
    const col7X = leftMargin + 420;

    // GST Summary Header
    doc.text('CLASS', col1X, yPosition);
    doc.text('TOTAL', col2X, yPosition);
    doc.text('SCHEME', col3X, yPosition);
    doc.text('DISCOUNT', col4X, yPosition);
    doc.text('SGST', col5X, yPosition);
    doc.text('CGST', col6X, yPosition);
    doc.text('TOTAL GST', col7X, yPosition);

    yPosition += 12;

    // Calculate GST breakdown (simplified - showing totals)
    doc.font('Helvetica').fontSize(7);
    const subtotal = data.grandTotal - data.totalSGST - data.totalCGST;

    doc.text('GST 5.00%', col1X, yPosition);
    doc.text(subtotal.toFixed(2), col2X, yPosition);
    doc.text('0.00', col3X, yPosition);
    doc.text('0.00', col4X, yPosition);
    doc.text(data.totalSGST.toFixed(2), col5X, yPosition);
    doc.text(data.totalCGST.toFixed(2), col6X, yPosition);
    doc.text((data.totalSGST + data.totalCGST).toFixed(2), col7X, yPosition);

    yPosition += 15;

    // TOTAL Row
    doc.font('Helvetica-Bold');
    doc.text('TOTAL', col1X, yPosition);
    doc.text(subtotal.toFixed(2), col2X, yPosition);
    doc.text('0.00', col3X, yPosition);
    doc.text('0.00', col4X, yPosition);
    doc.text(data.totalSGST.toFixed(2), col5X, yPosition);

    yPosition += 12;

    doc
      .fontSize(6)
      .font('Helvetica')
      .text('Rs. Thirty One Thousand and Eighty Six only', col1X, yPosition);

    yPosition += 20;

    // Right side summary - positioned below GST summary
    const rightColX = leftMargin + pageWidth - 150;
    let summaryY = yPosition;

    doc.fontSize(7).font('Helvetica');
    doc.text('Total Items :-', rightColX, summaryY);
    doc.text(data.totalItems.toString(), rightColX + 80, summaryY);

    summaryY += 12;
    doc.text('Total Qty :-', rightColX, summaryY);
    doc.text(data.totalQty.toString(), rightColX + 80, summaryY);

    summaryY += 20;
    doc.font('Helvetica-Bold');
    doc.text('TOTAL', rightColX, summaryY);
    doc.text(data.grandTotal.toFixed(2), rightColX + 80, summaryY);

    summaryY += 12;
    doc.font('Helvetica');
    doc.text('DIS AMT', rightColX, summaryY);
    doc.text('0.00', rightColX + 80, summaryY);

    summaryY += 12;
    doc.text('SGST PAYBLE', rightColX, summaryY);
    doc.text(data.totalSGST.toFixed(2), rightColX + 80, summaryY);

    summaryY += 12;
    doc.text('CGST PAYBLE', rightColX, summaryY);
    doc.text(data.totalCGST.toFixed(2), rightColX + 80, summaryY);

    summaryY += 12;
    doc.text('Round off', rightColX, summaryY);
    doc.text('0.00', rightColX + 80, summaryY);

    summaryY += 12;
    doc.text('CR/DR NOTE', rightColX, summaryY);
    doc.text('0.00', rightColX + 80, summaryY);

    return Math.max(yPosition, summaryY + 20);
  }

  private drawBankDetailsAndTerms(
    doc: PDFKit.PDFDocument,
    data: QuotationData,
    leftMargin: number,
    yPosition: number,
    pageWidth: number,
  ) {
    // Draw horizontal line
    doc
      .moveTo(leftMargin, yPosition)
      .lineTo(leftMargin + pageWidth, yPosition)
      .stroke('#000000');

    yPosition += 10;

    const midX = leftMargin + pageWidth / 2;

    // Left Section - Bank Details
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#000000');
    doc.text('OUR BANK DETAILS AS :-', leftMargin + 5, yPosition);

    yPosition += 12;

    doc.fontSize(7).font('Helvetica');
    doc.text('Bank Name: BANK OF BARODA', leftMargin + 5, yPosition);
    yPosition += 10;
    doc.text('Branch Name: RANCHI', leftMargin + 5, yPosition);
    yPosition += 10;
    doc.text('Account No.: 10170200001128', leftMargin + 5, yPosition);
    yPosition += 10;
    doc.text('IFSC Code: BARB0RANCHI', leftMargin + 5, yPosition);

    yPosition += 15;

    doc.fontSize(7).font('Helvetica-Bold');
    doc.text('Terms & Conditions', leftMargin + 5, yPosition);
    yPosition += 10;

    doc.fontSize(6).font('Helvetica');
    doc.text(
      'Goods once sold will not be taken back or exchanged.',
      leftMargin + 5,
      yPosition,
    );
    yPosition += 8;
    doc.text(
      'All disputes subject to RANCHI Jurisdiction only.',
      leftMargin + 5,
      yPosition,
    );
    yPosition += 8;
    doc.text(
      'Any Dispute Arising shall be settled by binding Mediation & Arbitration.',
      leftMargin + 5,
      yPosition,
      { width: 250 },
    );

    // Right Section - Signature
    const signatureY = yPosition - 80;
    doc.fontSize(7).font('Helvetica');
    doc.text('FOR 24RX MEDICAL ENTERPRISES', midX + 10, signatureY);

    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('Grand Total', midX + 80, signatureY + 40);
    doc.fontSize(12);
    doc.text(data.grandTotal.toFixed(2), midX + 80, signatureY + 55);

    doc.fontSize(8).font('Helvetica');
    doc.text('Authorised Signatory', midX + 80, signatureY + 95);
  }
}
