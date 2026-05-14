/** Builds https://wa.me/... for chat deep links (digits only). */
function whatsappLink(raw) {
  if (raw == null || raw === "") return null;
  const digits = String(raw).replace(/\D/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}`;
}

module.exports = { whatsappLink };
