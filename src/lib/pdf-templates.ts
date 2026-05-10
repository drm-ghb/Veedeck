/**
 * PDF template system for shopping lists.
 * Violet: fully implemented. Editorial / Atelier / Architect / Linen: stubs (render as Violet).
 */

export type PdfTemplate = "violet" | "editorial" | "atelier" | "architect" | "linen";
export const PDF_TEMPLATES: PdfTemplate[] = ["violet", "editorial", "atelier", "architect", "linen"];
export type Lang = "pl" | "en";

type RGB = [number, number, number];

// ─── i18n strings used inside PDF ────────────────────────────────────────────
const STR = {
  pl: {
    preparedBy: "Oferta przygotowana przez",
    preparedFor: "Oferta przygotowana dla",
    contact: "Dane kontaktowe",
    dateLabel: "Data oferty",
    project: "Projekt",
    grandTotal: "Suma całkowita",
    noImage: "brak zdj.",
    supplier: "Dostawca",
    manufacturer: "Producent",
    dimension: "Wymiar",
    color: "Kolor",
    qty: "Ilość",
    unit: "szt.",
    remaining: "Pozostałe",
  },
  en: {
    preparedBy: "Prepared by",
    preparedFor: "Prepared for",
    contact: "Contact",
    dateLabel: "Date",
    project: "Project",
    grandTotal: "Grand total",
    noImage: "no image",
    supplier: "Supplier",
    manufacturer: "Manufacturer",
    dimension: "Size",
    color: "Color",
    qty: "Qty",
    unit: "pcs.",
    remaining: "Other",
  },
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────
interface Product {
  id: string;
  name: string;
  url?: string | null;
  imageUrl?: string | null;
  price?: string | null;
  manufacturer?: string | null;
  color?: string | null;
  dimensions?: string | null;
  supplier?: string | null;
  quantity: number;
  hidden?: boolean;
}

interface Section {
  id: string;
  name: string;
  unsorted?: boolean;
  products: Product[];
}

export interface GeneratePdfOptions {
  template: PdfTemplate;
  lang: Lang;
  list: {
    name: string;
    project?: {
      title?: string;
      clientName?: string | null;
      addressStreet?: string | null;
      addressCity?: string | null;
      addressPostalCode?: string | null;
      addressCountry?: string | null;
    } | null;
  };
  sections: Section[];
  designerName?: string;
  designerEmail?: string;
  designerLogoUrl?: string;
  grandTotal: number;
  grandCurrency: string;
  hasTotal: boolean;
  imgCache?: Record<string, string>;
  logoDataUrl?: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtNum(n: number, lang: Lang) {
  return n.toLocaleString(lang === "pl" ? "pl-PL" : "en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function fmtDate(lang: Lang) {
  return new Date().toLocaleDateString(lang === "pl" ? "pl-PL" : "en-US");
}

function parsePrice(price?: string | null): number | null {
  if (!price) return null;
  const match = price.replace(/\s/g, "").replace(",", ".").match(/[\d.]+/);
  return match ? parseFloat(match[0]) : null;
}

function getCurrency(price?: string | null): string {
  if (!price) return "";
  const match = price.match(/[A-Z]{2,3}|zł|€|\$|£/);
  return match ? match[0] : "";
}

async function loadImgToDataUrl(src: string): Promise<string | null> {
  try {
    const res = await fetch(src);
    if (!res.ok) return null;
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth || 200;
          canvas.height = img.naturalHeight || 200;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/jpeg", 0.85));
        } catch {
          resolve(null);
        } finally {
          URL.revokeObjectURL(objectUrl);
        }
      };
      img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(null); };
      img.src = objectUrl;
    });
  } catch {
    return null;
  }
}

