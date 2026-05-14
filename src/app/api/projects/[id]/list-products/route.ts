import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = getWorkspaceUserId(session);
  const { id } = await params;

  const project = await prisma.project.findFirst({
    where: { id, userId },
  });
  if (!project) {
    return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  }

  // Fetch all ListProducts that are linked to a catalog Product (productId != null)
  // from non-archived shopping lists of this project
  const lists = await prisma.shoppingList.findMany({
    where: { projectId: id, archived: false },
    include: {
      sections: {
        include: {
          products: {
            where: { productId: { not: null } },
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  imageUrl: true,
                  url: true,
                  price: true,
                  manufacturer: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const seen = new Set<string>();
  const products: {
    id: string;
    name: string;
    imageUrl: string | null;
    url: string | null;
    price: string | null;
    manufacturer: string | null;
  }[] = [];

  for (const list of lists) {
    for (const section of list.sections) {
      for (const lp of section.products) {
        if (!lp.product || seen.has(lp.product.id)) continue;
        seen.add(lp.product.id);
        products.push(lp.product);
      }
    }
  }

  return NextResponse.json({ products });
}
