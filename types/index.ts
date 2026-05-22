export type UserRole = 'ADMIN' | 'USER';

export interface User {
  id: string;
  employeeId: string;
  name: string;
  role: UserRole;
}

export type EventStatus = 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
export type EventType = 'OPEN_EVENT' | 'INVITATION_ONLY' | 'BRANDING_ACTIVITY' | 'OTHER';
export type EventTopic = 'FINANCIAL' | 'NON_FINANCIAL' | 'BOTH';
export type VenueType = 'BRANCH' | 'RWA_SOCIETY' | 'CORPORATE_INSTITUTION' | 'ONLINE_WEBINAR' | 'HOTEL_CLUB_BANQUET';

export interface Event {
  id: string;
  eventCode: string;
  name: string;
  type: EventType;
  otherType?: string;
  topic: EventTopic;
  venueType: VenueType;
  venue: string;
  city: string;
  state: string;
  date: string;
  time: string;
  description?: string;
  status: EventStatus;
  creatorId: string;
  creatorName: string;
  tags?: string[];
  approverIds: string[];
  approvers: { id: string; name: string; employeeId: string }[];
  createdAt: string;
  updatedAt: string;
  customerCount?: number;
}

export type CustomerStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type RsvpStatus = 'NO_RESPONSE' | 'ATTENDING' | 'MAYBE' | 'NOT_ATTENDING';

export interface Customer {
  id: string;
  eventId: string;
  addedById: string;
  addedByName: string;
  fullName: string;
  mobile: string;
  email?: string;
  organisation?: string;
  guestsAccompanied?: number;
  status: CustomerStatus;
  reviewNote?: string;
  reviewedAt?: string;
  rsvpStatus: RsvpStatus;
  rsvpToken: string;
  createdAt: string;
}

export interface NamePosition {
  xPct: number;
  yPct: number;
  fontSizePct: number;
  color: string;
  align: 'left' | 'center' | 'right';
}

export interface QrPosition {
  xPct: number;    // centre-x as % of image width
  yPct: number;    // centre-y as % of image height (from top)
  sizePct: number; // side length as % of image height
}

export interface RsvpArea {
  y1Pct: number;   // top of button strip as % from top of image
  y2Pct: number;   // bottom of button strip as % from top of image
}

export interface Creative {
  id: string;
  eventId: string;
  eventName: string;
  uploadedById: string;
  uploadedByName: string;
  label: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  isPersonalizable: boolean;
  namePosition?: NamePosition;
  qrPosition?: QrPosition;
  rsvpArea?: RsvpArea;
  createdAt: string;
}

export type InviteShareType = 'PERSONALISED' | 'NON_PERSONAL' | 'HTML';

export interface InviteShare {
  id: string;
  eventId: string;
  customerId: string;
  customerName: string;
  sharedById: string;
  sharedByName: string;
  creativeId: string;
  creativeLabel: string;
  type: InviteShareType;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  read: boolean;
  link?: string;
  createdAt: string;
}
