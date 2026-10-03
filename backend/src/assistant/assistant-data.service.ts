import { Injectable } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';

const LIMIT = 10;

const day = (d?: Date | null) => (d ? d.toISOString().slice(0, 10) : null);
const num = (d: any) => (d === null || d === undefined ? null : Number(d));

/**
 * Read-only lookups for Ria's data tools. Every query is scoped to the
 * authenticated user's id — the model never supplies ids.
 */
@Injectable()
export class AssistantDataService {
  constructor(private prisma: PrismaService) {}

  /** Public catalogue search — no user scope needed, read-only. */
  async searchMedicines(query: unknown) {
    const q = typeof query === 'string' ? query.trim().slice(0, 80) : '';
    if (q.length < 2) return { error: 'Please give at least 2 letters of the medicine name.' };
    const medicines = await this.prisma.medicine.findMany({
      where: { isActive: true, name: { contains: q, mode: 'insensitive' } },
      take: 8,
      select: {
        name: true, strength: true, form: true, mrp: true,
        manufacturer: { select: { name: true } },
        listings: { where: { status: 'ACTIVE', stock: { gt: 0 } }, select: { listPrice: true, stock: true, gstPercentage: true } },
      },
    });
    return {
      results: medicines
        .map((m) => {
          const prices = m.listings.map((l) => Number(l.listPrice)).filter((p) => p > 0);
          return {
            medicine: `${m.name} ${m.strength} ${m.form}`.trim(),
            manufacturer: m.manufacturer?.name,
            mrp: num(m.mrp),
            availableOn24Rx: m.listings.length > 0,
            bestPriceExclGst: prices.length ? Math.min(...prices) : null,
            sellers: m.listings.length,
            totalStockOnSale: m.listings.reduce((s, l) => s + l.stock, 0),
          };
        })
        .sort((a, b) => Number(b.availableOn24Rx) - Number(a.availableOn24Rx)),
      note: 'Prices exclude GST. Open Explore (/medicines) to buy.',
    };
  }

  async run(tool: string, userId: string): Promise<unknown> {
    switch (tool) {
      case 'get_my_account':
        return this.account(userId);
      case 'get_my_selling':
        return this.selling(userId);
      case 'get_my_buying':
        return this.buying(userId);
      case 'get_my_deliveries':
        return this.deliveries(userId);
      case 'get_my_notifications':
        return this.notifications(userId);
      case 'get_my_support_tickets':
        return this.supportTickets(userId);
      default:
        return { error: `Unknown tool ${tool}` };
    }
  }

