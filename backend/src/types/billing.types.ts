export type PaymentGateway = 'stripe' | 'razorpay'

export interface CreateCheckoutInput {
  accountId: string
  userId: string
  email: string
  gateway: PaymentGateway
  successUrl: string
  cancelUrl: string
}

export interface BillingStatus {
  plan: 'free' | 'pro'
  gateway: PaymentGateway | null
  currentPeriodEnd: Date | null
  cancelAtPeriodEnd: boolean
  // What the user can do to manage their sub
  portalUrl?: string
}

// Razorpay subscription statuses
export type RazorpaySubStatus =
  | 'created'
  | 'authenticated'
  | 'active'
  | 'pending'
  | 'halted'
  | 'cancelled'
  | 'completed'
  | 'expired'
