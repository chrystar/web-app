import { bannerService } from '@/lib/banner-service';
import { requireAdmin } from '@/lib/admin-guard';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const banners = await bannerService.getBanners();
    return NextResponse.json(banners);
  } catch (error) {
    console.error('Error fetching banners:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch banners', details: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request);
    if (adminCheck.error) {
      return adminCheck.error;
    }

    const body = await request.json();

    const { title, description, image_url, link_url, is_active, sort_order } = body;

    if (!image_url) {
      return NextResponse.json({ error: 'image_url is required' }, { status: 400 });
    }

    const newBanner = await bannerService.createBanner({
      title: String(title || '').trim(),
      description: description || null,
      image_url,
      link_url: link_url || null,
      is_active: is_active !== undefined ? is_active : true,
      sort_order: sort_order || 0,
    });

    return NextResponse.json(newBanner, { status: 201 });
  } catch (error) {
    console.error('Error creating banner:', error);
    return NextResponse.json({ error: 'Failed to create banner' }, { status: 500 });
  }
}
