import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type StoryPage = { text?: string };

// pdf-lib standard fonts use WinAnsi. Strip characters they can't encode
// (emoji, some unicode) so the render doesn't throw. We keep the emoji on
// the cover of each story as a visual moment by drawing it as a decorative
// large glyph name only when it survives sanitisation; otherwise skip.
function sanitize(input: string): string {
  // Replace fancy punctuation with ASCII, strip anything outside Latin-1.
  return input
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, "");
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export const generateStoryBookPdf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { childId: string; year: number; storyIds: string[] }) => {
      if (!input.childId) throw new Error("childId required");
      if (!Array.isArray(input.storyIds) || input.storyIds.length === 0) {
        throw new Error("Select at least one story");
      }
      if (input.storyIds.length > 60) {
        throw new Error("Please choose 60 stories or fewer per book");
      }
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: child, error: childErr } = await supabase
      .from("children")
      .select("id, first_name, avatar_emoji")
      .eq("id", data.childId)
      .eq("user_id", userId)
      .maybeSingle();
    if (childErr || !child) throw new Error("Child not found");

    const { data: stories, error: storiesErr } = await supabase
      .from("stories")
      .select("id, title, cover_emoji, pages, created_at, theme")
      .eq("user_id", userId)
      .eq("child_id", data.childId)
      .in("id", data.storyIds)
      .order("created_at", { ascending: true });
    if (storiesErr) throw new Error(storiesErr.message);
    if (!stories || stories.length === 0) {
      throw new Error("No stories found for that selection");
    }

    const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
    const pdfDoc = await PDFDocument.create();
    const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const italic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    const PAGE_W = 595.28; // A4
    const PAGE_H = 841.89;
    const MARGIN = 64;
    const CONTENT_W = PAGE_W - MARGIN * 2;

    const ink = rgb(0.16, 0.12, 0.29); // deep purple
    const muted = rgb(0.42, 0.37, 0.55);
    const accent = rgb(0.23, 0.17, 0.44);
    const cream = rgb(0.98, 0.96, 1);

    // ---------- Cover page ----------
    const cover = pdfDoc.addPage([PAGE_W, PAGE_H]);
    cover.drawRectangle({
      x: 0,
      y: 0,
      width: PAGE_W,
      height: PAGE_H,
      color: cream,
    });
    // Decorative frame
    cover.drawRectangle({
      x: 40,
      y: 40,
      width: PAGE_W - 80,
      height: PAGE_H - 80,
      borderColor: accent,
      borderWidth: 1.5,
    });
    cover.drawRectangle({
      x: 52,
      y: 52,
      width: PAGE_W - 104,
      height: PAGE_H - 104,
      borderColor: accent,
      borderWidth: 0.5,
    });

    const childName = sanitize(child.first_name);
    const kicker = "ADVENTURE CLUB";
    const kickerWidth = regular.widthOfTextAtSize(kicker, 11);
    cover.drawText(kicker, {
      x: (PAGE_W - kickerWidth) / 2,
      y: PAGE_H - 160,
      size: 11,
      font: regular,
      color: muted,
      // pdf-lib doesn't do letter-spacing on plain drawText; leave spacing to font
    });

    const titleLine1 = `${childName}'s`;
    const titleLine2 = "Adventure Book";
    const titleSize = 40;
    const t1w = bold.widthOfTextAtSize(titleLine1, titleSize);
    const t2w = bold.widthOfTextAtSize(titleLine2, titleSize);
    cover.drawText(titleLine1, {
      x: (PAGE_W - t1w) / 2,
      y: PAGE_H - 240,
      size: titleSize,
      font: bold,
      color: ink,
    });
    cover.drawText(titleLine2, {
      x: (PAGE_W - t2w) / 2,
      y: PAGE_H - 290,
      size: titleSize,
      font: bold,
      color: ink,
    });

    const yearText = String(data.year);
    const yearW = italic.widthOfTextAtSize(yearText, 22);
    cover.drawText(yearText, {
      x: (PAGE_W - yearW) / 2,
      y: PAGE_H - 340,
      size: 22,
      font: italic,
      color: muted,
    });

    // Avatar circle (emoji itself can't render with standard fonts)
    const circleR = 60;
    const circleCX = PAGE_W / 2;
    const circleCY = PAGE_H / 2 - 60;
    cover.drawCircle({
      x: circleCX,
      y: circleCY,
      size: circleR,
      color: rgb(0.93, 0.89, 1),
      borderColor: accent,
      borderWidth: 1.5,
    });
    const initial = sanitize(childName.charAt(0).toUpperCase() || "*") || "*";
    const initSize = 60;
    const initW = bold.widthOfTextAtSize(initial, initSize);
    cover.drawText(initial, {
      x: circleCX - initW / 2,
      y: circleCY - initSize / 3,
      size: initSize,
      font: bold,
      color: accent,
    });

    const countLine = `A collection of ${stories.length} bedtime ${stories.length === 1 ? "story" : "stories"}`;
    const clw = italic.widthOfTextAtSize(countLine, 13);
    cover.drawText(countLine, {
      x: (PAGE_W - clw) / 2,
      y: 140,
      size: 13,
      font: italic,
      color: muted,
    });

    // ---------- Helper: wrap text ----------
    function wrapText(text: string, font: typeof regular, size: number, maxW: number): string[] {
      const words = text.split(/\s+/);
      const lines: string[] = [];
      let current = "";
      for (const word of words) {
        const attempt = current ? `${current} ${word}` : word;
        if (font.widthOfTextAtSize(attempt, size) <= maxW) {
          current = attempt;
        } else {
          if (current) lines.push(current);
          current = word;
        }
      }
      if (current) lines.push(current);
      return lines;
    }

    // ---------- Story pages ----------
    for (const [i, story] of stories.entries()) {
      const title = sanitize(story.title || "Untitled");
      const dateLabel = `Written on ${formatDate(story.created_at)}`;
      const pagesArr: StoryPage[] = Array.isArray(story.pages)
        ? (story.pages as StoryPage[])
        : [];
      const body = sanitize(
        pagesArr
          .map((p) => (typeof p?.text === "string" ? p.text : ""))
          .filter(Boolean)
          .join("\n\n"),
      );

      // Story title page
      let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
      page.drawText(`Story ${i + 1}`, {
        x: MARGIN,
        y: PAGE_H - MARGIN - 20,
        size: 11,
        font: regular,
        color: muted,
      });

      // Ornament dot (stand-in for cover emoji glyph)
      page.drawCircle({
        x: PAGE_W / 2,
        y: PAGE_H - 220,
        size: 22,
        color: rgb(0.95, 0.9, 1),
        borderColor: accent,
        borderWidth: 1,
      });

      const titleLines = wrapText(title, bold, 28, CONTENT_W);
      let ty = PAGE_H - 300;
      for (const line of titleLines) {
        const lw = bold.widthOfTextAtSize(line, 28);
        page.drawText(line, {
          x: (PAGE_W - lw) / 2,
          y: ty,
          size: 28,
          font: bold,
          color: ink,
        });
        ty -= 34;
      }

      const dw = italic.widthOfTextAtSize(dateLabel, 12);
      page.drawText(dateLabel, {
        x: (PAGE_W - dw) / 2,
        y: ty - 12,
        size: 12,
        font: italic,
        color: muted,
      });

      // Story body pages (word-wrapped, paginated)
      const bodyLines = body
        .split(/\n+/)
        .flatMap((para) => {
          if (!para.trim()) return [""];
          const wrapped = wrapText(para, regular, 12, CONTENT_W);
          return [...wrapped, ""]; // blank line between paragraphs
        });

      const lineHeight = 18;
      const bodyTopY = PAGE_H - MARGIN - 40;
      const bodyBottomY = MARGIN + 40;
      let cursor = bodyTopY;
      type PdfPage = ReturnType<typeof pdfDoc.addPage>;
      let bodyPage: PdfPage | null = null;
      let pageNum = 0;

      const startBodyPage = (): PdfPage => {
        const p = pdfDoc.addPage([PAGE_W, PAGE_H]);
        pageNum += 1;
        p.drawText(title, {
          x: MARGIN,
          y: PAGE_H - MARGIN + 8,
          size: 9,
          font: italic,
          color: muted,
        });
        cursor = bodyTopY;
        bodyPage = p;
        return p;
      };

      const drawFooter = (p: PdfPage) => {
        const pn = `${pageNum}`;
        const pnw = regular.widthOfTextAtSize(pn, 9);
        p.drawText(pn, {
          x: (PAGE_W - pnw) / 2,
          y: MARGIN - 20,
          size: 9,
          font: regular,
          color: muted,
        });
      };

      let current: PdfPage | null =
        bodyLines.length > 0 ? startBodyPage() : null;
      for (const line of bodyLines) {
        if (!current || cursor < bodyBottomY) {
          if (current) drawFooter(current);
          current = startBodyPage();
        }
        current.drawText(line, {
          x: MARGIN,
          y: cursor,
          size: 12,
          font: regular,
          color: ink,
          maxWidth: CONTENT_W,
        });
        cursor -= lineHeight;
      }
      if (current) drawFooter(current);
      void bodyPage;
    }

    // ---------- Back page ----------
    const back = pdfDoc.addPage([PAGE_W, PAGE_H]);
    const closingKicker = "The end.";
    const ckw = italic.widthOfTextAtSize(closingKicker, 18);
    back.drawText(closingKicker, {
      x: (PAGE_W - ckw) / 2,
      y: PAGE_H / 2 + 20,
      size: 18,
      font: italic,
      color: muted,
    });
    const madeWith = "Made with Adventure Club";
    const mww = regular.widthOfTextAtSize(madeWith, 10);
    back.drawText(madeWith, {
      x: (PAGE_W - mww) / 2,
      y: 80,
      size: 10,
      font: regular,
      color: muted,
    });

    const bytes = await pdfDoc.save();
    // Return base64 so the RPC serializer can carry it back to the client.
    // Convert without allocating one huge string per byte.
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(
        ...bytes.subarray(i, Math.min(i + chunk, bytes.length)),
      );
    }
    const base64 =
      typeof btoa !== "undefined"
        ? btoa(binary)
        : Buffer.from(binary, "binary").toString("base64");

    const filename = `${childName.replace(/[^a-zA-Z0-9]+/g, "-")}-adventure-book-${data.year}.pdf`;
    return { base64, filename };
  });
