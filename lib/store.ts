import { prisma } from './db';
import { getUserById, getEmployeeIdForUserId } from './auth';
import type { Event, Customer, Notification, Creative } from '@/types';

// ── Mappers ───────────────────────────────────────────────────────────────────

function mapEvent(e: any): Event {
  const approverIds: string[] = e.approverIds ?? [];
  return {
    id: e.id,
    eventCode: e.eventCode,
    name: e.name,
    type: e.type,
    otherType: e.otherType ?? undefined,
    topic: e.topic,
    venueType: e.venueType,
    venue: e.venue,
    city: e.city,
    state: e.state,
    date: e.date,
    time: e.time,
    description: e.description ?? undefined,
    status: e.status,
    creatorId: e.creatorId,
    creatorName: e.creatorName,
    tags: e.tags ?? [],
    approverIds,
    approvers: approverIds.map(uid => ({
      id: uid,
      name: getUserById(uid)?.name ?? uid,
      employeeId: getEmployeeIdForUserId(uid) ?? uid,
    })),
    customerCount: e.customerCount ?? 0,
    createdAt: e.createdAt instanceof Date ? e.createdAt.toISOString() : e.createdAt,
    updatedAt: e.updatedAt instanceof Date ? e.updatedAt.toISOString() : e.updatedAt,
  };
}

function mapCustomer(c: any): Customer {
  return {
    id: c.id,
    eventId: c.eventId,
    addedById: c.addedById,
    addedByName: c.addedByName,
    fullName: c.fullName,
    mobile: c.mobile,
    email: c.email ?? undefined,
    organisation: c.organisation ?? undefined,
    guestsAccompanied: c.guestsAccompanied ?? undefined,
    status: c.status,
    reviewNote: c.reviewNote ?? undefined,
    reviewedAt: c.reviewedAt instanceof Date ? c.reviewedAt.toISOString() : (c.reviewedAt ?? undefined),
    rsvpStatus: c.rsvpStatus ?? 'NO_RESPONSE',
    rsvpToken: c.rsvpToken ?? '',
    createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
  };
}

function mapCreative(c: any): Creative {
  return {
    id: c.id,
    eventId: c.eventId,
    eventName: c.eventName,
    uploadedById: c.uploadedById,
    uploadedByName: c.uploadedByName,
    label: c.label,
    fileName: c.fileName,
    mimeType: c.mimeType,
    sizeBytes: c.sizeBytes,
    isPersonalizable: c.isPersonalizable,
    namePosition: c.namePosition ?? undefined,
    createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
  };
}

function mapNotification(n: any): Notification {
  return {
    id: n.id,
    userId: n.userId,
    title: n.title,
    message: n.message,
    type: n.type as Notification['type'],
    read: n.read,
    link: n.link ?? undefined,
    createdAt: n.createdAt instanceof Date ? n.createdAt.toISOString() : n.createdAt,
  };
}

// ── Events ────────────────────────────────────────────────────────────────────

export async function getAllEvents(): Promise<Event[]> {
  const rows = await prisma.event.findMany({ orderBy: { createdAt: 'desc' } });
  return rows.map(mapEvent);
}

export async function addEvent(event: Event): Promise<void> {
  await prisma.event.create({
    data: {
      id: event.id,
      eventCode: event.eventCode,
      name: event.name,
      type: event.type as any,
      otherType: event.otherType ?? null,
      topic: event.topic as any,
      venueType: event.venueType as any,
      venue: event.venue,
      city: event.city,
      state: event.state,
      date: event.date,
      time: event.time,
      description: event.description ?? null,
      status: event.status as any,
      creatorId: event.creatorId,
      creatorName: event.creatorName,
      tags: event.tags ?? [],
      customerCount: event.customerCount ?? 0,
    },
  });
}

export async function getEventById(id: string): Promise<Event | undefined> {
  const row = await prisma.event.findUnique({ where: { id } });
  return row ? mapEvent(row) : undefined;
}

export async function getEventByCode(code: string): Promise<Event | undefined> {
  const rows = await prisma.event.findMany();
  const row = rows.find(e => e.eventCode.toUpperCase() === code.trim().toUpperCase());
  return row ? mapEvent(row) : undefined;
}

