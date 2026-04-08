import { productService } from "@/lib/product-service";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get("category");
    const search = searchParams.get("search");

    let products;

    if (search) {
      products = await productService.searchProducts(search);
    } else if (category) {
      products = await productService.getProductsByCategory(category);
    } else {
      products = await productService.getProducts();
    }

    return NextResponse.json(products);
  } catch (error) {
    console.error("GET /api/products error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: "Failed to fetch products", details: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const product = await productService.createProduct({
      name: body.name,
      price: body.price,
      weight: body.weight,
      description: body.description,
      category: body.category,
      image_url: body.image_url,
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("POST /api/products error:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}
