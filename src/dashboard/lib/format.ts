/** Dates as Brisbane staff read them. Safe on the server and in the browser. */
export function when(iso: string): string {
  return new Date(iso).toLocaleString('en-AU', {
    timeZone: 'Australia/Brisbane', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}