  private async account(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        roleCode: true,
        status: true,
        isActive: true,
        createdAt: true,
        kycDocuments: {
          select: { status: true, reviewerNote: true, uploadedAt: true, docType: { select: { code: true, label: true } } },
        },
      },
    });
    if (!user) return { error: 'Account not found' };

    // The 8 documents the KYC page asks for (see frontend/app/dashboard/profile/complete).
    const required: Record<string, string> = {
      GST_CERTIFICATE: 'GST Registration Certificate',
      PAN_CARD: 'PAN Card',
      CANCELLED_CHEQUE: 'Cancelled Cheque',
      INDEMNITY_CERTIFICATE: 'Indemnity Certificate',
      DRUG_LICENSE_1: '20B Drug License',
      DRUG_LICENSE_2: '21B Drug Licence',
      NON_CONVICTION_CERTIFICATE: 'Non-Conviction Certificate',
      DECLARATION_FORM: 'Declaration Form',
    };
    const byCode = new Map(user.kycDocuments.map((d) => [d.docType.code, d]));
    const kycDocuments = Object.entries(required).map(([code, label]) => {
      const d = byCode.get(code);
      return d
        ? { document: label, status: d.status, uploaded: day(d.uploadedAt), rejectionReason: d.status === 'REJECTED' ? d.reviewerNote : undefined }
        : { document: label, status: 'NOT_UPLOADED' };
    });

    return {
      name: user.name,
      email: user.email,
      accountType: user.roleCode,
      accountStatus: user.isActive ? user.status : 'DEACTIVATED',
      memberSince: day(user.createdAt),
      tradingUnlocked: user.status === 'APPROVED' && user.isActive,
      note:
        user.status === 'APPROVED'
          ? 'The account itself is approved, so nothing is locked; individual document badges no longer matter.'
          : 'Trading unlocks when an admin approves the account after reviewing the documents (usually 24-48 hours after all 8 are uploaded).',
      kycDocuments,
      missingDocuments: kycDocuments.filter((d) => d.status === 'NOT_UPLOADED').map((d) => d.document),
    };
  }

  private async selling(userId: string) {
    const [listings, counts, proposals, bulk, awaitingConfirmation] = await Promise.all([
      this.prisma.listing.findMany({
        where: { sellerId: userId },
        orderBy: { createdAt: 'desc' },
        take: LIMIT,
        select: {
          status: true, basePrice: true, listPrice: true, stock: true, reviewerNote: true, createdAt: true, expiryDate: true,
          medicine: { select: { name: true, strength: true, form: true } },
        },
      }),
      this.prisma.listing.groupBy({ by: ['status'], where: { sellerId: userId }, _count: true }),
      this.prisma.medicineProposal.findMany({
        where: { sellerId: userId, status: { in: ['PENDING', 'REJECTED'] } },
        orderBy: { createdAt: 'desc' },
        take: LIMIT,
        select: { name: true, strength: true, status: true, reviewerNote: true, createdAt: true },
      }),
      this.prisma.bulkListingRequest.findMany({
        where: { sellerId: userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { status: true, createdAt: true, parsedData: true },
      }),
      this.prisma.buyProposal.findMany({
        where: { status: 'AWAITING_SELLER', listing: { sellerId: userId } },
        orderBy: { createdAt: 'asc' },
        select: { qty: true, createdAt: true, sellerTimeoutAt: true, listing: { select: { medicine: { select: { name: true } } } } },
      }),
    ]);

    return {
      listingCounts: Object.fromEntries(counts.map((c) => [c.status, c._count])),
      recentListings: listings.map((l) => ({
        medicine: `${l.medicine.name} ${l.medicine.strength} ${l.medicine.form}`.trim(),
        status: l.status,
        yourPrice: num(l.basePrice),
        buyerPrice: num(l.listPrice),
        stock: l.stock,
        created: day(l.createdAt),
        expiry: day(l.expiryDate),
        rejectionReason: l.status === 'REJECTED' ? l.reviewerNote : undefined,
      })),
      newMedicineProposals: proposals.map((p) => ({
        medicine: `${p.name} ${p.strength}`,
        status: p.status,
        created: day(p.createdAt),
        rejectionReason: p.status === 'REJECTED' ? p.reviewerNote : undefined,
      })),
      bulkUploads: bulk.map((b) => {
        const rows: any[] = Array.isArray(b.parsedData) ? (b.parsedData as any[]) : [];
        const tally = (s: string) => rows.filter((r) => r?.status === s).length;
        return {
          submitted: day(b.createdAt),
          status: { PENDING: 'Analyzing', PROCESSED: 'Ready for admin review', APPROVED: 'Approved', ERROR: 'Error - check file format' }[b.status] ?? b.status,
          items: rows.length || undefined,
          matched: rows.length ? tally('MATCHED') : undefined,
          new: rows.length ? tally('NEW') : undefined,
          invalid: rows.length ? tally('INVALID') : undefined,
        };
      }),
      buyRequestsAwaitingYourConfirmation: awaitingConfirmation.map((p) => ({
        medicine: p.listing.medicine.name,
        quantity: p.qty,
        requested: day(p.createdAt),
        hoursLeft: p.sellerTimeoutAt ? Math.max(0, Math.round((p.sellerTimeoutAt.getTime() - Date.now()) / 36e5)) : null,
      })),
    };
  }

  private async buying(userId: string) {
    const [proposals, lots] = await Promise.all([
      this.prisma.buyProposal.findMany({
        where: { buyerId: userId },
        orderBy: { createdAt: 'desc' },
        take: LIMIT,
        select: {
          qty: true, confirmedQty: true, status: true, reviewerNote: true, createdAt: true, sellerTimeoutAt: true, receiptUrl: true,
          listing: { select: { listPrice: true, gstPercentage: true, medicine: { select: { name: true, strength: true } } } },
        },
      }),
      this.prisma.inventoryLot.findMany({
        where: { userId, qty: { gt: 0 } },
        select: { qty: true, unitCost: true, medicine: { select: { name: true, strength: true } } },
      }),
    ]);

    // Explain the status the way the buyer experiences it.
    const meaning: Record<string, string> = {
      AWAITING_SELLER: 'Waiting for the seller to confirm stock (max 48 hours)',
      QUANTITY_MODIFIED: 'Seller offered a smaller quantity — approve or reject it on Buy Proposals',
      SELLER_CONFIRMED: 'Seller confirmed; 24Rx is processing (invoice/admin verification)',
      AWAITING_PAYMENT: 'Proforma invoice sent — pay by bank transfer and upload the receipt',
      AWAITING_SELLER_INVOICE: 'Payment receipt received — waiting for the seller invoice and admin verification',
      PENDING: 'Waiting for admin approval',
      APPROVED: 'Completed — stock is in your Portfolio',
      REJECTED: 'Rejected / cancelled',
    };

    const holdings = new Map<string, { medicine: string; quantity: number; cost: number }>();
    for (const l of lots) {
      const key = `${l.medicine.name} ${l.medicine.strength}`;
      const h = holdings.get(key) ?? { medicine: key, quantity: 0, cost: 0 };
      h.quantity += l.qty;
      h.cost += l.qty * Number(l.unitCost);
      holdings.set(key, h);
    }

    return {
      buyProposals: proposals.map((p) => ({
        medicine: `${p.listing.medicine.name} ${p.listing.medicine.strength}`,
        quantity: p.qty,
        sellerOfferedQuantity: p.status === 'QUANTITY_MODIFIED' ? p.confirmedQty : undefined,
        unitPrice: num(p.listing.listPrice),
        gstPercent: num(p.listing.gstPercentage),
        status: p.status,
        meaning: meaning[p.status] ?? p.status,
        receiptUploaded: !!p.receiptUrl,
        created: day(p.createdAt),
        note: p.status === 'REJECTED' ? p.reviewerNote : undefined,
      })),
      portfolioHoldings: [...holdings.values()].map((h) => ({ ...h, cost: Math.round(h.cost) })),
    };
  }

  private async deliveries(userId: string) {
    const select = {
      qty: true, status: true, deliveryCharge: true, transportMode: true, reviewerNote: true, createdAt: true, deliveredAt: true,
      inventoryLot: { select: { medicine: { select: { name: true, strength: true } } } },
    } as const;
    const [asBuyer, asSeller] = await Promise.all([
      this.prisma.deliveryRequest.findMany({ where: { requesterId: userId }, orderBy: { createdAt: 'desc' }, take: LIMIT, select }),
      this.prisma.deliveryRequest.findMany({
        where: { inventoryLot: { sourceOrder: { listing: { sellerId: userId } } } },
        orderBy: { createdAt: 'desc' },
        take: LIMIT,
        select,
      }),
    ]);
    const shape = (d: (typeof asBuyer)[number]) => ({
      medicine: `${d.inventoryLot.medicine.name} ${d.inventoryLot.medicine.strength}`,
      quantity: d.qty,
      status: d.status,
      deliveryCharge: num(d.deliveryCharge),
      transportMode: d.transportMode,
      requested: day(d.createdAt),
      delivered: day(d.deliveredAt),
      note: d.reviewerNote ?? undefined,
    });
    return { asBuyer: asBuyer.map(shape), asSeller: asSeller.map(shape) };
  }

  private async notifications(userId: string) {
    const [items, unread] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }],
        take: LIMIT,
        select: { subject: true, body: true, isRead: true, createdAt: true },
      }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);
    return {
      unreadCount: unread,
      recent: items.map((n) => ({ subject: n.subject, body: n.body.slice(0, 240), unread: !n.isRead, date: day(n.createdAt) })),
    };
  }

  private async supportTickets(userId: string) {
    const tickets = await this.prisma.supportTicket.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: LIMIT,
      select: { subject: true, status: true, adminResponse: true, createdAt: true },
    });
    return {
      tickets: tickets.map((t) => ({ subject: t.subject, status: t.status, adminResponse: t.adminResponse ?? undefined, created: day(t.createdAt) })),
    };
  }
}
