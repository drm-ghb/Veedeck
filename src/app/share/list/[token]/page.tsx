import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ShareNavbar from "@/components/share/ShareNavbar";
import ShareListClient from "@/components/listy/ShareListClient";

function parsePrice(price: string | null): number | null {
  if (!price) return null;
  const num = parseFloat(price.replace(/[^\d.,]/g, "").replace(",", "."));
  return isNaN(num) ? null : num;
}

function getCurrency(price: string | null): string {
  if (!price) return "";
  return price.replace(/[\d.,\s]/g, "").trim();
}

export default async function PublicListPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const list = await prisma.shoppingList.findUnique({
    where: { shareToken: token },
    include: {
      project: {
        select: {
          id: true,
          title: true,
          shareToken: true,
          archived: true,
          renders: { select: { id: true }, take: 1 },
          user: { select: { clientLogoUrl: true, name: true } },
        },
      },
      sections: {
        orderBy: { order: "asc" },
        include: {
          products: {
            orderBy: { order: "asc" },
            include: { _count: { select: { comments: true } } },
          },
        },
      },
    },
  });

  if (!list || list.archived || list.project?.archived) notFound();

  const allProducts = list.sections.flatMap((s) => s.products);
  const grandTotal = allProducts.reduce((sum, p) => {
    const n = parsePrice(p.price);
    return n !== null ? sum + n * p.quantity : sum;
  }, 0);
  const grandCurrency = getCurrency(allProducts.find((p) => getCurrency(p.price))?.price ?? null);
  const hasTotal = allProducts.some((p) => parsePrice(p.price) !== null);

  const homeHref = list.project
    ? `/share/${list.project.shareToken}/home`
    : undefined;

  const sections = list.sections.map((s) => ({
    id: s.id,
    name: s.name,
    order: s.order,
    products: s.products.map((p) => ({
      id: p.id,
      name: p.name,
      url: p.url,
      imageUrl: p.imageUrl,
      price: p.price,
      manufacturer: p.manufacturer,
      color: p.color,
      size: p.size,
      description: p.description,
      deliveryTime: p.deliveryTime,
      quantity: p.quantity,
      order: p.order,
      commentCount: p._count.comments,
    })),
  }));

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <ShareNavbar
        backHref={homeHref}
        backLabel={list.project?.title}
        clientLogoUrl={list.project?.user?.clientLogoUrl}
        designerName={list.project?.user?.name}
      />

      <main className="flex-1 container mx-auto px-3 sm:px-6 max-w-6xl py-4 sm:py-8">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2 min-w-0">
            {list.project && (
              <>
                <a
                  href={`/share/${list.project.shareToken}/home`}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  {list.project.title}
                </a>
                <span className="text-muted-foreground">/</span>
              </>
            )}
            <h1 className="text-xl font-bold truncate">{list.name}</h1>
          </div>
          {hasTotal && (
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs text-muted-foreground">Suma:</span>
              <span className="text-sm font-semibold tabular-nums">
                {grandTotal.toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} {grandCurrency}
              </span>
            </div>
          )}
        </div>

        <ShareListClient
          listName={list.name}
          projectTitle={list.project?.title}
          projectShareToken={list.project?.shareToken}
          sections={sections}
          grandTotal={grandTotal}
          grandCurrency={grandCurrency}
          hasTotal={hasTotal}
        />
      </main>
    </div>
  );
}
