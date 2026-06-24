export type PipelineStatus =
  | 'lead_created'
  | 'docs_pending'
  | 'docs_received'
  | 'review_started'
  | 'return_preparation'
  | 'ready_to_file'
  | 'filed'
  | 'closed'

export type LeadStatus = 'new' | 'contacted' | 'converted' | 'lost'
export type DocumentType = 'pan' | 'aadhaar' | 'form16' | 'ais' | 'tis' | 'capital_gains' | 'bank_statement' | 'other'
export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'resubmission_needed'
export type Priority = 'low' | 'medium' | 'high'
export type PaymentStatus = 'paid' | 'unpaid' | 'pending_verification'
export type SenderType = 'client' | 'consultant'
export type IncomeType = 'salary' | 'business' | 'freelance' | 'rental' | 'capital_gains' | 'fno' | 'foreign' | 'other'

export interface Notification {
  id: string
  recipientEmail: string
  title: string
  body: string
  type: 'doc_uploaded' | 'doc_reviewed' | 'new_message' | 'new_lead' | 'return_filed' | 'payment_submitted'
  read: boolean
  createdAt: Date
  clientId?: string
}

export interface Lead {
  id: string
  name: string
  phone: string
  email: string
  pan?: string
  incomeTypes: IncomeType[]
  recommendedItr: string
  requiredDocs: string[]
  complexity: 'simple' | 'moderate' | 'complex'
  status: LeadStatus
  source: 'assessment' | 'direct'
  createdAt: Date
  contactedAt?: Date
  convertedAt?: Date
  convertedToClientId?: string
}

export interface Client {
  id: string
  name: string
  phone: string
  email: string
  pan?: string
  aadhaar?: string
  itrType?: string
  category?: string
  status: PipelineStatus
  assignedTo: string
  leadId?: string
  createdAt: Date
  lastActivityAt: Date
  feeAmount?: number
  feeStatus?: PaymentStatus
  requiredDocs?: string[]
}

export interface ClientDocument {
  id: string
  name: string
  type: DocumentType
  storagePath: string
  externalUrl?: string
  cloudinaryAssetId?: string
  year?: number
  uploadedAt: Date
  uploadedBy: SenderType
  reviewStatus: ReviewStatus
  reviewNote?: string
}

export interface Task {
  id: string
  title: string
  dueDate?: Date
  priority: Priority
  completed: boolean
  assignedTo?: string
  createdAt: Date
}

export interface Note {
  id: string
  text: string
  authorId: string
  createdAt: Date
}

export interface Message {
  id: string
  text: string
  senderId: string
  senderType: SenderType
  sentAt: Date
  readAt?: Date
}

export interface Payment {
  id: string
  description: string
  amount: number
  method?: string
  status: PaymentStatus
  date: Date
  invoiceUrl?: string
  // UTR submission fields (set by client)
  utr?: string
  paymentMode?: 'upi' | 'imps' | 'neft' | 'rtgs'
  submittedBy?: 'client' | 'admin'
  rejectionReason?: string
}

export interface PaymentSettings {
  upiId: string
  upiName: string
  bankName: string
  accountHolder: string
  accountNumber: string
  ifsc: string
}

export interface StatusHistoryEvent {
  id: string
  fromStatus: PipelineStatus
  toStatus: PipelineStatus
  changedAt: Date
  changedBy: string
}

export interface Return {
  id: string
  year: number
  itrType: string
  filedAt: Date
  acknowledgementUrl?: string
  itrCopyUrl?: string
  acknowledgementNumber?: string
}

export const PIPELINE_STAGES: { status: PipelineStatus; label: string; description: string }[] = [
  { status: 'lead_created',       label: 'Lead Created',       description: 'Initial inquiry received' },
  { status: 'docs_pending',       label: 'Docs Pending',       description: 'Waiting for your documents' },
  { status: 'docs_received',      label: 'Docs Received',      description: 'Documents under review' },
  { status: 'review_started',     label: 'Review Started',     description: 'Reviewing your documents' },
  { status: 'return_preparation', label: 'Return Preparation', description: 'Preparing your ITR' },
  { status: 'ready_to_file',      label: 'Ready to File',      description: 'Return ready, awaiting filing' },
  { status: 'filed',              label: 'Filed',              description: 'ITR submitted successfully' },
  { status: 'closed',             label: 'Closed',             description: 'Case closed' },
]
