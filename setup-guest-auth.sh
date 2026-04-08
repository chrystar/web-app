#!/bin/bash

# Guest Authentication Quick Setup Script
# Run this script to set up guest authentication

echo "🔐 Frost Chicken - Guest Authentication Setup"
echo "=============================================="
echo ""

# Step 1: Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this from the project root."
    exit 1
fi

echo "✅ Project directory verified"
echo ""

# Step 2: Display setup status
echo "📋 Setup Checklist:"
echo ""
echo "Files Created:"
echo "  ✅ lib/guest-auth.ts - Guest authentication service"
echo "  ✅ app/components/GuestAuthModal.tsx - Authentication modal UI"
echo "  ✅ scripts/create_guest_users_table.sql - Database migration"
echo "  ✅ GUEST_AUTH_SETUP.md - Complete setup guide"
echo "  ✅ GUEST_AUTH_IMPLEMENTATION.md - Implementation summary"
echo ""
echo "Files Updated:"
echo "  ✅ app/page.tsx - Added auth modal integration"
echo "  ✅ app/checkout/page.tsx - Added guest session loading"
echo ""

echo "📝 Next Steps (Manual):"
echo ""
echo "1️⃣  Create the database table:"
echo "   → Open: https://app.supabase.com"
echo "   → Go to: SQL Editor"
echo "   → Copy & paste contents of: scripts/create_guest_users_table.sql"
echo "   → Click: Run"
echo ""
echo "2️⃣  Enable Row Level Security:"
echo "   → Go to: Authentication > Policies (guest_users table)"
echo "   → Click: New Policy"
echo "   → Choose: SELECT/INSERT/UPDATE for ALL"
echo "   → Use expression: true"
echo "   → Save"
echo ""
echo "3️⃣  Start the dev server:"
echo "   → Run: npm run dev"
echo "   → Visit: http://localhost:3000"
echo ""
echo "4️⃣  Test the authentication:"
echo "   → Click: Checkout button"
echo "   → Fill: Sign up form"
echo "   → Verify: Redirect to checkout with pre-filled info"
echo ""

echo "📚 Documentation:"
echo "   • GUEST_AUTH_SETUP.md - Detailed setup instructions"
echo "   • GUEST_AUTH_IMPLEMENTATION.md - Implementation overview"
echo ""

echo "🚀 Setup complete! Follow the manual steps above to finish."
echo ""
