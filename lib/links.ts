/** wa.me link with a prefilled message. */
export function waLink(numberDigits: string, message: string) {
  return `https://wa.me/${numberDigits}?text=${encodeURIComponent(message)}`;
}
