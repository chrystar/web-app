#!/bin/bash

# Verify Guest Authentication Implementation
# Run this to check if all files are in place

echo ""
echo "🔐 Guest Authentication Implementation Verification"
echo "===================================================="
echo ""

# Files to check
declare -a files=(
    "lib/guest-auth.ts"
    "app/components/GuestAuthModal.tsx"
    "app/page.tsx"
    "app/checkout/page.tsx"
    "scripts/create_guest_users_table.sql"
    "GUEST_AUTH_SETUP.md"
    "GUEST_AUTH_IMPLEMENTATION.md"
    "GUEST_AUTH_GUIDE.md"
)

echo "📋 Checking implementation files..."
echo ""

missing=0
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        lines=$(wc -l < "$file" 2>/dev/null || echo "?")
        printf "✅ %-50s (%s lines)\n" "$file" "$lines"
    else
        printf "❌ %-50s MISSING\n" "$file"
        ((missing++))
    fi
done

echo ""
echo "=================================================="
echo ""

if [ $missing -eq 0 ]; then
    echo "✅ All implementation files are in place!"
    echo ""
    echo "📝 Next Steps:"
    echo ""
    echo "1. Set up Supabase table:"
    echo "   → Run SQL from: scripts/create_guest_users_table.sql"
    echo ""
    echo "2. Enable RLS policies:"
    echo "   → Table: guest_users"
    echo "   → Operations: SELECT, INSERT, UPDATE, DELETE"
    echo "   → Expression: true (allow all)"
    echo ""
    echo "3. Start dev server:"
    echo "   → npm run dev"
    echo ""
    echo "4. Test the flow:"
    echo "   → Click Checkout button on home page"
    echo "   → Sign up with test data"
    echo "   → Verify redirect to checkout with auto-filled form"
    echo ""
    echo "📚 Documentation:"
    echo "   • GUEST_AUTH_GUIDE.md - Complete overview"
    echo "   • GUEST_AUTH_SETUP.md - Detailed setup"
    echo "   • GUEST_AUTH_IMPLEMENTATION.md - Summary"
    echo ""
else
    echo "⚠️  Missing $missing file(s)"
    echo ""
    echo "Please run setup again or check file locations."
    echo ""
fi

echo ""
