// Minimaler 5-Feld-Cron-Matcher (Minute Stunde Tag-im-Monat Monat Wochentag).
// Unterstützt: *  a  a-b  *​/n  a-b/n  und Listen x,y,z (auch kombiniert).
// Bewusst dependency-frei (self-hostable, kein Vendor-Lock). Auswertung in Server-Lokalzeit.
// Hinweis: dom/dow werden mit UND verknüpft (für M1 ausreichend; meist nutzt man nur eines).

function fieldMatches(field: string, value: number, min: number, max: number): boolean {
  for (const part of field.split(",")) {
    let range = part;
    let step = 1;
    if (part.includes("/")) {
      const [r, s] = part.split("/");
      range = r;
      step = parseInt(s, 10) || 1;
    }
    let lo: number;
    let hi: number;
    if (range === "*") {
      lo = min;
      hi = max;
    } else if (range.includes("-")) {
      const [a, b] = range.split("-");
      lo = parseInt(a, 10);
      hi = parseInt(b, 10);
    } else {
      lo = parseInt(range, 10);
      hi = lo;
    }
    if (Number.isNaN(lo)) continue;
    if (Number.isNaN(hi)) hi = lo;
    for (let v = lo; v <= hi; v += step) {
      if (v === value) return true;
    }
  }
  return false;
}

/** True, wenn der Cron-Ausdruck auf das (Minuten-genaue) Datum passt. */
export function cronMatches(expr: string, date: Date): boolean {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  const [min, hour, dom, month, dow] = parts;
  return (
    fieldMatches(min, date.getMinutes(), 0, 59) &&
    fieldMatches(hour, date.getHours(), 0, 23) &&
    fieldMatches(dom, date.getDate(), 1, 31) &&
    fieldMatches(month, date.getMonth() + 1, 1, 12) &&
    fieldMatches(dow, date.getDay(), 0, 6)
  );
}