async function toBase64(url: string): Promise<string> {
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function buildExportSections(sections: Section[], remainingLabel: string) {
  const regular = sections.filter((s) => !s.unsorted);
  const unsortedProducts = sections
    .filter((s) => s.unsorted)
    .flatMap((s) => s.products.filter((p) => !p.hidden));
  return [
    ...regular,
    ...(unsortedProducts.length > 0
      ? [{ id: "__unsorted__", name: remainingLabel, unsorted: false, products: unsortedProducts }]
      : []),
  ];
}

function buildAddressLines(project?: GeneratePdfOptions["list"]["project"]): string[] {
  if (!project) return [];
  const lines: string[] = [];
  if (project.addressStreet) lines.push(project.addressStreet);
  const cityLine = [project.addressPostalCode, project.addressCity].filter(Boolean).join(" ");
  if (cityLine) lines.push(cityLine);
  if (project.addressCountry) lines.push(project.addressCountry);
  return lines;
}

// ─── Font loader (returns false if file not found) ────────────────────────────
async function loadFont(
  doc: import("jspdf").jsPDF,
  path: string,
  family: string,
  style: "normal" | "bold" | "italic"
): Promise<boolean> {
  try {
    const b64 = await toBase64(path);
    const filename = path.split("/").pop()!;
    doc.addFileToVFS(filename, b64);
    doc.addFont(filename, family, style);
    return true;
  } catch {
    return false;
  }
}

// ─── Public entry point ───────────────────────────────────────────────────────
export async function generateListPDF(opts: GeneratePdfOptions) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // Always load Geist as fallback
  const [geistReg, geistBold] = await Promise.all([
    toBase64("/fonts/Geist-Regular.ttf"),
    toBase64("/fonts/Geist-Bold.ttf"),
  ]);
  doc.addFileToVFS("Geist-Regular.ttf", geistReg);
  doc.addFont("Geist-Regular.ttf", "Geist", "normal");
  doc.addFileToVFS("Geist-Bold.ttf", geistBold);
  doc.addFont("Geist-Bold.ttf", "Geist", "bold");

  const exportSections = buildExportSections(opts.sections, STR[opts.lang].remaining);
  const allVisible = exportSections.flatMap((s) => s.products.filter((p) => !p.hidden));
  const imgCache: Record<string, string> = opts.imgCache ?? {};
  const logoDataUrl: string | null = opts.logoDataUrl ?? null;

  switch (opts.template) {
    case "editorial":
    case "atelier":
    case "architect":
    case "linen":
      // Stubs — render as Violet until implemented
      await renderViolet(doc, opts, exportSections, allVisible, imgCache, logoDataUrl);
      break;
    case "violet":
    default:
      await renderViolet(doc, opts, exportSections, allVisible, imgCache, logoDataUrl);
  }

  return doc;
}

