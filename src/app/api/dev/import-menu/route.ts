import { NextRequest, NextResponse } from "next/server";
import { isRequestDevAuthenticated } from "@/lib/devAuth";
import { MenuItem, ModifierGroup } from "@/types";

export async function GET(req: NextRequest) {
  // Returns a pre-formatted sample CSV template for download
  const sampleCsv = `Category,Name,Price,Description,Tag,ImageUrl,Sizes,Modifiers
Deals,Family Mega Deal,2499,2 Large Pizzas with 1.5L Soft Drink,Value Deal,https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600,,Flavor: Chicken Tikka; Chicken Fajita | Drink: Cola; Sprite
Pizzas,Chicken Supreme,649,Tender chicken tikka with mushrooms olives and cheese,Chef Pick,https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=600,"Small: 649, Medium: 1399, Large: 1999",Crust: Standard; Cheese Crust (+250); Kabab Crust (+250)
Burgers,Crispy Zinger Burger,599,Golden fried chicken fillet with spicy mayo and lettuce,Popular,https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600,,Dip: Garlic Mayo; Chili Garlic; BBQ
Appetizers,Loaded Cheesy Fries,450,Crispy hand-cut fries smothered in melted mozzarella,Popular,https://images.unsplash.com/photo-1576107232684-1279f3908594?w=600,"Regular: 450, Sharing: 750",
Drinks,Fresh Mint Lemonade,250,Cold pressed fresh lemons with mint and crushed ice,Cold,https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600,,`;

  return new NextResponse(sampleCsv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="table_tapp_sample_menu.csv"',
    },
  });
}

// RFC 4180 Native CSV Parser: Replaces vulnerable SheetJS/xlsx dependency (Directive 7)
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (c === '"') {
        if (next === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        currentRow.push(currentField.trim());
        currentField = "";
      } else if (c === "\r") {
        // ignore CR
      } else if (c === "\n") {
        currentRow.push(currentField.trim());
        if (currentRow.some((f) => f.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = "";
      } else {
        currentField += c;
      }
    }
  }
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((f) => f.length > 0)) {
      rows.push(currentRow);
    }
  }

  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      // Safe assignment without prototype pollution
      if (h !== "__proto__" && h !== "constructor" && h !== "prototype") {
        obj[h] = row[idx] || "";
      }
    });
    return obj;
  });
}

export async function POST(req: NextRequest) {
  if (!isRequestDevAuthenticated(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized access." }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file uploaded." }, { status: 400 });
    }

    const text = await file.text();
    const rawRows = parseCsv(text);

    if (!rawRows || rawRows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Spreadsheet/CSV contains no data rows or header format is invalid." },
        { status: 400 }
      );
    }

    const parsedItems: MenuItem[] = [];
    let currentId = Date.now();

    for (const row of rawRows) {
      // Flexible case-insensitive header matching
      const getVal = (candidates: string[]): string => {
        for (const k of Object.keys(row)) {
          const normKey = k.toLowerCase().replace(/[^a-z0-9]/g, "");
          for (const c of candidates) {
            if (normKey === c.toLowerCase().replace(/[^a-z0-9]/g, "")) {
              return String(row[k] || "").trim();
            }
          }
        }
        return "";
      };

      const name = getVal(["name", "dishname", "itemname", "item", "dish"]);
      if (!name) continue; // Skip empty rows

      const category = getVal(["category", "cat", "section", "categoryname"]) || "Mains";
      const rawPrice = getVal(["price", "baseprice", "rate", "cost", "rs"]);
      const numericPrice = parseFloat(rawPrice.replace(/[^0-9.]/g, "")) || 0;
      const description = getVal(["description", "desc", "ingredients", "details"]) || `Freshly prepared ${name}.`;
      const tag = getVal(["tag", "badge", "type"]) || "Popular";
      const imageUrl = getVal(["imageurl", "image", "photo", "img", "picture"]);
      const rawSizes = getVal(["sizes", "size", "portions"]);
      const rawModifiers = getVal(["modifiers", "addons", "options", "addon", "modifier"]);

      const modifierGroups: ModifierGroup[] = [];

      // Parse Sizes e.g. "Small: 599, Medium: 1399, Large: 1999"
      if (rawSizes) {
        const sizeParts = rawSizes.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
        const sizeOptions: { id: string; name: string; priceDelta: number }[] = [];
        let baseSizePrice = numericPrice;

        sizeParts.forEach((part, idx) => {
          const match = part.match(/^([^:=-]+)[:=-]\s*([0-9.,]+)/);
          if (match) {
            const szName = match[1].trim();
            const szPrice = parseFloat(match[2].replace(/[^0-9.]/g, "")) || numericPrice;
            if (idx === 0 && baseSizePrice === 0) baseSizePrice = szPrice;
            sizeOptions.push({
              id: `sz_${idx}`,
              name: `${szName} (Rs. ${szPrice.toLocaleString()})`,
              priceDelta: szPrice - baseSizePrice,
            });
          }
        });

        if (sizeOptions.length > 1) {
          modifierGroups.push({
            id: `grp_size_${currentId}`,
            name: "Select Size",
            required: true,
            options: sizeOptions,
          });
        }
      }

      // Parse Modifiers e.g. "Flavor: Chicken Tikka; Chicken Fajita | Drink: Cola; Sprite"
      if (rawModifiers) {
        const groupParts = rawModifiers.split(/[|\n]/).map((g) => g.trim()).filter(Boolean);
        groupParts.forEach((grp, gIdx) => {
          const colonIdx = grp.indexOf(":");
          let gName = `Option ${gIdx + 1}`;
          let optString = grp;

          if (colonIdx > -1) {
            gName = grp.slice(0, colonIdx).trim();
            optString = grp.slice(colonIdx + 1).trim();
          }

          const optParts = optString.split(/[,;]/).map((o) => o.trim()).filter(Boolean);
          const options = optParts.map((opt, oIdx) => {
            const priceMatch = opt.match(/\(\+?([0-9.,]+)\)/);
            const delta = priceMatch ? parseFloat(priceMatch[1].replace(/[^0-9.]/g, "")) : 0;
            const cleanOptName = opt.replace(/\(\+?[0-9.,]+\)/, "").trim();
            return {
              id: `opt_${gIdx}_${oIdx}`,
              name: cleanOptName,
              priceDelta: delta,
            };
          });

          if (options.length > 0) {
            modifierGroups.push({
              id: `grp_mod_${currentId}_${gIdx}`,
              name: gName,
              required: !gName.toLowerCase().includes("optional") && !gName.toLowerCase().includes("extra"),
              options,
            });
          }
        });
      }

      parsedItems.push({
        id: currentId++,
        category,
        name,
        description,
        price: numericPrice,
        tag,
        available: true,
        prepTimeMinutes: category.toLowerCase().includes("pizza") ? 18 : 12,
        imageUrl: imageUrl.startsWith("http") ? imageUrl : undefined,
        modifierGroups: modifierGroups.length > 0 ? modifierGroups : undefined,
      });
    }

    const categories = Array.from(new Set(parsedItems.map((i) => i.category)));

    return NextResponse.json({
      success: true,
      count: parsedItems.length,
      categories,
      items: parsedItems,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to parse CSV file.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
