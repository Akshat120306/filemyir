import { collection, doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'
import { IncomeType } from '@/types'

export interface AssessmentAnswers {
  filingType: string
  hasSalary: boolean
  incomeSources: string[]
  soldAssets: string[]
  multipleHouse: boolean
  foreignAssets: boolean
  selfEmployed: boolean
}

export interface AssessmentResult {
  itr: string
  itrNote?: string  // e.g. "Potential ITR-4 case"
  confidence: number
  complexity: 'simple' | 'moderate' | 'complex'
  reasons: string[]
  requiredDocs: DocItem[]
}

export interface DocItem {
  name: string
  category: string
  required: boolean
  note?: string
}

// ── Recommendation engine ──────────────────────────────────────────────────

export function computeRecommendation(a: AssessmentAnswers): AssessmentResult {
  const soldSomething  = a.soldAssets.length > 0 && !a.soldAssets.includes('none')
  const hasCapGains    = soldSomething
  const hasCrypto      = a.incomeSources.includes('crypto')
  const hasForeign     = a.foreignAssets || a.incomeSources.includes('foreign')
  const hasRental      = a.incomeSources.includes('rental')
  const hasBusiness    = a.incomeSources.includes('business') || a.selfEmployed
  const hasFreelance   = a.incomeSources.includes('freelance') || a.incomeSources.includes('professional')
  const hasStocks      = a.incomeSources.includes('stocks') || a.soldAssets.includes('stocks')
  const hasMF          = a.incomeSources.includes('mutual_funds') || a.soldAssets.includes('mutual_funds')
  const hasInterest    = a.incomeSources.includes('interest') || a.incomeSources.includes('fd')
  const hasFnO         = a.incomeSources.includes('stocks') // frequent/intraday trading

  const docs = buildDocList(a)

  // Non-individual
  if (a.filingType !== 'individual') {
    return {
      itr: 'CONSULTANT REVIEW',
      confidence: 100,
      complexity: 'complex',
      reasons: [
        `Entity type: ${a.filingType.toUpperCase()} — requires specialist filing`,
        'Non-individual returns have different forms and compliance requirements',
      ],
      requiredDocs: [
        { name: 'Certificate of Incorporation / Registration', category: 'Entity', required: true },
        { name: 'PAN Card of Entity', category: 'Entity', required: true },
        { name: 'Books of Accounts', category: 'Accounts', required: true },
        { name: 'Audited Financials (if applicable)', category: 'Accounts', required: false },
        { name: 'GST Returns', category: 'Tax', required: false },
      ],
    }
  }

  // Business / Professional / Freelance → ITR-3
  if (hasBusiness || hasFreelance) {
    const couldBeITR4 = hasFreelance && !hasBusiness && !a.soldAssets.includes('property')
    const reasons: string[] = []
    if (hasBusiness)  reasons.push('Business income detected')
    if (hasFreelance) reasons.push('Freelancing / Professional income detected')
    if (a.hasSalary)  reasons.push('Salary income also present')
    if (hasCapGains)  reasons.push('Capital gains from asset sales')
    if (hasForeign)   reasons.push('Foreign income or assets')

    return {
      itr: 'ITR-3',
      itrNote: couldBeITR4 ? 'Potential ITR-4 case — Consultant will confirm' : undefined,
      confidence: hasBusiness ? 91 : 86,
      complexity: 'complex',
      reasons,
      requiredDocs: docs,
    }
  }

  // Capital Gains / Multiple House / Foreign / Crypto → ITR-2
  if (hasCapGains || a.multipleHouse || hasForeign || hasCrypto) {
    const reasons: string[] = []
    if (a.hasSalary)       reasons.push('Salary income')
    if (hasCapGains)       reasons.push('Capital gains from selling ' + a.soldAssets.filter(s => s !== 'none').map(s => s.replace('_', ' ')).join(', '))
    if (a.multipleHouse)   reasons.push('Multiple house properties')
    if (hasForeign)        reasons.push('Foreign income or assets')
    if (hasCrypto)         reasons.push('Cryptocurrency / Virtual Digital Assets (VDA)')
    if (hasRental)         reasons.push('Rental income')

    const conf = hasForeign && hasCapGains ? 95 : hasCrypto ? 96 : 91

    return {
      itr: 'ITR-2',
      confidence: conf,
      complexity: hasForeign || hasCrypto ? 'complex' : 'moderate',
      reasons,
      requiredDocs: docs,
    }
  }

  // Rental income → ITR-2
  if (hasRental) {
    return {
      itr: 'ITR-2',
      confidence: 89,
      complexity: 'moderate',
      reasons: [
        'Rental income requires Schedule HP (House Property)',
        a.hasSalary ? 'Salary income included' : '',
        hasInterest ? 'Interest income included' : '',
      ].filter(Boolean),
      requiredDocs: docs,
    }
  }

  // Salary + simple income → ITR-1
  if (a.hasSalary) {
    return {
      itr: 'ITR-1',
      confidence: hasInterest ? 93 : 96,
      complexity: 'simple',
      reasons: [
        'Salary / pension income',
        hasInterest ? 'Interest / FD income (allowed in ITR-1)' : '',
        'No capital gains, rental income, or business income',
        'Single house property or no property',
      ].filter(Boolean),
      requiredDocs: docs,
    }
  }

  // Interest / agricultural only
  return {
    itr: 'ITR-2',
    confidence: 74,
    complexity: 'simple',
    reasons: ['Other income sources — ITR-2 as a safe default'],
    requiredDocs: docs,
  }
}

function buildDocList(a: AssessmentAnswers): DocItem[] {
  const docs: DocItem[] = [
    { name: 'PAN Card', category: 'Identity', required: true },
    { name: 'Aadhaar Card', category: 'Identity', required: true },
    { name: 'Bank Account Details (all accounts)', category: 'Banking', required: true },
    { name: 'AIS / Form 26AS Statement', category: 'Tax', required: true },
  ]

  if (a.hasSalary) {
    docs.push({ name: 'Form 16 (Part A & B from employer)', category: 'Salary', required: true })
    docs.push({ name: 'Salary Slips', category: 'Salary', required: false, note: 'Optional but helpful' })
  }

  if (a.incomeSources.includes('interest') || a.incomeSources.includes('fd')) {
    docs.push({ name: 'Interest Certificate from Bank / NBFC', category: 'Banking', required: true })
    docs.push({ name: 'Bank Statements (all accounts)', category: 'Banking', required: true })
  }

  if (a.incomeSources.includes('stocks') || a.soldAssets.includes('stocks')) {
    docs.push({ name: 'Capital Gain Statement from Broker', category: 'Capital Gains', required: true, note: 'Zerodha / Groww / Upstox / Angelone' })
    docs.push({ name: 'Broker P&L Report', category: 'Capital Gains', required: true })
  }

  if (a.incomeSources.includes('mutual_funds') || a.soldAssets.includes('mutual_funds')) {
    docs.push({ name: 'Capital Gain Statement — CAMS / KFintech', category: 'Capital Gains', required: true })
    docs.push({ name: 'Consolidated Account Statement (CAS)', category: 'Capital Gains', required: false })
  }

  if (a.soldAssets.includes('property')) {
    docs.push({ name: 'Sale Deed / Purchase Deed', category: 'Property', required: true })
    docs.push({ name: 'Stamp Duty Receipt', category: 'Property', required: true })
    docs.push({ name: 'Property Valuation Certificate (for LTCG)', category: 'Property', required: false })
    docs.push({ name: 'Improvement Cost Records', category: 'Property', required: false })
  }

  if (a.soldAssets.includes('gold')) {
    docs.push({ name: 'Gold Purchase Invoice / Valuation Report', category: 'Capital Gains', required: true })
    docs.push({ name: 'Sale Invoice for Gold', category: 'Capital Gains', required: true })
  }

  if (a.incomeSources.includes('rental')) {
    docs.push({ name: 'Rental Agreement', category: 'Property', required: true })
    docs.push({ name: 'Municipal Tax / Property Tax Receipts', category: 'Property', required: false })
  }

  if (a.incomeSources.includes('freelance') || a.incomeSources.includes('professional')) {
    docs.push({ name: 'Invoice Summary / Income Summary', category: 'Business', required: true })
    docs.push({ name: 'TDS Certificates (Form 16A)', category: 'Tax', required: true })
    docs.push({ name: 'Bank Statements (all accounts)', category: 'Banking', required: true })
  }

  if (a.incomeSources.includes('business') || a.selfEmployed) {
    docs.push({ name: 'Profit & Loss Statement', category: 'Business', required: true })
    docs.push({ name: 'Balance Sheet', category: 'Business', required: true })
    docs.push({ name: 'GST Returns (if GST registered)', category: 'Tax', required: false })
    docs.push({ name: 'Business Bank Statements', category: 'Banking', required: true })
  }

  if (a.foreignAssets || a.incomeSources.includes('foreign')) {
    docs.push({ name: 'Foreign Income Proof / Pay Slips', category: 'Foreign', required: true })
    docs.push({ name: 'Foreign Bank Account Statements', category: 'Foreign', required: true })
    docs.push({ name: 'Foreign Tax Paid Certificate', category: 'Foreign', required: false })
    docs.push({ name: 'DTAA Documents (if claiming treaty benefit)', category: 'Foreign', required: false })
  }

  if (a.incomeSources.includes('crypto')) {
    docs.push({ name: 'Cryptocurrency Transaction History', category: 'Capital Gains', required: true })
    docs.push({ name: 'Exchange Statements (CoinDCX / WazirX / Binance)', category: 'Capital Gains', required: true })
  }

  // Deduplicate by name
  return [...new Map(docs.map(d => [d.name, d])).values()]
}

// ── Map to IncomeType[] for lead creation ──────────────────────────────────

export function answersToIncomeTypes(a: AssessmentAnswers): IncomeType[] {
  const types = new Set<IncomeType>()
  if (a.hasSalary) types.add('salary')
  if (a.incomeSources.includes('business') || a.selfEmployed) types.add('business')
  if (a.incomeSources.includes('freelance') || a.incomeSources.includes('professional')) types.add('freelance')
  if (a.incomeSources.includes('rental')) types.add('rental')
  if (a.incomeSources.includes('stocks') || a.incomeSources.includes('mutual_funds') || a.soldAssets.some(s => s !== 'none')) types.add('capital_gains')
  if (a.incomeSources.includes('stocks') && a.incomeSources.includes('fno_trading')) types.add('fno')
  if (a.foreignAssets || a.incomeSources.includes('foreign')) types.add('foreign')
  if (a.incomeSources.includes('interest') || a.incomeSources.includes('fd') || a.incomeSources.includes('crypto') || a.incomeSources.includes('agricultural')) types.add('other')
  return Array.from(types)
}

// ── Firestore storage ──────────────────────────────────────────────────────

export async function saveAssessment(data: {
  answers: AssessmentAnswers
  result: AssessmentResult
  leadInfo?: { name: string; phone: string; email: string }
  leadId?: string
}): Promise<string> {
  const ref = doc(collection(db, 'assessments'))
  await setDoc(ref, {
    answers: data.answers,
    recommendedItr: data.result.itr,
    confidence: data.result.confidence,
    complexity: data.result.complexity,
    requiredDocs: data.result.requiredDocs.map(d => d.name),
    leadInfo: data.leadInfo ?? null,
    leadId: data.leadId ?? null,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function linkAssessmentToLead(assessmentId: string, leadId: string, leadInfo: { name: string; phone: string; email: string }): Promise<void> {
  await updateDoc(doc(db, 'assessments', assessmentId), { leadId, leadInfo })
}
