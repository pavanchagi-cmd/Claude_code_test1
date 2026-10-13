'use client';

import * as Dialog from '@radix-ui/react-dialog';

/**
 * Stand-in for Razorpay Checkout when RAZORPAY_KEY_ID is not configured
 * (local dev and previews). It never runs once real keys are set.
 */
export function MockPaymentDialog({ amountLabel, method, onSuccess, onFailure }: { amountLabel: string; method: string; onSuccess: () => void; onFailure: () => void }) {
  return (
    <Dialog.Root open onOpenChange={(o) => !o && onFailure()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/60" />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 z-50 w-[92vw] max-w-[420px] -translate-x-1/2 -translate-y-1/2 bg-surface p-7 focus:outline-none"
          data-testid="mock-payment"
        >
          <p className="eyebrow">Test mode · mock payment gateway</p>
          <Dialog.Title className="mt-2 font-display text-[28px]">Pay {amountLabel}</Dialog.Title>
          <Dialog.Description className="mt-2 text-[15px] text-muted">Razorpay keys are not configured, so this simulates the {method} payment. No money moves.</Dialog.Description>
          <div className="mt-6 flex flex-col gap-2">
            <button type="button" className="btn btn-primary btn-lg" onClick={onSuccess}>
              Simulate successful payment
            </button>
            <button type="button" className="btn btn-outline" onClick={onFailure}>
              Simulate failure / cancel
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
