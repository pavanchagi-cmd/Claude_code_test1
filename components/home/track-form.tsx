export function TrackForm({ order = '', contact = '', heading = true }: { order?: string; contact?: string; heading?: boolean }) {
  return (
    <form action="/track-order" method="get" className="card p-8" aria-labelledby={heading ? 'track-heading' : undefined}>
      {heading && (
        <h2 id="track-heading" className="h2-section">
          Track your order
        </h2>
      )}
      <div className="mt-6 grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <div>
          <label htmlFor="track-order" className="label">
            Order number
          </label>
          <input id="track-order" name="order" required defaultValue={order} placeholder="#WS-2026-000123" className="input" />
        </div>
        <div>
          <label htmlFor="track-contact" className="label">
            Mobile or email used at checkout
          </label>
          <input id="track-contact" name="contact" required defaultValue={contact} className="input" />
        </div>
        <button type="submit" className="btn btn-primary min-h-12 px-7">
          Track
        </button>
      </div>
    </form>
  );
}