export async function updateEvent(id: string, patch: Partial<Event>): Promise<Event | null> {
  try {
    const updated = await prisma.event.update({
      where: { id },
      data: {
        ...(patch.name !== undefined && { name: patch.name }),
        ...(patch.type !== undefined && { type: patch.type as any }),
        ...(patch.otherType !== undefined && { otherType: patch.otherType }),
        ...(patch.topic !== undefined && { topic: patch.topic as any }),
        ...(patch.venueType !== undefined && { venueType: patch.venueType as any }),
        ...(patch.venue !== undefined && { venue: patch.venue }),
        ...(patch.city !== undefined && { city: patch.city }),
        ...(patch.state !== undefined && { state: patch.state }),
        ...(patch.date !== undefined && { date: patch.date }),
        ...(patch.time !== undefined && { time: patch.time }),
        ...(patch.description !== undefined && { description: patch.description }),
        ...(patch.status !== undefined && { status: patch.status as any }),
        ...(patch.tags !== undefined && { tags: patch.tags }),
      },
    });
    return mapEvent(updated);
  } catch {
    return null;
  }
}

export async function getEventsForUser(userId: string, role: string): Promise<Event[]> {
  if (role === 'ADMIN') {
    const rows = await prisma.event.findMany({ orderBy: { createdAt: 'desc' } });
    return rows.map(mapEvent);
  }
  const rows = await prisma.event.findMany({
    where: {
      OR: [
        { creatorId: userId },
        { subscriptions: { some: { userId } } },
        { approverIds: { has: userId } },
      ],
    },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(mapEvent);
}

// ── Subscriptions ─────────────────────────────────────────────────────────────

export async function subscribe(userId: string, eventId: string): Promise<void> {
  await prisma.subscription.upsert({
    where: { userId_eventId: { userId, eventId } },
    create: { userId, eventId },
    update: {},
  });
}

export async function hasAccess(userId: string, role: string, eventId: string): Promise<boolean> {
  if (role === 'ADMIN') return true;
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return false;
  if (event.creatorId === userId) return true;
  if ((event.approverIds as string[]).includes(userId)) return true;
  const sub = await prisma.subscription.findUnique({
    where: { userId_eventId: { userId, eventId } },
  });
  return sub !== null;
}

export async function canEdit(userId: string, role: string, eventId: string): Promise<boolean> {
  if (role === 'ADMIN') return true;
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  return event?.creatorId === userId;
}

// ── Customers ─────────────────────────────────────────────────────────────────

export async function getCustomersByEvent(eventId: string): Promise<Customer[]> {
  const rows = await prisma.customer.findMany({
    where: { eventId },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(mapCustomer);
}

export async function getCustomerById(id: string): Promise<Customer | undefined> {
  const row = await prisma.customer.findUnique({ where: { id } });
  return row ? mapCustomer(row) : undefined;
}

export async function addCustomer(customer: Customer): Promise<void> {
  await prisma.customer.create({
    data: {
      id: customer.id,
      eventId: customer.eventId,
      addedById: customer.addedById,
      addedByName: customer.addedByName,
      fullName: customer.fullName,
      mobile: customer.mobile,
      email: customer.email ?? null,
      organisation: customer.organisation ?? null,
      guestsAccompanied: customer.guestsAccompanied ?? null,
      status: customer.status as any,
    },
  });
}

export async function updateCustomerStatus(
  id: string,
  status: 'APPROVED' | 'REJECTED',
  reviewNote?: string,
): Promise<Customer | null> {
  try {
    const updated = await prisma.customer.update({
      where: { id },
      data: {
        status: status as any,
        reviewNote: reviewNote ?? null,
        reviewedAt: new Date(),
      },
    });
    if (status === 'APPROVED') {
      await prisma.event.update({
        where: { id: updated.eventId },
        data: { customerCount: { increment: 1 } },
      });
    }
    return mapCustomer(updated);
  } catch {
    return null;
  }
}

// ── Creatives ─────────────────────────────────────────────────────────────────

export async function getCreativesByEvent(eventId: string): Promise<Creative[]> {
  const rows = await prisma.creative.findMany({
    where: { eventId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, eventId: true, eventName: true,
      uploadedById: true, uploadedByName: true,
      label: true, fileName: true, mimeType: true, sizeBytes: true,
      isPersonalizable: true, namePosition: true, createdAt: true,
    },
  });
  return rows.map(mapCreative);
}

export async function getCreativeById(id: string): Promise<Creative | undefined> {
  const row = await prisma.creative.findUnique({
    where: { id },
    select: {
      id: true, eventId: true, eventName: true,
      uploadedById: true, uploadedByName: true,
      label: true, fileName: true, mimeType: true, sizeBytes: true,
      isPersonalizable: true, namePosition: true, createdAt: true,
    },
  });
  return row ? mapCreative(row) : undefined;
}

export async function addCreative(creative: Creative, fileBuffer: Buffer): Promise<void> {
  await prisma.creative.create({
    data: {
      id: creative.id,
      eventId: creative.eventId,
      eventName: creative.eventName,
      uploadedById: creative.uploadedById,
      uploadedByName: creative.uploadedByName,
      label: creative.label,
      fileName: creative.fileName,
      mimeType: creative.mimeType,
      sizeBytes: creative.sizeBytes,
      fileData: fileBuffer as any,
      isPersonalizable: creative.isPersonalizable,
      namePosition: (creative.namePosition ?? undefined) as any,
    },
  });
}

export async function deleteCreative(id: string): Promise<boolean> {
  try {
    await prisma.creative.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

export async function getCreativeFile(id: string): Promise<{ buffer: Buffer; mimeType: string } | undefined> {
  const row = await prisma.creative.findUnique({
    where: { id },
    select: { fileData: true, mimeType: true },
  });
  if (!row) return undefined;
  return { buffer: Buffer.from(row.fileData), mimeType: row.mimeType };
}

// ── Notifications ─────────────────────────────────────────────────────────────

export async function addNotification(notification: Notification): Promise<void> {
  await prisma.notification.create({
    data: {
      id: notification.id,
      userId: notification.userId,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      read: notification.read,
      link: notification.link ?? null,
    },
  });
}

export async function getNotificationsForUser(userId: string): Promise<Notification[]> {
  const rows = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(mapNotification);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
}

// ── RSVP ─────────────────────────────────────────────────────────────────────

export async function getCustomerByRsvpToken(token: string): Promise<Customer | undefined> {
  const row = await prisma.customer.findUnique({ where: { rsvpToken: token } });
  return row ? mapCustomer(row) : undefined;
}

export async function recordRsvp(
  token: string,
  status: 'ATTENDING' | 'MAYBE' | 'NOT_ATTENDING',
): Promise<Customer | null> {
  try {
    const updated = await prisma.customer.update({
      where: { rsvpToken: token },
      data: { rsvpStatus: status as any },
    });
    return mapCustomer(updated);
  } catch {
    return null;
  }
}

export async function updateCustomerRsvp(
  id: string,
  status: 'NO_RESPONSE' | 'ATTENDING' | 'MAYBE' | 'NOT_ATTENDING',
): Promise<Customer | null> {
  try {
    const updated = await prisma.customer.update({
      where: { id },
      data: { rsvpStatus: status as any },
    });
    return mapCustomer(updated);
  } catch {
    return null;
  }
}

// ── Event Approvers ───────────────────────────────────────────────────────────

export async function addEventApprover(eventId: string, userId: string): Promise<boolean> {
  try {
    const row = await prisma.event.findUnique({
      where: { id: eventId },
      select: { approverIds: true },
    });
    if (!row) return false;
    const ids = row.approverIds as string[];
    if (ids.includes(userId)) return true;
    await prisma.event.update({
      where: { id: eventId },
      data: { approverIds: { push: userId } },
    });
    return true;
  } catch { return false; }
}

export async function removeEventApprover(eventId: string, userId: string): Promise<boolean> {
  try {
    const row = await prisma.event.findUnique({
      where: { id: eventId },
      select: { approverIds: true },
    });
    if (!row) return false;
    await prisma.event.update({
      where: { id: eventId },
      data: { approverIds: (row.approverIds as string[]).filter(id => id !== userId) },
    });
    return true;
  } catch { return false; }
}
