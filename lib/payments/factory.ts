import 'server-only'
import type { PaymentProvider } from './provider'
import { CashfreePaymentProvider } from './cashfree'
import { MockPaymentProvider } from './mock'

let mock: MockPaymentProvider | undefined

export function getPaymentProvider():PaymentProvider{
  if(process.env.PAYMENT_PROVIDER==='cashfree') return new CashfreePaymentProvider()
  mock??=new MockPaymentProvider()
  return mock
}
