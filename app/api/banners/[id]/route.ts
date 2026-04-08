import { bannerService } from '@/lib/banner-service';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    const banner = await bannerService.getBanner(parseInt(id));
    return NextResponse.json(banner);
  } catch (error) {
    console.error('Error fetching banner:', error);
    return NextResponse.json({ error: 'Banner not found' }, { status: 404 });
  }
}

export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    const body = await request.json();

    const { title, description, image_url, link_url, is_active, sort_order } = body;

    if (!image_url) {
      return NextResponse.json({ error: 'image_url is required' }, { status: 400 });
    }

    const updatedBanner = await bannerService.updateBanner(parseInt(id), {
      title: String(title || '').trim(),
      description: description || null,
      image_url,
      link_url: link_url || null,
      is_active: is_active !== undefined ? is_active : true,
      sort_order: sort_order || 0,
    });

    return NextResponse.json(updatedBanner);
  } catch (error) {
    console.error('Error updating banner:', error);
    return NextResponse.json({ error: 'Failed to update banner' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    await bannerService.deleteBanner(parseInt(id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting banner:', error);
    return NextResponse.json({ error: 'Failed to delete banner' }, { status: 500 });
  }
}