// ─── Violet renderer ──────────────────────────────────────────────────────────
async function renderViolet(
  doc: import("jspdf").jsPDF,
  opts: GeneratePdfOptions,
  exportSections: Section[],
  allVisible: Product[],
  imgCache: Record<string, string>,
  logoDataUrl: string | null
) {
  const s = STR[opts.lang];
  const FONT = "Geist";

  const ACCENT: RGB = [79, 70, 229];
  const ACCENT_BG: RGB = [238, 242, 255];
  const DARK: RGB = [28, 28, 28];
  const MUTED: RGB = [110, 110, 110];
  const BORDER: RGB = [225, 225, 225];
  const WHITE: RGB = [255, 255, 255];

  const PAGE_W = 210;
  const PAGE_H = 297;
  const ML = 14;
  const MR = 14;
  const CW = PAGE_W - ML - MR;
  const IMG = 31;

  let y = 0;

  function ensureSpace(needed: number) {
    if (y + needed > PAGE_H - 14) {
      doc.addPage();
      y = 14;
    }
  }

  function fmt(n: number) {
    return fmtNum(n, opts.lang);
  }

  // ── Banner ─────────────────────────────────────────────────────────────────
  const today = fmtDate(opts.lang);
  const addressLines = buildAddressLines(opts.list.project);
  const LINE_H = 5;
  const LABEL_H = 4.5;
  const SECTION_PAD = 3;
  const leftLines = 2;
  const rightLines = opts.list.project?.clientName
    ? 1 + addressLines.length
    : addressLines.length;
  const leftH = LABEL_H + SECTION_PAD + leftLines * LINE_H;
  const rightH = LABEL_H + SECTION_PAD + (rightLines > 0 ? rightLines * LINE_H : LINE_H);
  const BANNER_H = Math.max(leftH, rightH) + SECTION_PAD * 2 + 4;

  doc.setFillColor(...ACCENT);
  doc.rect(0, 0, PAGE_W, BANNER_H, "F");

  const MID = PAGE_W / 2;
  doc.setDrawColor(165, 180, 252);
  doc.setLineWidth(0.3);
  doc.line(MID, 5, MID, BANNER_H - 5);

  const COL_W = MID - ML - 4;

  // Left column
  let lx = ML;
  let ly = 6;
  const LOGO_SIZE = 12;
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "JPEG", lx, ly, LOGO_SIZE, LOGO_SIZE);
      lx += LOGO_SIZE + 3;
    } catch { /* skip */ }
  }

  doc.setFont(FONT, "normal");
  doc.setFontSize(7);
  doc.setTextColor(199, 210, 254);
  doc.text(s.preparedBy, lx, ly + 3);

  doc.setFont(FONT, "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...WHITE);
  doc.text(opts.designerName ?? "Projektant", lx, ly + 3 + LINE_H + 1.5);

  if (opts.designerEmail) {
    const contactY = ly + 3 + LINE_H * 2 + 2;
    doc.setFont(FONT, "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(199, 210, 254);
    doc.text(s.contact, lx, contactY);
    doc.setFontSize(8);
    doc.text(opts.designerEmail, lx, contactY + LINE_H);
  }

  // Date
  doc.setFont(FONT, "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...WHITE);
  doc.text(`${s.dateLabel}: ${today}`, PAGE_W - MR, 9, { align: "right" });

  // Right column
  const rx = MID + 4;
  let ry = 6;

  doc.setFont(FONT, "normal");
  doc.setFontSize(7);
  doc.setTextColor(199, 210, 254);
  doc.text(s.preparedFor, rx, ry + 3);

  ry += 3 + LINE_H + 1.5;

  if (opts.list.project?.clientName) {
    doc.setFont(FONT, "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...WHITE);
    doc.text(opts.list.project.clientName, rx, ry, { maxWidth: COL_W });
    ry += LINE_H + 1;
  }

  if (addressLines.length > 0) {
    doc.setFont(FONT, "normal");
    doc.setFontSize(8);
    doc.setTextColor(199, 210, 254);
    for (const line of addressLines) {
      doc.text(line, rx, ry, { maxWidth: COL_W });
      ry += LINE_H;
    }
  }

  // ── Title ──────────────────────────────────────────────────────────────────
  y = BANNER_H + 12;
  doc.setFont(FONT, "bold");
  doc.setFontSize(13);
  doc.setTextColor(...DARK);
  doc.text(opts.list.name, ML, y);

  if (opts.list.project?.title) {
    doc.setFont(FONT, "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text(`${s.project}: ${opts.list.project.title}`, PAGE_W - MR, y, { align: "right" });
  }

  y += 9;

  // ── Sections ───────────────────────────────────────────────────────────────
  for (const section of exportSections) {
    const products = section.products.filter((p) => !p.hidden);
    if (products.length === 0) continue;

    ensureSpace(16);

    // Section header
    doc.setFillColor(...ACCENT_BG);
    doc.roundedRect(ML, y, CW, 9, 2, 2, "F");
    doc.setFillColor(...ACCENT);
    doc.roundedRect(ML, y, 5, 9, 2, 2, "F");
    doc.rect(ML + 2, y, 3, 9, "F");

    doc.setFont(FONT, "bold");
    doc.setFontSize(9);
    doc.setTextColor(...ACCENT);
    doc.text(section.name.toUpperCase(), ML + 7, y + 6);

    const secTotal = products.reduce((sum, p) => {
      const n = parsePrice(p.price);
      return n !== null ? sum + n * p.quantity : sum;
    }, 0);
    const secCur = getCurrency(products.find((p) => getCurrency(p.price))?.price ?? null);
    if (secTotal > 0) {
      doc.setFont(FONT, "bold");
      doc.setFontSize(9);
      doc.setTextColor(...ACCENT);
      doc.text(`${fmt(secTotal)} ${secCur}`, ML + CW - 2, y + 6, { align: "right" });
    }

    y += 13;

    // Products
    const PRICE_COL = 44;
    const TEXT_X = ML + IMG + 4;
    const TEXT_W = CW - IMG - 4 - PRICE_COL - 4;
    const PRICE_X = ML + CW;

    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      ensureSpace(IMG + 4);

      const rowY = y;

      // Image
      doc.setFillColor(...BORDER);
      doc.rect(ML, rowY, IMG, IMG, "F");

      if (imgCache[p.id]) {
        try {
          doc.addImage(imgCache[p.id], "JPEG", ML, rowY, IMG, IMG);
        } catch { /* skip */ }
      } else {
        doc.setFont(FONT, "normal");
        doc.setFontSize(7);
        doc.setTextColor(...MUTED);
        doc.text(s.noImage, ML + IMG / 2, rowY + IMG / 2 + 1, { align: "center" });
      }

      if (p.url) doc.link(ML, rowY, IMG, IMG, { url: p.url });

      // Text column
      let cy = rowY + 4;

      doc.setFont(FONT, "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(...DARK);
      const nameLines = (doc.splitTextToSize(p.name, TEXT_W) as string[]).slice(0, 2);
      doc.text(nameLines, TEXT_X, cy);
      cy += nameLines.length * 5.2;

      const detailRows: [string, string][] = [];
      if (p.supplier) detailRows.push([s.supplier, p.supplier]);
      if (p.manufacturer) detailRows.push([s.manufacturer, p.manufacturer]);
      if (p.dimensions) detailRows.push([s.dimension, p.dimensions]);
      if (p.color) detailRows.push([s.color, p.color]);
      detailRows.push([s.qty, `${p.quantity} ${s.unit}`]);

      doc.setFont(FONT, "normal");
      doc.setFontSize(7.5);
      for (const [label, value] of detailRows) {
        doc.setTextColor(...MUTED);
        doc.text(`${label}: `, TEXT_X, cy);
        const labelW = doc.getTextWidth(`${label}: `);
        doc.setTextColor(...DARK);
        doc.text(value, TEXT_X + labelW, cy, { maxWidth: TEXT_W - labelW });
        cy += 4.2;
      }

      // Price column
      const unit = parsePrice(p.price);
      const cur = getCurrency(p.price);
      if (unit !== null) {
        const total = unit * p.quantity;
        doc.setFont(FONT, "bold");
        doc.setFontSize(10);
        doc.setTextColor(...DARK);
        doc.text(`${fmt(total)} ${cur}`, PRICE_X, rowY + 6, { align: "right" });

        if (p.quantity > 1) {
          doc.setFont(FONT, "normal");
          doc.setFontSize(7.5);
          doc.setTextColor(...MUTED);
          doc.text(`${p.quantity} × ${fmt(unit)} ${cur}`, PRICE_X, rowY + 11.5, { align: "right" });
        }
      } else if (p.quantity > 1) {
        doc.setFont(FONT, "normal");
        doc.setFontSize(8);
        doc.setTextColor(...MUTED);
        doc.text(`${p.quantity} ${s.unit}`, PRICE_X, rowY + 6, { align: "right" });
      }

      // External link icon
      if (p.url) {
        const ICO = 5;
        const PX = 32;
        const ix = PRICE_X - ICO;
        const iy = rowY + IMG - ICO - 2;
        try {
          const cv = document.createElement("canvas");
          cv.width = PX;
          cv.height = PX;
          const ctx = cv.getContext("2d")!;
          const scale = PX / 24;
          ctx.scale(scale, scale);
          ctx.strokeStyle = `rgb(${ACCENT[0]},${ACCENT[1]},${ACCENT[2]})`;
          ctx.lineWidth = 2;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.stroke(new Path2D("M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"));
          ctx.stroke(new Path2D("M15 3h6v6"));
          ctx.stroke(new Path2D("M10 14L21 3"));
          doc.addImage(cv.toDataURL("image/png"), "PNG", ix, iy, ICO, ICO);
        } catch { /* skip */ }
        doc.link(ix, iy, ICO, ICO, { url: p.url });
      }

      y = rowY + IMG + 5;

      if (i < products.length - 1) {
        doc.setDrawColor(...BORDER);
        doc.setLineWidth(0.2);
        doc.line(TEXT_X, y, ML + CW, y);
        y += 2;
      }
    }

    y += 9;
  }

  // ── Grand total ────────────────────────────────────────────────────────────
  if (opts.hasTotal) {
    ensureSpace(13);
    doc.setFillColor(...ACCENT);
    doc.rect(ML, y, CW, 11, "F");
    doc.setFont(FONT, "bold");
    doc.setFontSize(10);
    doc.setTextColor(...WHITE);
    doc.text(s.grandTotal, ML + 5, y + 7.5);
    doc.text(
      `${fmtNum(opts.grandTotal, opts.lang)} ${opts.grandCurrency}`,
      ML + CW - 5,
      y + 7.5,
      { align: "right" }
    );
  }

  // ── Page numbers ───────────────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let pg = 1; pg <= totalPages; pg++) {
    doc.setPage(pg);
    doc.setFont(FONT, "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(`${pg} / ${totalPages}`, PAGE_W / 2, PAGE_H - 5, { align: "center" });
  }
}
