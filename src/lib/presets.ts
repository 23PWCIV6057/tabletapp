import { GeoFenceConfig, MenuItem } from "@/types";

export type RestaurantPresetId = "default" | "heatbox";

export const HEATBOX_GEO_PRESET: Partial<GeoFenceConfig> = {
  activePreset: "heatbox",
  restaurantName: "Heat Box Pizza",
  tagline: "Sher Khan Shaheed Road • Peshawar Cantt",
  currency: "PKR",
  wifiSsid: "HeatBox_Peshawar_5G",
  wifiPassword: "heatbox123",
  arcadePrizeText: "Free Molten Lava Cake on #1 Daily Score!",
};

export const HEATBOX_MENU_DATA: MenuItem[] = [
  {
    "id": 887723,
    "category": "Deals",
    "name": "Back To School Deal 01",
    "description": "2 Large Pizzas With 1.5 Ltr Drink",
    "price": 2499,
    "tag": "Back To School",
    "available": true,
    "prepTimeMinutes": 18,
    "imageUrl": "https://assets.indolj.io/upload/1790880371-800x800-1.png?q=10",
    "modifierGroups": [
      {
        "id": "grp_ad_887723_0",
        "name": "Choose Your Large Pizza",
        "required": true,
        "options": [
          {
            "id": "ad_887723_0_0",
            "name": "Chilli Chicken (Large)",
            "priceDelta": 0
          },
          {
            "id": "ad_887723_0_1",
            "name": "Chicken Fajita (Large)",
            "priceDelta": 0
          },
          {
            "id": "ad_887723_0_2",
            "name": "Chicken Tikka (Large)",
            "priceDelta": 0
          },
          {
            "id": "ad_887723_0_3",
            "name": "Chicken Supreme (Large)",
            "priceDelta": 0
          },
          {
            "id": "ad_887723_0_4",
            "name": "American Hot (Large)",
            "priceDelta": 0
          },
          {
            "id": "ad_887723_0_5",
            "name": "Cheese Lover (Large)",
            "priceDelta": 0
          },
          {
            "id": "ad_887723_0_6",
            "name": "Veggie Lover (Large)",
            "priceDelta": 0
          },
          {
            "id": "ad_887723_0_7",
            "name": "Pepperoni Lover (Large)",
            "priceDelta": 0
          },
          {
            "id": "ad_887723_0_8",
            "name": "Mughali Chicken (Large)",
            "priceDelta": 0
          },
          {
            "id": "ad_887723_0_9",
            "name": "Peri Peri (Large)",
            "priceDelta": 0
          },
          {
            "id": "ad_887723_0_10",
            "name": "Spicy Ranch (Large)",
            "priceDelta": 0
          },
          {
            "id": "ad_887723_0_11",
            "name": "Smokey B.B.Q (Large)",
            "priceDelta": 0
          }
        ]
      },
      {
        "id": "grp_ad_887723_1",
        "name": "Select Your Stuffed Crust (Large)",
        "required": false,
        "options": [
          {
            "id": "ad_887723_1_none",
            "name": "Standard (No Extra Add-on)",
            "priceDelta": 0
          },
          {
            "id": "ad_887723_1_0",
            "name": "Add on Diamond Crust",
            "priceDelta": 350
          },
          {
            "id": "ad_887723_1_1",
            "name": "Add on Adana Kabab",
            "priceDelta": 350
          },
          {
            "id": "ad_887723_1_2",
            "name": "Add on Kabab Crust",
            "priceDelta": 350
          },
          {
            "id": "ad_887723_1_3",
            "name": "Add on Cheese Crust",
            "priceDelta": 350
          }
        ]
      },
      {
        "id": "grp_ad_887723_2",
        "name": "Select Your Drink 1.5 ltr",
        "required": true,
        "options": [
          {
            "id": "ad_887723_2_0",
            "name": "Pepsi(1.5)",
            "priceDelta": 0
          },
          {
            "id": "ad_887723_2_1",
            "name": "7up(1.5)",
            "priceDelta": 0
          }
        ]
      }
    ]
  },
  {
    "id": 887726,
    "category": "Deals",
    "name": "Back To School Deal 02",
    "description": "2 Medium Pizzas With 1 Ltr Drink",
    "price": 1850,
    "tag": "Back To School",
    "available": true,
    "prepTimeMinutes": 18,
    "imageUrl": "https://assets.indolj.io/upload/1790880463-800x800-2.png?q=10",
    "modifierGroups": [
      {
        "id": "grp_ad_887726_0",
        "name": "Choose Your Medium Pizza",
        "required": true,
        "options": [
          {
            "id": "ad_887726_0_0",
            "name": "Chilli Chicken (Medium)",
            "priceDelta": 0
          },
          {
            "id": "ad_887726_0_1",
            "name": "Chicken Fajita (Medium)",
            "priceDelta": 0
          },
          {
            "id": "ad_887726_0_2",
            "name": "Chicken Tikka (Medium)",
            "priceDelta": 0
          },
          {
            "id": "ad_887726_0_3",
            "name": "Chicken Supreme (Medium)",
            "priceDelta": 0
          },
          {
            "id": "ad_887726_0_4",
            "name": "American Hot (Medium)",
            "priceDelta": 0
          },
          {
            "id": "ad_887726_0_5",
            "name": "Cheese Lover (Medium)",
            "priceDelta": 0
          },
          {
            "id": "ad_887726_0_6",
            "name": "Veggie Lover (Medium)",
            "priceDelta": 0
          },
          {
            "id": "ad_887726_0_7",
            "name": "Pepperoni Lover (Medium)",
            "priceDelta": 0
          },
          {
            "id": "ad_887726_0_8",
            "name": "Spicy Ranch (Medium)",
            "priceDelta": 0
          },
          {
            "id": "ad_887726_0_9",
            "name": "Smokey B.B.Q (Medium)",
            "priceDelta": 0
          },
          {
            "id": "ad_887726_0_10",
            "name": "UK's Melt Pizza (Medium)",
            "priceDelta": 0
          },
          {
            "id": "ad_887726_0_11",
            "name": "Peri Peri (Medium)",
            "priceDelta": 0
          }
        ]
      },
      {
        "id": "grp_ad_887726_1",
        "name": "Select Your Stuffed Crust (Medium)",
        "required": false,
        "options": [
          {
            "id": "ad_887726_1_none",
            "name": "Standard (No Extra Add-on)",
            "priceDelta": 0
          },
          {
            "id": "ad_887726_1_0",
            "name": "Add on Diamond Crust",
            "priceDelta": 250
          },
          {
            "id": "ad_887726_1_1",
            "name": "Add on Adana Kabab",
            "priceDelta": 250
          },
          {
            "id": "ad_887726_1_2",
            "name": "Add on Kabab Crust",
            "priceDelta": 250
          },
          {
            "id": "ad_887726_1_3",
            "name": "Add on Cheese Crust",
            "priceDelta": 250
          }
        ]
      },
      {
        "id": "grp_ad_887726_2",
        "name": "Select Your Drink 1 ltre",
        "required": true,
        "options": [
          {
            "id": "ad_887726_2_0",
            "name": "Pepsi(1Ltr)",
            "priceDelta": 0
          },
          {
            "id": "ad_887726_2_1",
            "name": "7Up(1Ltr)",
            "priceDelta": 0
          }
        ]
      }
    ]
  },
  {
    "id": 887729,
    "category": "Deals",
    "name": "Back To School Deal 03",
    "description": "2 Small Pizza With 2 NR Drinks",
    "price": 1099,
    "tag": "Back To School",
    "available": true,
    "prepTimeMinutes": 18,
    "imageUrl": "https://assets.indolj.io/upload/1790880563-800x800-3.png?q=10",
    "modifierGroups": [
      {
        "id": "grp_ad_887729_0",
        "name": "Choose Your Small Pizza",
        "required": true,
        "options": [
          {
            "id": "ad_887729_0_0",
            "name": "Peri Peri (Small)",
            "priceDelta": 0
          },
          {
            "id": "ad_887729_0_1",
            "name": "Chilli Chicken (Small)",
            "priceDelta": 0
          },
          {
            "id": "ad_887729_0_2",
            "name": "UK's Melt Pizza (Small)",
            "priceDelta": 0
          },
          {
            "id": "ad_887729_0_3",
            "name": "Spicy Ranch (Small)",
            "priceDelta": 0
          },
          {
            "id": "ad_887729_0_4",
            "name": "Smokey B.B.Q (Small)",
            "priceDelta": 0
          },
          {
            "id": "ad_887729_0_5",
            "name": "Chicken Fajita (Small)",
            "priceDelta": 0
          },
          {
            "id": "ad_887729_0_6",
            "name": "Chicken Tikka (Small)",
            "priceDelta": 0
          },
          {
            "id": "ad_887729_0_7",
            "name": "Chicken Supreme (Small)",
            "priceDelta": 0
          },
          {
            "id": "ad_887729_0_8",
            "name": "Heatbox Special (Small)",
            "priceDelta": 0
          },
          {
            "id": "ad_887729_0_9",
            "name": "American Hot (Small)",
            "priceDelta": 0
          },
          {
            "id": "ad_887729_0_10",
            "name": "Cheese Lover (Small)",
            "priceDelta": 0
          },
          {
            "id": "ad_887729_0_11",
            "name": "Veggie Lover (Small)",
            "priceDelta": 0
          }
        ]
      },
      {
        "id": "grp_ad_887729_1",
        "name": "Extra Topping For Small Pizza",
        "required": false,
        "options": [
          {
            "id": "ad_887729_1_none",
            "name": "Standard (No Extra Add-on)",
            "priceDelta": 0
          },
          {
            "id": "ad_887729_1_0",
            "name": "Extra Chicken(small)",
            "priceDelta": 80
          },
          {
            "id": "ad_887729_1_1",
            "name": "Extra Cheese(small)",
            "priceDelta": 80
          },
          {
            "id": "ad_887729_1_2",
            "name": "Extra Sauce(Small)",
            "priceDelta": 49
          }
        ]
      },
      {
        "id": "grp_ad_887729_2",
        "name": "Select Regular Your Drink",
        "required": true,
        "options": [
          {
            "id": "ad_887729_2_0",
            "name": "Pepsi Regular",
            "priceDelta": 0
          },
          {
            "id": "ad_887729_2_1",
            "name": "7up Regular",
            "priceDelta": 0
          }
        ]
      }
    ]
  },
  {
    "id": 895941,
    "category": "Deals",
    "name": "Triple Treat",
    "description": "Buy 1 Large Pizzas Get 1 Medium & Get 1 Small Pizza Free",
    "price": 2499,
    "tag": "Mega Promo",
    "available": true,
    "prepTimeMinutes": 18,
    "imageUrl": "https://assets.indolj.io/upload/1790406371-800x800.png?q=10",
    "modifierGroups": [
      {
        "id": "grp_ad_895941_0",
        "name": "Choose Your Small Pizza",
        "required": true,
        "options": [
          {
            "id": "ad_895941_0_0",
            "name": "Peri Peri (Small)",
            "priceDelta": 0
          },
          {
            "id": "ad_895941_0_1",
            "name": "Chilli Chicken (Small)",
            "priceDelta": 0
          },
          {
            "id": "ad_895941_0_2",
            "name": "UK's Melt Pizza (Small)",
            "priceDelta": 0
          },
          {
            "id": "ad_895941_0_3",
            "name": "Spicy Ranch (Small)",
            "priceDelta": 0
          },
          {
            "id": "ad_895941_0_4",
            "name": "Smokey B.B.Q (Small)",
            "priceDelta": 0
          },
          {
            "id": "ad_895941_0_5",
            "name": "Chicken Fajita (Small)",
            "priceDelta": 0
          },
          {
            "id": "ad_895941_0_6",
            "name": "Chicken Tikka (Small)",
            "priceDelta": 0
          },
          {
            "id": "ad_895941_0_7",
            "name": "Chicken Supreme (Small)",
            "priceDelta": 0
          },
          {
            "id": "ad_895941_0_8",
            "name": "Heatbox Special (Small)",
            "priceDelta": 0
          },
          {
            "id": "ad_895941_0_9",
            "name": "American Hot (Small)",
            "priceDelta": 0
          },
          {
            "id": "ad_895941_0_10",
            "name": "Cheese Lover (Small)",
            "priceDelta": 0
          },
          {
            "id": "ad_895941_0_11",
            "name": "Veggie Lover (Small)",
            "priceDelta": 0
          }
        ]
      },
      {
        "id": "grp_ad_895941_1",
        "name": "Choose Your Medium Pizza",
        "required": true,
        "options": [
          {
            "id": "ad_895941_1_0",
            "name": "Chilli Chicken (Medium)",
            "priceDelta": 0
          },
          {
            "id": "ad_895941_1_1",
            "name": "Chicken Fajita (Medium)",
            "priceDelta": 0
          },
          {
            "id": "ad_895941_1_2",
            "name": "Chicken Tikka (Medium)",
            "priceDelta": 0
          },
          {
            "id": "ad_895941_1_3",
            "name": "Chicken Supreme (Medium)",
            "priceDelta": 0
          },
          {
            "id": "ad_895941_1_4",
            "name": "American Hot (Medium)",
            "priceDelta": 0
          },
          {
            "id": "ad_895941_1_5",
            "name": "Cheese Lover (Medium)",
            "priceDelta": 0
          },
          {
            "id": "ad_895941_1_6",
            "name": "Veggie Lover (Medium)",
            "priceDelta": 0
          },
          {
            "id": "ad_895941_1_7",
            "name": "Pepperoni Lover (Medium)",
            "priceDelta": 0
          },
          {
            "id": "ad_895941_1_8",
            "name": "Spicy Ranch (Medium)",
            "priceDelta": 0
          },
          {
            "id": "ad_895941_1_9",
            "name": "Smokey B.B.Q (Medium)",
            "priceDelta": 0
          },
          {
            "id": "ad_895941_1_10",
            "name": "UK's Melt Pizza (Medium)",
            "priceDelta": 0
          },
          {
            "id": "ad_895941_1_11",
            "name": "Heatbox Special (Medium)",
            "priceDelta": 0
          }
        ]
      },
      {
        "id": "grp_ad_895941_2",
        "name": "Select Your Stuffed Crust (Medium)",
        "required": false,
        "options": [
          {
            "id": "ad_895941_2_none",
            "name": "Standard (No Extra Add-on)",
            "priceDelta": 0
          },
          {
            "id": "ad_895941_2_0",
            "name": "Add on Diamond Crust",
            "priceDelta": 250
          },
          {
            "id": "ad_895941_2_1",
            "name": "Add on Adana Kabab",
            "priceDelta": 250
          },
          {
            "id": "ad_895941_2_2",
            "name": "Add on Kabab Crust",
            "priceDelta": 250
          },
          {
            "id": "ad_895941_2_3",
            "name": "Add on Cheese Crust",
            "priceDelta": 250
          }
        ]
      },
      {
        "id": "grp_ad_895941_3",
        "name": "Choose Your Large Pizza",
        "required": true,
        "options": [
          {
            "id": "ad_895941_3_0",
            "name": "Chilli Chicken (Large)",
            "priceDelta": 0
          },
          {
            "id": "ad_895941_3_1",
            "name": "Chicken Fajita (Large)",
            "priceDelta": 0
          },
          {
            "id": "ad_895941_3_2",
            "name": "Chicken Tikka (Large)",
            "priceDelta": 0
          },
          {
            "id": "ad_895941_3_3",
            "name": "Chicken Supreme (Large)",
            "priceDelta": 0
          },
          {
            "id": "ad_895941_3_4",
            "name": "American Hot (Large)",
            "priceDelta": 0
          },
          {
            "id": "ad_895941_3_5",
            "name": "Cheese Lover (Large)",
            "priceDelta": 0
          },
          {
            "id": "ad_895941_3_6",
            "name": "Veggie Lover (Large)",
            "priceDelta": 0
          },
          {
            "id": "ad_895941_3_7",
            "name": "Pepperoni Lover (Large)",
            "priceDelta": 0
          },
          {
            "id": "ad_895941_3_8",
            "name": "Peri Peri (Large)",
            "priceDelta": 0
          },
          {
            "id": "ad_895941_3_9",
            "name": "Spicy Ranch (Large)",
            "priceDelta": 0
          },
          {
            "id": "ad_895941_3_10",
            "name": "Smokey B.B.Q (Large)",
            "priceDelta": 0
          },
          {
            "id": "ad_895941_3_11",
            "name": "Heatbox Special (Large)",
            "priceDelta": 0
          }
        ]
      }
    ]
  },
  {
    "id": 841103,
    "category": "Deals",
    "name": "UK's Express",
    "description": "(Serves 6-8 Persons) 3 Flavors 36 Slices.",
    "price": 3499,
    "tag": "UK Express",
    "available": true,
    "prepTimeMinutes": 18,
    "imageUrl": "https://assets.indolj.io/upload/1790419188-800x800-UK--1-.png?q=10",
    "modifierGroups": [
      {
        "id": "grp_ad_841103_0",
        "name": "Choose Your 1st Flavor",
        "required": true,
        "options": [
          {
            "id": "ad_841103_0_0",
            "name": "UK's Melt (Signature)",
            "priceDelta": 0
          },
          {
            "id": "ad_841103_0_1",
            "name": "Heatbox Special (Signature)",
            "priceDelta": 0
          },
          {
            "id": "ad_841103_0_2",
            "name": "Mughlai Chicken (Signature)",
            "priceDelta": 0
          },
          {
            "id": "ad_841103_0_3",
            "name": "Spicy Ranch (Signature)",
            "priceDelta": 0
          },
          {
            "id": "ad_841103_0_4",
            "name": "Smokey B.B.Q (Signature)",
            "priceDelta": 0
          },
          {
            "id": "ad_841103_0_5",
            "name": "Peri Peri (Signature)",
            "priceDelta": 0
          },
          {
            "id": "ad_841103_0_6",
            "name": "Cheese Lover (Classic)",
            "priceDelta": 0
          },
          {
            "id": "ad_841103_0_7",
            "name": "Chicken Tikka (Classic)",
            "priceDelta": 0
          },
          {
            "id": "ad_841103_0_8",
            "name": "Chicken Fajita (Classic)",
            "priceDelta": 0
          },
          {
            "id": "ad_841103_0_9",
            "name": "Chicken Supreme (Classic)",
            "priceDelta": 0
          },
          {
            "id": "ad_841103_0_10",
            "name": "American Hot (Classic)",
            "priceDelta": 0
          },
          {
            "id": "ad_841103_0_11",
            "name": "Pepperoni Lover (Classic)",
            "priceDelta": 0
          }
        ]
      },
      {
        "id": "grp_ad_841103_1",
        "name": "Choose Your 2nd Flavor",
        "required": true,
        "options": [
          {
            "id": "ad_841103_1_0",
            "name": "UK's Melt (Signature)",
            "priceDelta": 0
          },
          {
            "id": "ad_841103_1_1",
            "name": "Heatbox Special (Signature)",
            "priceDelta": 0
          },
          {
            "id": "ad_841103_1_2",
            "name": "Mughlai Chicken (Signature)",
            "priceDelta": 0
          },
          {
            "id": "ad_841103_1_3",
            "name": "Spicy Ranch (Signature)",
            "priceDelta": 0
          },
          {
            "id": "ad_841103_1_4",
            "name": "Smokey B.B.Q (Signature)",
            "priceDelta": 0
          },
          {
            "id": "ad_841103_1_5",
            "name": "Peri Peri (Signature)",
            "priceDelta": 0
          },
          {
            "id": "ad_841103_1_6",
            "name": "Cheese Lover (Classic)",
            "priceDelta": 0
          },
          {
            "id": "ad_841103_1_7",
            "name": "Chicken Tikka (Classic)",
            "priceDelta": 0
          },
          {
            "id": "ad_841103_1_8",
            "name": "Chicken Fajita (Classic)",
            "priceDelta": 0
          },
          {
            "id": "ad_841103_1_9",
            "name": "Chicken Supreme (Classic)",
            "priceDelta": 0
          },
          {
            "id": "ad_841103_1_10",
            "name": "American Hot (Classic)",
            "priceDelta": 0
          },
          {
            "id": "ad_841103_1_11",
            "name": "Pepperoni Lover (Classic)",
            "priceDelta": 0
          }
        ]
      },
      {
        "id": "grp_ad_841103_2",
        "name": "Choose Your 3rd Flavor",
        "required": true,
        "options": [
          {
            "id": "ad_841103_2_0",
            "name": "UK's Melt (Signature)",
            "priceDelta": 0
          },
          {
            "id": "ad_841103_2_1",
            "name": "Heatbox Special (Signature)",
            "priceDelta": 0
          },
          {
            "id": "ad_841103_2_2",
            "name": "Mughlai Chicken (Signature)",
            "priceDelta": 0
          },
          {
            "id": "ad_841103_2_3",
            "name": "Spicy Ranch (Signature)",
            "priceDelta": 0
          },
          {
            "id": "ad_841103_2_4",
            "name": "Peri Peri (Signature)",
            "priceDelta": 0
          },
          {
            "id": "ad_841103_2_5",
            "name": "Cheese Lover (Classic)",
            "priceDelta": 0
          },
          {
            "id": "ad_841103_2_6",
            "name": "Chicken Tikka (Classic)",
            "priceDelta": 0
          },
          {
            "id": "ad_841103_2_7",
            "name": "Chicken Fajita (Classic)",
            "priceDelta": 0
          },
          {
            "id": "ad_841103_2_8",
            "name": "Chicken Supreme (Classic)",
            "priceDelta": 0
          },
          {
            "id": "ad_841103_2_9",
            "name": "American Hot (Classic)",
            "priceDelta": 0
          },
          {
            "id": "ad_841103_2_10",
            "name": "Pepperoni Lover (Classic)",
            "priceDelta": 0
          },
          {
            "id": "ad_841103_2_11",
            "name": "Chilli Chicken (Classic)",
            "priceDelta": 0
          }
        ]
      }
    ]
  },
  {
    "id": 801963,
    "category": "Deals",
    "name": "Deal 01",
    "description": "1 Small Pizza • 1 Regular Drink",
    "price": 649,
    "tag": "Value Deal",
    "available": true,
    "prepTimeMinutes": 18,
    "imageUrl": "https://assets.indolj.io/upload/1765398375-Deal 1.jpg?q=10",
    "modifierGroups": [
      {
        "id": "grp_ad_801963_0",
        "name": "Choose Your Small Pizza",
        "required": true,
        "options": [
          {
            "id": "ad_801963_0_0",
            "name": "Peri Peri (Small)",
            "priceDelta": 0
          },
          {
            "id": "ad_801963_0_1",
            "name": "Chilli Chicken (Small)",
            "priceDelta": 0
          },
          {
            "id": "ad_801963_0_2",
            "name": "UK's Melt Pizza (Small)",
            "priceDelta": 0
          },
          {
            "id": "ad_801963_0_3",
            "name": "Spicy Ranch (Small)",
            "priceDelta": 0
          },
          {
            "id": "ad_801963_0_4",
            "name": "Smokey B.B.Q (Small)",
            "priceDelta": 0
          },
          {
            "id": "ad_801963_0_5",
            "name": "Chicken Fajita (Small)",
            "priceDelta": 0
          },
          {
            "id": "ad_801963_0_6",
            "name": "Chicken Tikka (Small)",
            "priceDelta": 0
          },
          {
            "id": "ad_801963_0_7",
            "name": "Chicken Supreme (Small)",
            "priceDelta": 0
          },
          {
            "id": "ad_801963_0_8",
            "name": "Heatbox Special (Small)",
            "priceDelta": 0
          },
          {
            "id": "ad_801963_0_9",
            "name": "American Hot (Small)",
            "priceDelta": 0
          },
          {
            "id": "ad_801963_0_10",
            "name": "Cheese Lover (Small)",
            "priceDelta": 0
          },
          {
            "id": "ad_801963_0_11",
            "name": "Veggie Lover (Small)",
            "priceDelta": 0
          }
        ]
      },
      {
        "id": "grp_ad_801963_1",
        "name": "Select Regular Your Drink",
        "required": true,
        "options": [
          {
            "id": "ad_801963_1_0",
            "name": "Pepsi Regular",
            "priceDelta": 0
          },
          {
            "id": "ad_801963_1_1",
            "name": "7up Regular",
            "priceDelta": 0
          }
        ]
      }
    ]
  },
  {
    "id": 801964,
    "category": "Deals",
    "name": "Deal 02",
    "description": "1 Medium Pizza • 2 Regular Drinks",
    "price": 1349,
    "tag": "Value Deal",
    "available": true,
    "prepTimeMinutes": 18,
    "imageUrl": "https://assets.indolj.io/upload/1765400848-Deal 2_8_11zon.jpg?q=10",
    "modifierGroups": [
      {
        "id": "grp_ad_801964_0",
        "name": "Choose Your Medium Pizza",
        "required": true,
        "options": [
          {
            "id": "ad_801964_0_0",
            "name": "Chilli Chicken (Medium)",
            "priceDelta": 0
          },
          {
            "id": "ad_801964_0_1",
            "name": "Chicken Fajita (Medium)",
            "priceDelta": 0
          },
          {
            "id": "ad_801964_0_2",
            "name": "Chicken Tikka (Medium)",
            "priceDelta": 0
          },
          {
            "id": "ad_801964_0_3",
            "name": "Chicken Supreme (Medium)",
            "priceDelta": 0
          },
          {
            "id": "ad_801964_0_4",
            "name": "American Hot (Medium)",
            "priceDelta": 0
          },
          {
            "id": "ad_801964_0_5",
            "name": "Cheese Lover (Medium)",
            "priceDelta": 0
          },
          {
            "id": "ad_801964_0_6",
            "name": "Veggie Lover (Medium)",
            "priceDelta": 0
          },
          {
            "id": "ad_801964_0_7",
            "name": "Pepperoni Lover (Medium)",
            "priceDelta": 0
          },
          {
            "id": "ad_801964_0_8",
            "name": "Smokey B.B.Q (Medium)",
            "priceDelta": 0
          },
          {
            "id": "ad_801964_0_9",
            "name": "Spicy Ranch (Medium)",
            "priceDelta": 100
          },
          {
            "id": "ad_801964_0_10",
            "name": "UK's Melt Pizza (Medium)",
            "priceDelta": 100
          },
          {
            "id": "ad_801964_0_11",
            "name": "Peri Peri (Medium)",
            "priceDelta": 100
          }
        ]
      },
      {
        "id": "grp_ad_801964_1",
        "name": "Select Your Stuffed Crust (Medium)",
        "required": false,
        "options": [
          {
            "id": "ad_801964_1_none",
            "name": "Standard (No Extra Add-on)",
            "priceDelta": 0
          },
          {
            "id": "ad_801964_1_0",
            "name": "Add on Diamond Crust",
            "priceDelta": 250
          },
          {
            "id": "ad_801964_1_1",
            "name": "Add on Adana Kabab",
            "priceDelta": 250
          },
          {
            "id": "ad_801964_1_2",
            "name": "Add on Kabab Crust",
            "priceDelta": 250
          },
          {
            "id": "ad_801964_1_3",
            "name": "Add on Cheese Crust",
            "priceDelta": 250
          }
        ]
      },
      {
        "id": "grp_ad_801964_2",
        "name": "Select Regular Your Drink",
        "required": true,
        "options": [
          {
            "id": "ad_801964_2_0",
            "name": "Pepsi Regular",
            "priceDelta": 0
          },
          {
            "id": "ad_801964_2_1",
            "name": "7up Regular",
            "priceDelta": 0
          }
        ]
      }
    ]
  },
  {
    "id": 801965,
    "category": "Deals",
    "name": "Deal 03",
    "description": "1 Large Pizza • 1.5 Litre Drink",
    "price": 1899,
    "tag": "Value Deal",
    "available": true,
    "prepTimeMinutes": 18,
    "imageUrl": "https://assets.indolj.io/upload/1765400854-Deal 3_9_11zon.jpg?q=10",
    "modifierGroups": [
      {
        "id": "grp_ad_801965_0",
        "name": "Choose Your Large Pizza",
        "required": true,
        "options": [
          {
            "id": "ad_801965_0_0",
            "name": "Chilli Chicken (Large)",
            "priceDelta": 0
          },
          {
            "id": "ad_801965_0_1",
            "name": "Chicken Fajita (Large)",
            "priceDelta": 0
          },
          {
            "id": "ad_801965_0_2",
            "name": "Chicken Tikka (Large)",
            "priceDelta": 0
          },
          {
            "id": "ad_801965_0_3",
            "name": "Chicken Supreme (Large)",
            "priceDelta": 0
          },
          {
            "id": "ad_801965_0_4",
            "name": "American Hot (Large)",
            "priceDelta": 0
          },
          {
            "id": "ad_801965_0_5",
            "name": "Cheese Lover (Large)",
            "priceDelta": 0
          },
          {
            "id": "ad_801965_0_6",
            "name": "Veggie Lover (Large)",
            "priceDelta": 0
          },
          {
            "id": "ad_801965_0_7",
            "name": "Pepperoni Lover (Large)",
            "priceDelta": 0
          },
          {
            "id": "ad_801965_0_8",
            "name": "Peri Peri (Large)",
            "priceDelta": 100
          },
          {
            "id": "ad_801965_0_9",
            "name": "Smokey B.B.Q (Large)",
            "priceDelta": 0
          },
          {
            "id": "ad_801965_0_10",
            "name": "Spicy Ranch (Large)",
            "priceDelta": 100
          },
          {
            "id": "ad_801965_0_11",
            "name": "Heatbox Special (Large)",
            "priceDelta": 100
          }
        ]
      },
      {
        "id": "grp_ad_801965_1",
        "name": "Select Your Stuffed Crust (Large)",
        "required": false,
        "options": [
          {
            "id": "ad_801965_1_none",
            "name": "Standard (No Extra Add-on)",
            "priceDelta": 0
          },
          {
            "id": "ad_801965_1_0",
            "name": "Add on Diamond Crust",
            "priceDelta": 350
          },
          {
            "id": "ad_801965_1_1",
            "name": "Add on Adana Kabab",
            "priceDelta": 350
          },
          {
            "id": "ad_801965_1_2",
            "name": "Add on Kabab Crust",
            "priceDelta": 350
          },
          {
            "id": "ad_801965_1_3",
            "name": "Add on Cheese Crust",
            "priceDelta": 350
          }
        ]
      },
      {
        "id": "grp_ad_801965_2",
        "name": "Select Your Drink 1.5 ltr",
        "required": true,
        "options": [
          {
            "id": "ad_801965_2_0",
            "name": "Pepsi(1.5)",
            "priceDelta": 0
          },
          {
            "id": "ad_801965_2_1",
            "name": "7up(1.5)",
            "priceDelta": 0
          }
        ]
      }
    ]
  },
  {
    "id": 801966,
    "category": "Deals",
    "name": "Deal 04",
    "description": "1 Zinger Burger • 1 Regular Fries • 1 Regular Drink",
    "price": 749,
    "tag": "Value Deal",
    "available": true,
    "prepTimeMinutes": 18,
    "imageUrl": "https://assets.indolj.io/upload/1765400859-Deal 4_10_11zon.jpg?q=10",
    "modifierGroups": [
      {
        "id": "grp_ad_801966_2",
        "name": "Select Regular Your Drink",
        "required": true,
        "options": [
          {
            "id": "ad_801966_2_0",
            "name": "Pepsi Regular",
            "priceDelta": 0
          },
          {
            "id": "ad_801966_2_1",
            "name": "7up Regular",
            "priceDelta": 0
          }
        ]
      }
    ]
  },
  {
    "id": 801967,
    "category": "Deals",
    "name": "Deal 05",
    "description": "2 Zinger Burgers • 1 Large Fries • 2 Regular Drinks",
    "price": 1349,
    "tag": "Value Deal",
    "available": true,
    "prepTimeMinutes": 18,
    "imageUrl": "https://assets.indolj.io/upload/1765400865-Deal 5_11_11zon.jpg?q=10",
    "modifierGroups": [
      {
        "id": "grp_ad_801967_2",
        "name": "Select Regular Your Drink",
        "required": true,
        "options": [
          {
            "id": "ad_801967_2_0",
            "name": "Pepsi Regular",
            "priceDelta": 0
          },
          {
            "id": "ad_801967_2_1",
            "name": "7up Regular",
            "priceDelta": 0
          }
        ]
      }
    ]
  },
  {
    "id": 801968,
    "category": "Deals",
    "name": "Deal 06",
    "description": "3 Zinger Burgers • 1 Large Fries • 1.5 Litre Drink",
    "price": 1699,
    "tag": "Value Deal",
    "available": true,
    "prepTimeMinutes": 18,
    "imageUrl": "https://assets.indolj.io/upload/1765400870-Deal 6_12_11zon.jpg?q=10",
    "modifierGroups": [
      {
        "id": "grp_ad_801968_2",
        "name": "Select Your Drink 1.5 ltr",
        "required": true,
        "options": [
          {
            "id": "ad_801968_2_0",
            "name": "Pepsi(1.5)",
            "priceDelta": 0
          },
          {
            "id": "ad_801968_2_1",
            "name": "7up(1.5)",
            "priceDelta": 0
          }
        ]
      }
    ]
  },
  {
    "id": 801969,
    "category": "Deals",
    "name": "Deal 07",
    "description": "1 Small Pizza • 1 Zinger Burger • 1 Regular Fries • 2 Regular Drinks",
    "price": 1399,
    "tag": "Value Deal",
    "available": true,
    "prepTimeMinutes": 18,
    "imageUrl": "https://assets.indolj.io/upload/1765400875-Deal 7_13_11zon.jpg?q=10",
    "modifierGroups": [
      {
        "id": "grp_ad_801969_0",
        "name": "Choose Your Small Pizza",
        "required": true,
        "options": [
          {
            "id": "ad_801969_0_0",
            "name": "Peri Peri (Small)",
            "priceDelta": 0
          },
          {
            "id": "ad_801969_0_1",
            "name": "Chilli Chicken (Small)",
            "priceDelta": 0
          },
          {
            "id": "ad_801969_0_2",
            "name": "UK's Melt Pizza (Small)",
            "priceDelta": 0
          },
          {
            "id": "ad_801969_0_3",
            "name": "Spicy Ranch (Small)",
            "priceDelta": 0
          },
          {
            "id": "ad_801969_0_4",
            "name": "Smokey B.B.Q (Small)",
            "priceDelta": 0
          },
          {
            "id": "ad_801969_0_5",
            "name": "Chicken Fajita (Small)",
            "priceDelta": 0
          },
          {
            "id": "ad_801969_0_6",
            "name": "Chicken Tikka (Small)",
            "priceDelta": 0
          },
          {
            "id": "ad_801969_0_7",
            "name": "Chicken Supreme (Small)",
            "priceDelta": 0
          },
          {
            "id": "ad_801969_0_8",
            "name": "Heatbox Special (Small)",
            "priceDelta": 0
          },
          {
            "id": "ad_801969_0_9",
            "name": "American Hot (Small)",
            "priceDelta": 0
          },
          {
            "id": "ad_801969_0_10",
            "name": "Cheese Lover (Small)",
            "priceDelta": 0
          },
          {
            "id": "ad_801969_0_11",
            "name": "Veggie Lover (Small)",
            "priceDelta": 0
          }
        ]
      },
      {
        "id": "grp_ad_801969_3",
        "name": "Select Regular Your Drink",
        "required": true,
        "options": [
          {
            "id": "ad_801969_3_0",
            "name": "Pepsi Regular",
            "priceDelta": 0
          },
          {
            "id": "ad_801969_3_1",
            "name": "7up Regular",
            "priceDelta": 0
          }
        ]
      }
    ]
  },
  {
    "id": 801970,
    "category": "Deals",
    "name": "Deal 08",
    "description": "1 Medium Pizza • 2 Zinger Burgers • 1 Large Fries • 1.5 Litre Drink",
    "price": 2399,
    "tag": "Value Deal",
    "available": true,
    "prepTimeMinutes": 18,
    "imageUrl": "https://assets.indolj.io/upload/1765400881-Deal 8_14_11zon.jpg?q=10",
    "modifierGroups": [
      {
        "id": "grp_ad_801970_0",
        "name": "Choose Your Medium Pizza",
        "required": true,
        "options": [
          {
            "id": "ad_801970_0_0",
            "name": "Chilli Chicken (Medium)",
            "priceDelta": 0
          },
          {
            "id": "ad_801970_0_1",
            "name": "Chicken Fajita (Medium)",
            "priceDelta": 0
          },
          {
            "id": "ad_801970_0_2",
            "name": "Chicken Tikka (Medium)",
            "priceDelta": 0
          },
          {
            "id": "ad_801970_0_3",
            "name": "Chicken Supreme (Medium)",
            "priceDelta": 0
          },
          {
            "id": "ad_801970_0_4",
            "name": "American Hot (Medium)",
            "priceDelta": 0
          },
          {
            "id": "ad_801970_0_5",
            "name": "Cheese Lover (Medium)",
            "priceDelta": 0
          },
          {
            "id": "ad_801970_0_6",
            "name": "Veggie Lover (Medium)",
            "priceDelta": 0
          },
          {
            "id": "ad_801970_0_7",
            "name": "Pepperoni Lover (Medium)",
            "priceDelta": 0
          },
          {
            "id": "ad_801970_0_8",
            "name": "Smokey B.B.Q (Medium)",
            "priceDelta": 0
          },
          {
            "id": "ad_801970_0_9",
            "name": "Spicy Ranch (Medium)",
            "priceDelta": 100
          },
          {
            "id": "ad_801970_0_10",
            "name": "UK's Melt Pizza (Medium)",
            "priceDelta": 100
          },
          {
            "id": "ad_801970_0_11",
            "name": "Peri Peri (Medium)",
            "priceDelta": 100
          }
        ]
      },
      {
        "id": "grp_ad_801970_1",
        "name": "Select Your Stuffed Crust (Medium)",
        "required": false,
        "options": [
          {
            "id": "ad_801970_1_none",
            "name": "Standard (No Extra Add-on)",
            "priceDelta": 0
          },
          {
            "id": "ad_801970_1_0",
            "name": "Add on Diamond Crust",
            "priceDelta": 250
          },
          {
            "id": "ad_801970_1_1",
            "name": "Add on Adana Kabab",
            "priceDelta": 250
          },
          {
            "id": "ad_801970_1_2",
            "name": "Add on Kabab Crust",
            "priceDelta": 250
          },
          {
            "id": "ad_801970_1_3",
            "name": "Add on Cheese Crust",
            "priceDelta": 250
          }
        ]
      },
      {
        "id": "grp_ad_801970_4",
        "name": "Select Your Drink 1.5 ltr",
        "required": true,
        "options": [
          {
            "id": "ad_801970_4_0",
            "name": "Pepsi(1.5)",
            "priceDelta": 0
          },
          {
            "id": "ad_801970_4_1",
            "name": "7up(1.5)",
            "priceDelta": 0
          }
        ]
      }
    ]
  },
  {
    "id": 801971,
    "category": "Deals",
    "name": "Deal 09",
    "description": "1 Large Pizza • 3 Zinger Burgers • 1 Large Fries • 1.5 Litre Drink",
    "price": 3299,
    "tag": "Value Deal",
    "available": true,
    "prepTimeMinutes": 18,
    "imageUrl": "https://assets.indolj.io/upload/1765400886-Deal 9_15_11zon.jpg?q=10",
    "modifierGroups": [
      {
        "id": "grp_ad_801971_0",
        "name": "Choose Your Large Pizza",
        "required": true,
        "options": [
          {
            "id": "ad_801971_0_0",
            "name": "Chilli Chicken (Large)",
            "priceDelta": 0
          },
          {
            "id": "ad_801971_0_1",
            "name": "Chicken Fajita (Large)",
            "priceDelta": 0
          },
          {
            "id": "ad_801971_0_2",
            "name": "Chicken Tikka (Large)",
            "priceDelta": 0
          },
          {
            "id": "ad_801971_0_3",
            "name": "Chicken Supreme (Large)",
            "priceDelta": 0
          },
          {
            "id": "ad_801971_0_4",
            "name": "American Hot (Large)",
            "priceDelta": 0
          },
          {
            "id": "ad_801971_0_5",
            "name": "Cheese Lover (Large)",
            "priceDelta": 0
          },
          {
            "id": "ad_801971_0_6",
            "name": "Veggie Lover (Large)",
            "priceDelta": 0
          },
          {
            "id": "ad_801971_0_7",
            "name": "Pepperoni Lover (Large)",
            "priceDelta": 0
          },
          {
            "id": "ad_801971_0_8",
            "name": "Peri Peri (Large)",
            "priceDelta": 100
          },
          {
            "id": "ad_801971_0_9",
            "name": "Smokey B.B.Q (Large)",
            "priceDelta": 0
          },
          {
            "id": "ad_801971_0_10",
            "name": "Spicy Ranch (Large)",
            "priceDelta": 100
          },
          {
            "id": "ad_801971_0_11",
            "name": "Heatbox Special (Large)",
            "priceDelta": 100
          }
        ]
      },
      {
        "id": "grp_ad_801971_1",
        "name": "Select Your Stuffed Crust (Large)",
        "required": false,
        "options": [
          {
            "id": "ad_801971_1_none",
            "name": "Standard (No Extra Add-on)",
            "priceDelta": 0
          },
          {
            "id": "ad_801971_1_0",
            "name": "Add on Diamond Crust",
            "priceDelta": 350
          },
          {
            "id": "ad_801971_1_1",
            "name": "Add on Adana Kabab",
            "priceDelta": 350
          },
          {
            "id": "ad_801971_1_2",
            "name": "Add on Kabab Crust",
            "priceDelta": 350
          },
          {
            "id": "ad_801971_1_3",
            "name": "Add on Cheese Crust",
            "priceDelta": 350
          }
        ]
      },
      {
        "id": "grp_ad_801971_4",
        "name": "Select Your Drink 1.5 ltr",
        "required": true,
        "options": [
          {
            "id": "ad_801971_4_0",
            "name": "Pepsi(1.5)",
            "priceDelta": 0
          },
          {
            "id": "ad_801971_4_1",
            "name": "7up(1.5)",
            "priceDelta": 0
          }
        ]
      }
    ]
  },
  {
    "id": 841076,
    "category": "Deals",
    "name": "Kids Deal 2",
    "description": "1 x Patty Burger • 1 Fries • 1 Juice",
    "price": 749,
    "tag": "Kids Deal",
    "available": true,
    "prepTimeMinutes": 18,
    "imageUrl": "https://assets.indolj.io/upload/1780154958-kidsDeal1.jpg.jpeg?q=10"
  },
  {
    "id": 801962,
    "category": "Deals",
    "name": "Kids Deal 1",
    "description": "1 Small Pizza • 1 Regular Fries • 1 Regular Drink",
    "price": 749,
    "tag": "Kids Deal",
    "available": true,
    "prepTimeMinutes": 18,
    "imageUrl": "https://assets.indolj.io/upload/1780154948-kidsDeal2.jpg.jpeg?q=10",
    "modifierGroups": [
      {
        "id": "grp_ad_801962_0",
        "name": "Choose Your Small Pizza",
        "required": true,
        "options": [
          {
            "id": "ad_801962_0_0",
            "name": "Peri Peri (Small)",
            "priceDelta": 0
          },
          {
            "id": "ad_801962_0_1",
            "name": "Chilli Chicken (Small)",
            "priceDelta": 0
          },
          {
            "id": "ad_801962_0_2",
            "name": "UK's Melt Pizza (Small)",
            "priceDelta": 0
          },
          {
            "id": "ad_801962_0_3",
            "name": "Spicy Ranch (Small)",
            "priceDelta": 0
          },
          {
            "id": "ad_801962_0_4",
            "name": "Chicken Fajita (Small)",
            "priceDelta": 0
          },
          {
            "id": "ad_801962_0_5",
            "name": "Chicken Tikka (Small)",
            "priceDelta": 0
          },
          {
            "id": "ad_801962_0_6",
            "name": "Chicken Supreme (Small)",
            "priceDelta": 0
          },
          {
            "id": "ad_801962_0_7",
            "name": "Heatbox Special (Small)",
            "priceDelta": 0
          },
          {
            "id": "ad_801962_0_8",
            "name": "American Hot (Small)",
            "priceDelta": 0
          },
          {
            "id": "ad_801962_0_9",
            "name": "Cheese Lover (Small)",
            "priceDelta": 0
          },
          {
            "id": "ad_801962_0_10",
            "name": "Veggie Lover (Small)",
            "priceDelta": 0
          },
          {
            "id": "ad_801962_0_11",
            "name": "Pepperoni Lover (Small)",
            "priceDelta": 0
          }
        ]
      },
      {
        "id": "grp_ad_801962_2",
        "name": "Select Regular Your Drink",
        "required": true,
        "options": [
          {
            "id": "ad_801962_2_0",
            "name": "Pepsi Regular",
            "priceDelta": 0
          },
          {
            "id": "ad_801962_2_1",
            "name": "7up Regular",
            "priceDelta": 0
          }
        ]
      }
    ]
  },
  {
    "id": 841088,
    "category": "Signature Pizzas",
    "name": "UK Melt",
    "description": "Our Uk's Famous Flavor made with our special creamy ranch sauce onion capsicum and chicken chunks.",
    "price": 699,
    "tag": "Signature",
    "available": true,
    "prepTimeMinutes": 18,
    "imageUrl": "https://assets.indolj.io/upload/1780152838-uksmeltpizza.webp?q=10",
    "modifierGroups": [
      {
        "id": "grp_size_841088",
        "name": "Select Size / Portion",
        "required": true,
        "options": [
          {
            "id": "size_841088_0",
            "name": "Small (Rs. 699)",
            "priceDelta": 0
          },
          {
            "id": "size_841088_1",
            "name": "Medium (Rs. 1,450)",
            "priceDelta": 751
          },
          {
            "id": "size_841088_2",
            "name": "Large (Rs. 2,150)",
            "priceDelta": 1451
          },
          {
            "id": "size_841088_3",
            "name": "X-Large (Rs. 3,049)",
            "priceDelta": 2350
          },
          {
            "id": "size_841088_4",
            "name": "Mega (Rs. 3,949)",
            "priceDelta": 3250
          }
        ]
      },
      {
        "id": "grp_ad_841088_0",
        "name": "Select Your Stuffed Crust (Medium)",
        "required": false,
        "options": [
          {
            "id": "ad_841088_0_none",
            "name": "Standard (No Extra Add-on)",
            "priceDelta": 0
          },
          {
            "id": "ad_841088_0_0",
            "name": "Add on Diamond Crust",
            "priceDelta": 250
          },
          {
            "id": "ad_841088_0_1",
            "name": "Add on Adana Kabab",
            "priceDelta": 250
          },
          {
            "id": "ad_841088_0_2",
            "name": "Add on Kabab Crust",
            "priceDelta": 250
          },
          {
            "id": "ad_841088_0_3",
            "name": "Add on Cheese Crust",
            "priceDelta": 250
          }
        ]
      },
      {
        "id": "grp_ad_841088_1",
        "name": "Select Your Stuffed Crust (Large)",
        "required": false,
        "options": [
          {
            "id": "ad_841088_1_none",
            "name": "Standard (No Extra Add-on)",
            "priceDelta": 0
          },
          {
            "id": "ad_841088_1_0",
            "name": "Add on Diamond Crust",
            "priceDelta": 350
          },
          {
            "id": "ad_841088_1_1",
            "name": "Add on Adana Kabab",
            "priceDelta": 350
          },
          {
            "id": "ad_841088_1_2",
            "name": "Add on Kabab Crust",
            "priceDelta": 350
          },
          {
            "id": "ad_841088_1_3",
            "name": "Add on Cheese Crust",
            "priceDelta": 350
          }
        ]
      },
      {
        "id": "grp_ad_841088_2",
        "name": "Select Your Stuffed Crust (X Large)",
        "required": false,
        "options": [
          {
            "id": "ad_841088_2_none",
            "name": "Standard (No Extra Add-on)",
            "priceDelta": 0
          },
          {
            "id": "ad_841088_2_0",
            "name": "Add on Diamond Crust",
            "priceDelta": 450
          },
          {
            "id": "ad_841088_2_1",
            "name": "Add on Adana Kabab",
            "priceDelta": 450
          },
          {
            "id": "ad_841088_2_2",
            "name": "Add on Kabab Crust",
            "priceDelta": 450
          },
          {
            "id": "ad_841088_2_3",
            "name": "Add on Cheese Crust",
            "priceDelta": 450
          }
        ]
      }
    ]
  },
  {
    "id": 801940,
    "category": "Signature Pizzas",
    "name": "Heatbox Special",
    "description": "A Hearty Blend Of Special Sauce, Tender Chicken Tikka, Juicy Beef Chunks, Onions, Capsicum, Olives, Sweet Corn And Cheese.",
    "price": 699,
    "tag": "Signature",
    "available": true,
    "prepTimeMinutes": 18,
    "imageUrl": "https://assets.indolj.io/upload/1765400504-Heat Box Special_10_11zon.jpg?q=10",
    "modifierGroups": [
      {
        "id": "grp_size_801940",
        "name": "Select Size / Portion",
        "required": true,
        "options": [
          {
            "id": "size_801940_0",
            "name": "Small (Rs. 699)",
            "priceDelta": 0
          },
          {
            "id": "size_801940_1",
            "name": "Medium (Rs. 1,450)",
            "priceDelta": 751
          },
          {
            "id": "size_801940_2",
            "name": "Large (Rs. 2,150)",
            "priceDelta": 1451
          },
          {
            "id": "size_801940_3",
            "name": "X-Large (Rs. 3,049)",
            "priceDelta": 2350
          },
          {
            "id": "size_801940_4",
            "name": "Mega (Rs. 3,949)",
            "priceDelta": 3250
          }
        ]
      },
      {
        "id": "grp_ad_801940_0",
        "name": "Select Your Stuffed Crust (Medium)",
        "required": false,
        "options": [
          {
            "id": "ad_801940_0_none",
            "name": "Standard (No Extra Add-on)",
            "priceDelta": 0
          },
          {
            "id": "ad_801940_0_0",
            "name": "Add on Diamond Crust",
            "priceDelta": 250
          },
          {
            "id": "ad_801940_0_1",
            "name": "Add on Adana Kabab",
            "priceDelta": 250
          },
          {
            "id": "ad_801940_0_2",
            "name": "Add on Kabab Crust",
            "priceDelta": 250
          },
          {
            "id": "ad_801940_0_3",
            "name": "Add on Cheese Crust",
            "priceDelta": 250
          }
        ]
      },
      {
        "id": "grp_ad_801940_1",
        "name": "Select Your Stuffed Crust (Large)",
        "required": false,
        "options": [
          {
            "id": "ad_801940_1_none",
            "name": "Standard (No Extra Add-on)",
            "priceDelta": 0
          },
          {
            "id": "ad_801940_1_0",
            "name": "Add on Diamond Crust",
            "priceDelta": 350
          },
          {
            "id": "ad_801940_1_1",
            "name": "Add on Adana Kabab",
            "priceDelta": 350
          },
          {
            "id": "ad_801940_1_2",
            "name": "Add on Kabab Crust",
            "priceDelta": 350
          },
          {
            "id": "ad_801940_1_3",
            "name": "Add on Cheese Crust",
            "priceDelta": 350
          }
        ]
      },
      {
        "id": "grp_ad_801940_2",
        "name": "Select Your Stuffed Crust (X Large)",
        "required": false,
        "options": [
          {
            "id": "ad_801940_2_none",
            "name": "Standard (No Extra Add-on)",
            "priceDelta": 0
          },
          {
            "id": "ad_801940_2_0",
            "name": "Add on Diamond Crust",
            "priceDelta": 450
          },
          {
            "id": "ad_801940_2_1",
            "name": "Add on Adana Kabab",
            "priceDelta": 450
          },
          {
            "id": "ad_801940_2_2",
            "name": "Add on Kabab Crust",
            "priceDelta": 450
          },
          {
            "id": "ad_801940_2_3",
            "name": "Add on Cheese Crust",
            "priceDelta": 450
          }
        ]
      }
    ]
  },
  {
    "id": 841091,
    "category": "Signature Pizzas",
    "name": "Mughlai Chicken",
    "description": "A rich fusion delight topped with tender Mughlai-Style Chicken in a creamy, mildly spiced sauce, layered with melted mozzarella on crisp crust.",
    "price": 699,
    "tag": "Signature",
    "available": true,
    "prepTimeMinutes": 18,
    "imageUrl": "https://assets.indolj.io/upload/1780157022-uk.webp?q=10",
    "modifierGroups": [
      {
        "id": "grp_size_841091",
        "name": "Select Size / Portion",
        "required": true,
        "options": [
          {
            "id": "size_841091_0",
            "name": "Small (Rs. 699)",
            "priceDelta": 0
          },
          {
            "id": "size_841091_1",
            "name": "Medium (Rs. 1,450)",
            "priceDelta": 751
          },
          {
            "id": "size_841091_2",
            "name": "Large (Rs. 2,150)",
            "priceDelta": 1451
          },
          {
            "id": "size_841091_3",
            "name": "X-Large (Rs. 3,049)",
            "priceDelta": 2350
          },
          {
            "id": "size_841091_4",
            "name": "Mega (Rs. 3,949)",
            "priceDelta": 3250
          }
        ]
      },
      {
        "id": "grp_ad_841091_0",
        "name": "Select Your Stuffed Crust (Medium)",
        "required": false,
        "options": [
          {
            "id": "ad_841091_0_none",
            "name": "Standard (No Extra Add-on)",
            "priceDelta": 0
          },
          {
            "id": "ad_841091_0_0",
            "name": "Add on Diamond Crust",
            "priceDelta": 250
          },
          {
            "id": "ad_841091_0_1",
            "name": "Add on Adana Kabab",
            "priceDelta": 250
          },
          {
            "id": "ad_841091_0_2",
            "name": "Add on Kabab Crust",
            "priceDelta": 250
          },
          {
            "id": "ad_841091_0_3",
            "name": "Add on Cheese Crust",
            "priceDelta": 250
          }
        ]
      },
      {
        "id": "grp_ad_841091_1",
        "name": "Select Your Stuffed Crust (Large)",
        "required": false,
        "options": [
          {
            "id": "ad_841091_1_none",
            "name": "Standard (No Extra Add-on)",
            "priceDelta": 0
          },
          {
            "id": "ad_841091_1_0",
            "name": "Add on Diamond Crust",
            "priceDelta": 350
          },
          {
            "id": "ad_841091_1_1",
            "name": "Add on Adana Kabab",
            "priceDelta": 350
          },
          {
            "id": "ad_841091_1_2",
            "name": "Add on Kabab Crust",
            "priceDelta": 350
          },
          {
            "id": "ad_841091_1_3",
            "name": "Add on Cheese Crust",
            "priceDelta": 350
          }
        ]
      },
      {
        "id": "grp_ad_841091_2",
        "name": "Select Your Stuffed Crust (X Large)",
        "required": false,
        "options": [
          {
            "id": "ad_841091_2_none",
            "name": "Standard (No Extra Add-on)",
            "priceDelta": 0
          },
          {
            "id": "ad_841091_2_0",
            "name": "Add on Diamond Crust",
            "priceDelta": 450
          },
          {
            "id": "ad_841091_2_1",
            "name": "Add on Adana Kabab",
            "priceDelta": 450
          },
          {
            "id": "ad_841091_2_2",
            "name": "Add on Kabab Crust",
            "priceDelta": 450
          },
          {
            "id": "ad_841091_2_3",
            "name": "Add on Cheese Crust",
            "priceDelta": 450
          }
        ]
      }
    ]
  },
  {
    "id": 801936,
    "category": "Signature Pizzas",
    "name": "Spicy Ranch",
    "description": "Creamy Base Topped With Chicken Chunks, Capsicum, Onion & Peri Hot Sauce.",
    "price": 699,
    "tag": "Signature",
    "available": true,
    "prepTimeMinutes": 18,
    "imageUrl": "https://assets.indolj.io/upload/1765400440-Spicy Ranch_15_11zon.jpg?q=10",
    "modifierGroups": [
      {
        "id": "grp_size_801936",
        "name": "Select Size / Portion",
        "required": true,
        "options": [
          {
            "id": "size_801936_0",
            "name": "Small (Rs. 699)",
            "priceDelta": 0
          },
          {
            "id": "size_801936_1",
            "name": "Medium (Rs. 1,450)",
            "priceDelta": 751
          },
          {
            "id": "size_801936_2",
            "name": "Large (Rs. 2,150)",
            "priceDelta": 1451
          },
          {
            "id": "size_801936_3",
            "name": "X-Large (Rs. 3,049)",
            "priceDelta": 2350
          },
          {
            "id": "size_801936_4",
            "name": "Mega (Rs. 3,949)",
            "priceDelta": 3250
          }
        ]
      },
      {
        "id": "grp_ad_801936_0",
        "name": "Select Your Stuffed Crust (Medium)",
        "required": false,
        "options": [
          {
            "id": "ad_801936_0_none",
            "name": "Standard (No Extra Add-on)",
            "priceDelta": 0
          },
          {
            "id": "ad_801936_0_0",
            "name": "Add on Diamond Crust",
            "priceDelta": 250
          },
          {
            "id": "ad_801936_0_1",
            "name": "Add on Adana Kabab",
            "priceDelta": 250
          },
          {
            "id": "ad_801936_0_2",
            "name": "Add on Kabab Crust",
            "priceDelta": 250
          },
          {
            "id": "ad_801936_0_3",
            "name": "Add on Cheese Crust",
            "priceDelta": 250
          }
        ]
      },
      {
        "id": "grp_ad_801936_1",
        "name": "Select Your Stuffed Crust (Large)",
        "required": false,
        "options": [
          {
            "id": "ad_801936_1_none",
            "name": "Standard (No Extra Add-on)",
            "priceDelta": 0
          },
          {
            "id": "ad_801936_1_0",
            "name": "Add on Diamond Crust",
            "priceDelta": 350
          },
          {
            "id": "ad_801936_1_1",
            "name": "Add on Adana Kabab",
            "priceDelta": 350
          },
          {
            "id": "ad_801936_1_2",
            "name": "Add on Kabab Crust",
            "priceDelta": 350
          },
          {
            "id": "ad_801936_1_3",
            "name": "Add on Cheese Crust",
            "priceDelta": 350
          }
        ]
      },
      {
        "id": "grp_ad_801936_2",
        "name": "Select Your Stuffed Crust (X Large)",
        "required": false,
        "options": [
          {
            "id": "ad_801936_2_none",
            "name": "Standard (No Extra Add-on)",
            "priceDelta": 0
          },
          {
            "id": "ad_801936_2_0",
            "name": "Add on Diamond Crust",
            "priceDelta": 450
          },
          {
            "id": "ad_801936_2_1",
            "name": "Add on Adana Kabab",
            "priceDelta": 450
          },
          {
            "id": "ad_801936_2_2",
            "name": "Add on Kabab Crust",
            "priceDelta": 450
          },
          {
            "id": "ad_801936_2_3",
            "name": "Add on Cheese Crust",
            "priceDelta": 450
          }
        ]
      }
    ]
  },
  {
    "id": 801932,
    "category": "Signature Pizzas",
    "name": "Peri Peri",
    "description": "A Delightful Blend Of Pizza Sauce, Juicy Chicken Tikka, Fresh Onions, And Mozzarella Cheese.",
    "price": 699,
    "tag": "Signature",
    "available": true,
    "prepTimeMinutes": 18,
    "imageUrl": "https://assets.indolj.io/upload/1765400408-Peri Peri_14_11zon.jpg?q=10",
    "modifierGroups": [
      {
        "id": "grp_size_801932",
        "name": "Select Size / Portion",
        "required": true,
        "options": [
          {
            "id": "size_801932_0",
            "name": "Small (Rs. 699)",
            "priceDelta": 0
          },
          {
            "id": "size_801932_1",
            "name": "Medium (Rs. 1,450)",
            "priceDelta": 751
          },
          {
            "id": "size_801932_2",
            "name": "Large (Rs. 2,150)",
            "priceDelta": 1451
          },
          {
            "id": "size_801932_3",
            "name": "X-Large (Rs. 3,049)",
            "priceDelta": 2350
          },
          {
            "id": "size_801932_4",
            "name": "Mega (Rs. 3,949)",
            "priceDelta": 3250
          }
        ]
      },
      {
        "id": "grp_ad_801932_0",
        "name": "Select Your Stuffed Crust (Medium)",
        "required": false,
        "options": [
          {
            "id": "ad_801932_0_none",
            "name": "Standard (No Extra Add-on)",
            "priceDelta": 0
          },
          {
            "id": "ad_801932_0_0",
            "name": "Add on Diamond Crust",
            "priceDelta": 250
          },
          {
            "id": "ad_801932_0_1",
            "name": "Add on Adana Kabab",
            "priceDelta": 250
          },
          {
            "id": "ad_801932_0_2",
            "name": "Add on Kabab Crust",
            "priceDelta": 250
          },
          {
            "id": "ad_801932_0_3",
            "name": "Add on Cheese Crust",
            "priceDelta": 250
          }
        ]
      },
      {
        "id": "grp_ad_801932_1",
        "name": "Select Your Stuffed Crust (Large)",
        "required": false,
        "options": [
          {
            "id": "ad_801932_1_none",
            "name": "Standard (No Extra Add-on)",
            "priceDelta": 0
          },
          {
            "id": "ad_801932_1_0",
            "name": "Add on Diamond Crust",
            "priceDelta": 350
          },
          {
            "id": "ad_801932_1_1",
            "name": "Add on Adana Kabab",
            "priceDelta": 350
          },
          {
            "id": "ad_801932_1_2",
            "name": "Add on Kabab Crust",
            "priceDelta": 350
          },
          {
            "id": "ad_801932_1_3",
            "name": "Add on Cheese Crust",
            "priceDelta": 350
          }
        ]
      },
      {
        "id": "grp_ad_801932_2",
        "name": "Select Your Stuffed Crust (X Large)",
        "required": false,
        "options": [
          {
            "id": "ad_801932_2_none",
            "name": "Standard (No Extra Add-on)",
            "priceDelta": 0
          },
          {
            "id": "ad_801932_2_0",
            "name": "Add on Diamond Crust",
            "priceDelta": 450
          },
          {
            "id": "ad_801932_2_1",
            "name": "Add on Adana Kabab",
            "priceDelta": 450
          },
          {
            "id": "ad_801932_2_2",
            "name": "Add on Kabab Crust",
            "priceDelta": 450
          },
          {
            "id": "ad_801932_2_3",
            "name": "Add on Cheese Crust",
            "priceDelta": 450
          }
        ]
      }
    ]
  },
  {
    "id": 892746,
    "category": "Signature Pizzas",
    "name": "Smokey B.B.Q",
    "description": "Available in Small, Medium, Large, X-Large, Mega sizes. Oven-baked fresh at Heat Box Pizza.",
    "price": 699,
    "tag": "Signature",
    "available": true,
    "prepTimeMinutes": 18,
    "imageUrl": "https://assets.indolj.io/upload/1788867971-HEAATBOX.webp?q=10",
    "modifierGroups": [
      {
        "id": "grp_size_892746",
        "name": "Select Size / Portion",
        "required": true,
        "options": [
          {
            "id": "size_892746_0",
            "name": "Small (Rs. 699)",
            "priceDelta": 0
          },
          {
            "id": "size_892746_1",
            "name": "Medium (Rs. 1,450)",
            "priceDelta": 751
          },
          {
            "id": "size_892746_2",
            "name": "Large (Rs. 2,150)",
            "priceDelta": 1451
          },
          {
            "id": "size_892746_3",
            "name": "X-Large (Rs. 3,049)",
            "priceDelta": 2350
          },
          {
            "id": "size_892746_4",
            "name": "Mega (Rs. 3,949)",
            "priceDelta": 3250
          }
        ]
      },
      {
        "id": "grp_ad_892746_0",
        "name": "Select Your Stuffed Crust (Medium)",
        "required": false,
        "options": [
          {
            "id": "ad_892746_0_none",
            "name": "Standard (No Extra Add-on)",
            "priceDelta": 0
          },
          {
            "id": "ad_892746_0_0",
            "name": "Add on Diamond Crust",
            "priceDelta": 250
          },
          {
            "id": "ad_892746_0_1",
            "name": "Add on Adana Kabab",
            "priceDelta": 250
          },
          {
            "id": "ad_892746_0_2",
            "name": "Add on Kabab Crust",
            "priceDelta": 250
          },
          {
            "id": "ad_892746_0_3",
            "name": "Add on Cheese Crust",
            "priceDelta": 250
          }
        ]
      },
      {
        "id": "grp_ad_892746_1",
        "name": "Select Your Stuffed Crust (Large)",
        "required": false,
        "options": [
          {
            "id": "ad_892746_1_none",
            "name": "Standard (No Extra Add-on)",
            "priceDelta": 0
          },
          {
            "id": "ad_892746_1_0",
            "name": "Add on Diamond Crust",
            "priceDelta": 350
          },
          {
            "id": "ad_892746_1_1",
            "name": "Add on Adana Kabab",
            "priceDelta": 350
          },
          {
            "id": "ad_892746_1_2",
            "name": "Add on Kabab Crust",
            "priceDelta": 350
          },
          {
            "id": "ad_892746_1_3",
            "name": "Add on Cheese Crust",
            "priceDelta": 350
          }
        ]
      },
      {
        "id": "grp_ad_892746_2",
        "name": "Select Your Stuffed Crust (X Large)",
        "required": false,
        "options": [
          {
            "id": "ad_892746_2_none",
            "name": "Standard (No Extra Add-on)",
            "priceDelta": 0
          },
          {
            "id": "ad_892746_2_0",
            "name": "Add on Diamond Crust",
            "priceDelta": 450
          },
          {
            "id": "ad_892746_2_1",
            "name": "Add on Adana Kabab",
            "priceDelta": 450
          },
          {
            "id": "ad_892746_2_2",
            "name": "Add on Kabab Crust",
            "priceDelta": 450
          },
          {
            "id": "ad_892746_2_3",
            "name": "Add on Cheese Crust",
            "priceDelta": 450
          }
        ]
      }
    ]
  },
  {
    "id": 801928,
    "category": "Signature Pizzas",
    "name": "Diamond Crust Pizza",
    "description": "Available in Medium, Large, X-Large, Mega sizes. Oven-baked fresh at Heat Box Pizza.",
    "price": 1450,
    "tag": "Signature",
    "available": true,
    "prepTimeMinutes": 18,
    "imageUrl": "https://assets.indolj.io/upload/1765400356-Diamond Crust_19_11zon.jpg?q=10",
    "modifierGroups": [
      {
        "id": "grp_size_801928",
        "name": "Select Size / Portion",
        "required": true,
        "options": [
          {
            "id": "size_801928_0",
            "name": "Medium (Rs. 1,450)",
            "priceDelta": 0
          },
          {
            "id": "size_801928_1",
            "name": "Large (Rs. 2,150)",
            "priceDelta": 700
          },
          {
            "id": "size_801928_2",
            "name": "X-Large (Rs. 3,049)",
            "priceDelta": 1599
          },
          {
            "id": "size_801928_3",
            "name": "Mega (Rs. 3,949)",
            "priceDelta": 2499
          }
        ]
      },
      {
        "id": "grp_ad_801928_0",
        "name": "Select Your Stuffed Crust (Medium)",
        "required": false,
        "options": [
          {
            "id": "ad_801928_0_none",
            "name": "Standard (No Extra Add-on)",
            "priceDelta": 0
          },
          {
            "id": "ad_801928_0_0",
            "name": "Add on Diamond Crust",
            "priceDelta": 250
          },
          {
            "id": "ad_801928_0_1",
            "name": "Add on Adana Kabab",
            "priceDelta": 250
          },
          {
            "id": "ad_801928_0_2",
            "name": "Add on Kabab Crust",
            "priceDelta": 250
          },
          {
            "id": "ad_801928_0_3",
            "name": "Add on Cheese Crust",
            "priceDelta": 250
          }
        ]
      },
      {
        "id": "grp_ad_801928_1",
        "name": "Select Your Stuffed Crust (Large)",
        "required": false,
        "options": [
          {
            "id": "ad_801928_1_none",
            "name": "Standard (No Extra Add-on)",
            "priceDelta": 0
          },
          {
            "id": "ad_801928_1_0",
            "name": "Add on Diamond Crust",
            "priceDelta": 350
          },
          {
            "id": "ad_801928_1_1",
            "name": "Add on Adana Kabab",
            "priceDelta": 350
          },
          {
            "id": "ad_801928_1_2",
            "name": "Add on Kabab Crust",
            "priceDelta": 350
          },
          {
            "id": "ad_801928_1_3",
            "name": "Add on Cheese Crust",
            "priceDelta": 350
          }
        ]
      },
      {
        "id": "grp_ad_801928_2",
        "name": "Select Your Stuffed Crust (X Large)",
        "required": false,
        "options": [
          {
            "id": "ad_801928_2_none",
            "name": "Standard (No Extra Add-on)",
            "priceDelta": 0
          },
          {
            "id": "ad_801928_2_0",
            "name": "Add on Diamond Crust",
            "priceDelta": 450
          },
          {
            "id": "ad_801928_2_1",
            "name": "Add on Adana Kabab",
            "priceDelta": 450
          },
          {
            "id": "ad_801928_2_2",
            "name": "Add on Kabab Crust",
            "priceDelta": 450
          },
          {
            "id": "ad_801928_2_3",
            "name": "Add on Cheese Crust",
            "priceDelta": 450
          }
        ]
      }
    ]
  },
  {
    "id": 841100,
    "category": "Signature Pizzas",
    "name": "Behari Kabab",
    "description": "Tender Behari-style kabab piece layered over melted mozzarella cheese, topped with jalapenos, Onions and creamy sauce drizzle on a freshly baked golden.",
    "price": 1450,
    "tag": "Signature",
    "available": true,
    "prepTimeMinutes": 18,
    "imageUrl": "https://assets.indolj.io/upload/1780156573-beharikabab.webp?q=10",
    "modifierGroups": [
      {
        "id": "grp_size_841100",
        "name": "Select Size / Portion",
        "required": true,
        "options": [
          {
            "id": "size_841100_0",
            "name": "Regular (Rs. 1,450)",
            "priceDelta": 0
          },
          {
            "id": "size_841100_1",
            "name": "Large (Rs. 2,150)",
            "priceDelta": 700
          },
          {
            "id": "size_841100_2",
            "name": "X-Large (Rs. 3,049)",
            "priceDelta": 1599
          },
          {
            "id": "size_841100_3",
            "name": "Mega (Rs. 3,949)",
            "priceDelta": 2499
          }
        ]
      },
      {
        "id": "grp_ad_841100_0",
        "name": "Select Your Stuffed Crust (Medium)",
        "required": false,
        "options": [
          {
            "id": "ad_841100_0_none",
            "name": "Standard (No Extra Add-on)",
            "priceDelta": 0
          },
          {
            "id": "ad_841100_0_0",
            "name": "Add on Diamond Crust",
            "priceDelta": 250
          },
          {
            "id": "ad_841100_0_1",
            "name": "Add on Adana Kabab",
            "priceDelta": 250
          },
          {
            "id": "ad_841100_0_2",
            "name": "Add on Kabab Crust",
            "priceDelta": 250
          },
          {
            "id": "ad_841100_0_3",
            "name": "Add on Cheese Crust",
            "priceDelta": 250
          }
        ]
      },
      {
        "id": "grp_ad_841100_1",
        "name": "Select Your Stuffed Crust (Large)",
        "required": false,
        "options": [
          {
            "id": "ad_841100_1_none",
            "name": "Standard (No Extra Add-on)",
            "priceDelta": 0
          },
          {
            "id": "ad_841100_1_0",
            "name": "Add on Diamond Crust",
            "priceDelta": 350
          },
          {
            "id": "ad_841100_1_1",
            "name": "Add on Adana Kabab",
            "priceDelta": 350
          },
          {
            "id": "ad_841100_1_2",
            "name": "Add on Kabab Crust",
            "priceDelta": 350
          },
          {
            "id": "ad_841100_1_3",
            "name": "Add on Cheese Crust",
            "priceDelta": 350
          }
        ]
      },
      {
        "id": "grp_ad_841100_2",
        "name": "Select Your Stuffed Crust (X Large)",
        "required": false,
        "options": [
          {
            "id": "ad_841100_2_none",
            "name": "Standard (No Extra Add-on)",
            "priceDelta": 0
          },
          {
            "id": "ad_841100_2_0",
            "name": "Add on Diamond Crust",
            "priceDelta": 450
          },
          {
            "id": "ad_841100_2_1",
            "name": "Add on Adana Kabab",
            "priceDelta": 450
          },
          {
            "id": "ad_841100_2_2",
            "name": "Add on Kabab Crust",
            "priceDelta": 450
          },
          {
            "id": "ad_841100_2_3",
            "name": "Add on Cheese Crust",
            "priceDelta": 450
          }
        ]
      }
    ]
  },
  {
    "id": 801927,
    "category": "Signature Pizzas",
    "name": "Stuffed Crust Pizza",
    "description": "Kabab or Cheese",
    "price": 1450,
    "tag": "Signature",
    "available": true,
    "prepTimeMinutes": 18,
    "imageUrl": "https://assets.indolj.io/upload/1765400347-Stuffed Crust Pizza_35_11zon.jpg?q=10",
    "modifierGroups": [
      {
        "id": "grp_size_801927",
        "name": "Select Size / Portion",
        "required": true,
        "options": [
          {
            "id": "size_801927_0",
            "name": "Medium (Rs. 1,450)",
            "priceDelta": 0
          },
          {
            "id": "size_801927_1",
            "name": "Large (Rs. 2,150)",
            "priceDelta": 700
          },
          {
            "id": "size_801927_2",
            "name": "X-Large (Rs. 3,049)",
            "priceDelta": 1599
          },
          {
            "id": "size_801927_3",
            "name": "Mega (Rs. 3,949)",
            "priceDelta": 2499
          }
        ]
      },
      {
        "id": "grp_ad_801927_0",
        "name": "Select Your Stuffed Crust (Medium)",
        "required": false,
        "options": [
          {
            "id": "ad_801927_0_none",
            "name": "Standard (No Extra Add-on)",
            "priceDelta": 0
          },
          {
            "id": "ad_801927_0_0",
            "name": "Add on Diamond Crust",
            "priceDelta": 250
          },
          {
            "id": "ad_801927_0_1",
            "name": "Add on Adana Kabab",
            "priceDelta": 250
          },
          {
            "id": "ad_801927_0_2",
            "name": "Add on Kabab Crust",
            "priceDelta": 250
          },
          {
            "id": "ad_801927_0_3",
            "name": "Add on Cheese Crust",
            "priceDelta": 250
          }
        ]
      },
      {
        "id": "grp_ad_801927_1",
        "name": "Select Your Stuffed Crust (Large)",
        "required": false,
        "options": [
          {
            "id": "ad_801927_1_none",
            "name": "Standard (No Extra Add-on)",
            "priceDelta": 0
          },
          {
            "id": "ad_801927_1_0",
            "name": "Add on Diamond Crust",
            "priceDelta": 350
          },
          {
            "id": "ad_801927_1_1",
            "name": "Add on Adana Kabab",
            "priceDelta": 350
          },
          {
            "id": "ad_801927_1_2",
            "name": "Add on Kabab Crust",
            "priceDelta": 350
          },
          {
            "id": "ad_801927_1_3",
            "name": "Add on Cheese Crust",
            "priceDelta": 350
          }
        ]
      },
      {
        "id": "grp_ad_801927_2",
        "name": "Select Your Stuffed Crust (X Large)",
        "required": false,
        "options": [
          {
            "id": "ad_801927_2_none",
            "name": "Standard (No Extra Add-on)",
            "priceDelta": 0
          },
          {
            "id": "ad_801927_2_0",
            "name": "Add on Diamond Crust",
            "priceDelta": 450
          },
          {
            "id": "ad_801927_2_1",
            "name": "Add on Adana Kabab",
            "priceDelta": 450
          },
          {
            "id": "ad_801927_2_2",
            "name": "Add on Kabab Crust",
            "priceDelta": 450
          },
          {
            "id": "ad_801927_2_3",
            "name": "Add on Cheese Crust",
            "priceDelta": 450
          }
        ]
      }
    ]
  },
  {
    "id": 801929,
    "category": "Signature Pizzas",
    "name": "Cheesy Bite Pizza",
    "description": "Available in Medium, Large, X-Large, Mega sizes. Oven-baked fresh at Heat Box Pizza.",
    "price": 1450,
    "tag": "Signature",
    "available": true,
    "prepTimeMinutes": 18,
    "imageUrl": "https://assets.indolj.io/upload/1765400361-Cheesy Bite pizza_4_11zon.jpg?q=10",
    "modifierGroups": [
      {
        "id": "grp_size_801929",
        "name": "Select Size / Portion",
        "required": true,
        "options": [
          {
            "id": "size_801929_0",
            "name": "Medium (Rs. 1,450)",
            "priceDelta": 0
          },
          {
            "id": "size_801929_1",
            "name": "Large (Rs. 2,150)",
            "priceDelta": 700
          },
          {
            "id": "size_801929_2",
            "name": "X-Large (Rs. 3,049)",
            "priceDelta": 1599
          },
          {
            "id": "size_801929_3",
            "name": "Mega (Rs. 3,949)",
            "priceDelta": 2499
          }
        ]
      },
      {
        "id": "grp_ad_801929_0",
        "name": "Select Your Stuffed Crust (Medium)",
        "required": false,
        "options": [
          {
            "id": "ad_801929_0_none",
            "name": "Standard (No Extra Add-on)",
            "priceDelta": 0
          },
          {
            "id": "ad_801929_0_0",
            "name": "Add on Diamond Crust",
            "priceDelta": 250
          },
          {
            "id": "ad_801929_0_1",
            "name": "Add on Adana Kabab",
            "priceDelta": 250
          },
          {
            "id": "ad_801929_0_2",
            "name": "Add on Kabab Crust",
            "priceDelta": 250
          },
          {
            "id": "ad_801929_0_3",
            "name": "Add on Cheese Crust",
            "priceDelta": 250
          }
        ]
      },
      {
        "id": "grp_ad_801929_1",
        "name": "Select Your Stuffed Crust (Large)",
        "required": false,
        "options": [
          {
            "id": "ad_801929_1_none",
            "name": "Standard (No Extra Add-on)",
            "priceDelta": 0
          },
          {
            "id": "ad_801929_1_0",
            "name": "Add on Diamond Crust",
            "priceDelta": 350
          },
          {
            "id": "ad_801929_1_1",
            "name": "Add on Adana Kabab",
            "priceDelta": 350
          },
          {
            "id": "ad_801929_1_2",
            "name": "Add on Kabab Crust",
            "priceDelta": 350
          },
          {
            "id": "ad_801929_1_3",
            "name": "Add on Cheese Crust",
            "priceDelta": 350
          }
        ]
      },
      {
        "id": "grp_ad_801929_2",
        "name": "Select Your Stuffed Crust (X Large)",
        "required": false,
        "options": [
          {
            "id": "ad_801929_2_none",
            "name": "Standard (No Extra Add-on)",
            "priceDelta": 0
          },
          {
            "id": "ad_801929_2_0",
            "name": "Add on Diamond Crust",
            "priceDelta": 450
          },
          {
            "id": "ad_801929_2_1",
            "name": "Add on Adana Kabab",
            "priceDelta": 450
          },
          {
            "id": "ad_801929_2_2",
            "name": "Add on Kabab Crust",
            "priceDelta": 450
          },
          {
            "id": "ad_801929_2_3",
            "name": "Add on Cheese Crust",
            "priceDelta": 450
          }
        ]
      }
    ]
  },
  {
    "id": 801931,
    "category": "Signature Pizzas",
    "name": "Fire Square Pizza",
    "description": "Bold flavors. Crispy corners. A square-cut slice of heat, baked to perfection in every bite.",
    "price": 1450,
    "tag": "Signature",
    "available": true,
    "prepTimeMinutes": 18,
    "imageUrl": "https://assets.indolj.io/upload/1765400381-Fire Square_21_11zon.jpg?q=10",
    "modifierGroups": [
      {
        "id": "grp_size_801931",
        "name": "Select Size / Portion",
        "required": true,
        "options": [
          {
            "id": "size_801931_0",
            "name": "Medium (Rs. 1,450)",
            "priceDelta": 0
          },
          {
            "id": "size_801931_1",
            "name": "Large (Rs. 2,150)",
            "priceDelta": 700
          }
        ]
      },
      {
        "id": "grp_ad_801931_0",
        "name": "Select Your Stuffed Crust (Medium)",
        "required": false,
        "options": [
          {
            "id": "ad_801931_0_none",
            "name": "Standard (No Extra Add-on)",
            "priceDelta": 0
          },
          {
            "id": "ad_801931_0_0",
            "name": "Add on Diamond Crust",
            "priceDelta": 250
          },
          {
            "id": "ad_801931_0_1",
            "name": "Add on Adana Kabab",
            "priceDelta": 250
          },
          {
            "id": "ad_801931_0_2",
            "name": "Add on Kabab Crust",
            "priceDelta": 250
          },
          {
            "id": "ad_801931_0_3",
            "name": "Add on Cheese Crust",
            "priceDelta": 250
          }
        ]
      },
      {
        "id": "grp_ad_801931_1",
        "name": "Select Your Stuffed Crust (Large)",
        "required": false,
        "options": [
          {
            "id": "ad_801931_1_none",
            "name": "Standard (No Extra Add-on)",
            "priceDelta": 0
          },
          {
            "id": "ad_801931_1_0",
            "name": "Add on Diamond Crust",
            "priceDelta": 350
          },
          {
            "id": "ad_801931_1_1",
            "name": "Add on Adana Kabab",
            "priceDelta": 350
          },
          {
            "id": "ad_801931_1_2",
            "name": "Add on Kabab Crust",
            "priceDelta": 350
          },
          {
            "id": "ad_801931_1_3",
            "name": "Add on Cheese Crust",
            "priceDelta": 350
          }
        ]
      },
      {
        "id": "grp_ad_801931_2",
        "name": "Select Your Stuffed Crust (X Large)",
        "required": false,
        "options": [
          {
            "id": "ad_801931_2_none",
            "name": "Standard (No Extra Add-on)",
            "priceDelta": 0
          },
          {
            "id": "ad_801931_2_0",
            "name": "Add on Diamond Crust",
            "priceDelta": 450
          },
          {
            "id": "ad_801931_2_1",
            "name": "Add on Adana Kabab",
            "priceDelta": 450
          },
          {
            "id": "ad_801931_2_2",
            "name": "Add on Kabab Crust",
            "priceDelta": 450
          },
          {
            "id": "ad_801931_2_3",
            "name": "Add on Cheese Crust",
            "priceDelta": 450
          }
        ]
      }
    ]
  },
  {
    "id": 801944,
    "category": "Classic Pizzas",
    "name": "Cheese Lover",
    "description": "Pizza Sauce Loaded With Lots Of Cheese For A Cheesy Delight.",
    "price": 599,
    "tag": "Classic Flavor",
    "available": true,
    "prepTimeMinutes": 18,
    "imageUrl": "https://assets.indolj.io/upload/1765400527-Cheese Liver_3_11zon.jpg?q=10",
    "modifierGroups": [
      {
        "id": "grp_size_801944",
        "name": "Select Size / Portion",
        "required": true,
        "options": [
          {
            "id": "size_801944_0",
            "name": "Small (Rs. 599)",
            "priceDelta": 0
          },
          {
            "id": "size_801944_1",
            "name": "Medium (Rs. 1,349)",
            "priceDelta": 750
          },
          {
            "id": "size_801944_2",
            "name": "Large (Rs. 1,950)",
            "priceDelta": 1351
          },
          {
            "id": "size_801944_3",
            "name": "X-Large (Rs. 2,950)",
            "priceDelta": 2351
          },
          {
            "id": "size_801944_4",
            "name": "Mega (Rs. 3,850)",
            "priceDelta": 3251
          }
        ]
      },
      {
        "id": "grp_ad_801944_0",
        "name": "Select Your Stuffed Crust (Medium)",
        "required": false,
        "options": [
          {
            "id": "ad_801944_0_none",
            "name": "Standard (No Extra Add-on)",
            "priceDelta": 0
          },
          {
            "id": "ad_801944_0_0",
            "name": "Add on Diamond Crust",
            "priceDelta": 250
          },
          {
            "id": "ad_801944_0_1",
            "name": "Add on Adana Kabab",
            "priceDelta": 250
          },
          {
            "id": "ad_801944_0_2",
            "name": "Add on Kabab Crust",
            "priceDelta": 250
          },
          {
            "id": "ad_801944_0_3",
            "name": "Add on Cheese Crust",
            "priceDelta": 250
          }
        ]
      },
      {
        "id": "grp_ad_801944_1",
        "name": "Select Your Stuffed Crust (Large)",
        "required": false,
        "options": [
          {
            "id": "ad_801944_1_none",
            "name": "Standard (No Extra Add-on)",
            "priceDelta": 0
          },
          {
            "id": "ad_801944_1_0",
            "name": "Add on Diamond Crust",
            "priceDelta": 350
          },
          {
            "id": "ad_801944_1_1",
            "name": "Add on Adana Kabab",
            "priceDelta": 350
          },
          {
            "id": "ad_801944_1_2",
            "name": "Add on Kabab Crust",
            "priceDelta": 350
          },
          {
            "id": "ad_801944_1_3",
            "name": "Add on Cheese Crust",
            "priceDelta": 350
          }
        ]
      },
      {
        "id": "grp_ad_801944_2",
        "name": "Select Your Stuffed Crust (X Large)",
        "required": false,
        "options": [
          {
            "id": "ad_801944_2_none",
            "name": "Standard (No Extra Add-on)",
            "priceDelta": 0
          },
          {
            "id": "ad_801944_2_0",
            "name": "Add on Diamond Crust",
            "priceDelta": 450
          },
          {
            "id": "ad_801944_2_1",
            "name": "Add on Adana Kabab",
            "priceDelta": 450
          },
          {
            "id": "ad_801944_2_2",
            "name": "Add on Kabab Crust",
            "priceDelta": 450
          },
          {
            "id": "ad_801944_2_3",
            "name": "Add on Cheese Crust",
            "priceDelta": 450
          }
        ]
      }
    ]
  },
  {
    "id": 801938,
    "category": "Classic Pizzas",
    "name": "Chicken Tikka",
    "description": "A Delightful Blend Of Pizza Sauce, Juicy Chicken Tikka, Fresh Onions, And Mozzarella Cheese.",
    "price": 599,
    "tag": "Classic Flavor",
    "available": true,
    "prepTimeMinutes": 18,
    "imageUrl": "https://assets.indolj.io/upload/1765400456-Chicken Tikka_7_11zon.jpg?q=10",
    "modifierGroups": [
      {
        "id": "grp_size_801938",
        "name": "Select Size / Portion",
        "required": true,
        "options": [
          {
            "id": "size_801938_0",
            "name": "Small (Rs. 599)",
            "priceDelta": 0
          },
          {
            "id": "size_801938_1",
            "name": "Medium (Rs. 1,349)",
            "priceDelta": 750
          },
          {
            "id": "size_801938_2",
            "name": "Large (Rs. 1,950)",
            "priceDelta": 1351
          },
          {
            "id": "size_801938_3",
            "name": "X-Large (Rs. 2,950)",
            "priceDelta": 2351
          },
          {
            "id": "size_801938_4",
            "name": "Mega (Rs. 3,850)",
            "priceDelta": 3251
          }
        ]
      },
      {
        "id": "grp_ad_801938_0",
        "name": "Select Your Stuffed Crust (Medium)",
        "required": false,
        "options": [
          {
            "id": "ad_801938_0_none",
            "name": "Standard (No Extra Add-on)",
            "priceDelta": 0
          },
          {
            "id": "ad_801938_0_0",
            "name": "Add on Diamond Crust",
            "priceDelta": 250
          },
          {
            "id": "ad_801938_0_1",
            "name": "Add on Adana Kabab",
            "priceDelta": 250
          },
          {
            "id": "ad_801938_0_2",
            "name": "Add on Kabab Crust",
            "priceDelta": 250
          },
          {
            "id": "ad_801938_0_3",
            "name": "Add on Cheese Crust",
            "priceDelta": 250
          }
        ]
      },
      {
        "id": "grp_ad_801938_1",
        "name": "Select Your Stuffed Crust (Large)",
        "required": false,
        "options": [
          {
            "id": "ad_801938_1_none",
            "name": "Standard (No Extra Add-on)",
            "priceDelta": 0
          },
          {
            "id": "ad_801938_1_0",
            "name": "Add on Diamond Crust",
            "priceDelta": 350
          },
          {
            "id": "ad_801938_1_1",
            "name": "Add on Adana Kabab",
            "priceDelta": 350
          },
          {
            "id": "ad_801938_1_2",
            "name": "Add on Kabab Crust",
            "priceDelta": 350
          },
          {
            "id": "ad_801938_1_3",
            "name": "Add on Cheese Crust",
            "priceDelta": 350
          }
        ]
      },
      {
        "id": "grp_ad_801938_2",
        "name": "Select Your Stuffed Crust (X Large)",
        "required": false,
        "options": [
          {
            "id": "ad_801938_2_none",
            "name": "Standard (No Extra Add-on)",
            "priceDelta": 0
          },
          {
            "id": "ad_801938_2_0",
            "name": "Add on Diamond Crust",
            "priceDelta": 450
          },
          {
            "id": "ad_801938_2_1",
            "name": "Add on Adana Kabab",
            "priceDelta": 450
          },
          {
            "id": "ad_801938_2_2",
            "name": "Add on Kabab Crust",
            "priceDelta": 450
          },
          {
            "id": "ad_801938_2_3",
            "name": "Add on Cheese Crust",
            "priceDelta": 450
          }
        ]
      }
    ]
  },
  {
    "id": 801937,
    "category": "Classic Pizzas",
    "name": "Chicken Fajita",
    "description": "Savory Pizza Sauce Topped With Seasoned Chicken Fajita, Onions, Capsicum, And Melted Mozzarella Cheese.",
    "price": 599,
    "tag": "Classic Flavor",
    "available": true,
    "prepTimeMinutes": 18,
    "imageUrl": "https://assets.indolj.io/upload/1765400450-Chicken Fajita_4_11zon.jpg?q=10",
    "modifierGroups": [
      {
        "id": "grp_size_801937",
        "name": "Select Size / Portion",
        "required": true,
        "options": [
          {
            "id": "size_801937_0",
            "name": "Small (Rs. 599)",
            "priceDelta": 0
          },
          {
            "id": "size_801937_1",
            "name": "Medium (Rs. 1,349)",
            "priceDelta": 750
          },
          {
            "id": "size_801937_2",
            "name": "Large (Rs. 1,950)",
            "priceDelta": 1351
          },
          {
            "id": "size_801937_3",
            "name": "X-Large (Rs. 2,950)",
            "priceDelta": 2351
          },
          {
            "id": "size_801937_4",
            "name": "Mega (Rs. 3,850)",
            "priceDelta": 3251
          }
        ]
      },
      {
        "id": "grp_ad_801937_0",
        "name": "Select Your Stuffed Crust (Medium)",
        "required": false,
        "options": [
          {
            "id": "ad_801937_0_none",
            "name": "Standard (No Extra Add-on)",
            "priceDelta": 0
          },
          {
            "id": "ad_801937_0_0",
            "name": "Add on Diamond Crust",
            "priceDelta": 250
          },
          {
            "id": "ad_801937_0_1",
            "name": "Add on Adana Kabab",
            "priceDelta": 250
          },
          {
            "id": "ad_801937_0_2",
            "name": "Add on Kabab Crust",
            "priceDelta": 250
          },
          {
            "id": "ad_801937_0_3",
            "name": "Add on Cheese Crust",
            "priceDelta": 250
          }
        ]
      },
      {
        "id": "grp_ad_801937_1",
        "name": "Select Your Stuffed Crust (Large)",
        "required": false,
        "options": [
          {
            "id": "ad_801937_1_none",
            "name": "Standard (No Extra Add-on)",
            "priceDelta": 0
          },
          {
            "id": "ad_801937_1_0",
            "name": "Add on Diamond Crust",
            "priceDelta": 350
          },
          {
            "id": "ad_801937_1_1",
            "name": "Add on Adana Kabab",
            "priceDelta": 350
          },
          {
            "id": "ad_801937_1_2",
            "name": "Add on Kabab Crust",
            "priceDelta": 350
          },
          {
            "id": "ad_801937_1_3",
            "name": "Add on Cheese Crust",
            "priceDelta": 350
          }
        ]
      },
      {
        "id": "grp_ad_801937_2",
        "name": "Select Your Stuffed Crust (X Large)",
        "required": false,
        "options": [
          {
            "id": "ad_801937_2_none",
            "name": "Standard (No Extra Add-on)",
            "priceDelta": 0
          },
          {
            "id": "ad_801937_2_0",
            "name": "Add on Diamond Crust",
            "priceDelta": 450
          },
          {
            "id": "ad_801937_2_1",
            "name": "Add on Adana Kabab",
            "priceDelta": 450
          },
          {
            "id": "ad_801937_2_2",
            "name": "Add on Kabab Crust",
            "priceDelta": 450
          },
          {
            "id": "ad_801937_2_3",
            "name": "Add on Cheese Crust",
            "priceDelta": 450
          }
        ]
      }
    ]
  },
  {
    "id": 801939,
    "category": "Classic Pizzas",
    "name": "Chicken Supreme",
    "description": "A Flavourful Mix Of Pizza Sauce, Chicken Tikka, Mushrooms, Olives, Onions, Capsicum, And Mozzarella Cheese.",
    "price": 599,
    "tag": "Classic Flavor",
    "available": true,
    "prepTimeMinutes": 18,
    "imageUrl": "https://assets.indolj.io/upload/1765400462-Chicken Supreme_6_11zon.jpg?q=10",
    "modifierGroups": [
      {
        "id": "grp_size_801939",
        "name": "Select Size / Portion",
        "required": true,
        "options": [
          {
            "id": "size_801939_0",
            "name": "Small (Rs. 599)",
            "priceDelta": 0
          },
          {
            "id": "size_801939_1",
            "name": "Medium (Rs. 1,349)",
            "priceDelta": 750
          },
          {
            "id": "size_801939_2",
            "name": "Large (Rs. 1,950)",
            "priceDelta": 1351
          },
          {
            "id": "size_801939_3",
            "name": "X-Large (Rs. 2,950)",
            "priceDelta": 2351
          },
          {
            "id": "size_801939_4",
            "name": "Mega (Rs. 3,850)",
            "priceDelta": 3251
          }
        ]
      },
      {
        "id": "grp_ad_801939_0",
        "name": "Select Your Stuffed Crust (Medium)",
        "required": false,
        "options": [
          {
            "id": "ad_801939_0_none",
            "name": "Standard (No Extra Add-on)",
            "priceDelta": 0
          },
          {
            "id": "ad_801939_0_0",
            "name": "Add on Diamond Crust",
            "priceDelta": 250
          },
          {
            "id": "ad_801939_0_1",
            "name": "Add on Adana Kabab",
            "priceDelta": 250
          },
          {
            "id": "ad_801939_0_2",
            "name": "Add on Kabab Crust",
            "priceDelta": 250
          },
          {
            "id": "ad_801939_0_3",
            "name": "Add on Cheese Crust",
            "priceDelta": 250
          }
        ]
      },
      {
        "id": "grp_ad_801939_1",
        "name": "Select Your Stuffed Crust (Large)",
        "required": false,
        "options": [
          {
            "id": "ad_801939_1_none",
            "name": "Standard (No Extra Add-on)",
            "priceDelta": 0
          },
          {
            "id": "ad_801939_1_0",
            "name": "Add on Diamond Crust",
            "priceDelta": 350
          },
          {
            "id": "ad_801939_1_1",
            "name": "Add on Adana Kabab",
            "priceDelta": 350
          },
          {
            "id": "ad_801939_1_2",
            "name": "Add on Kabab Crust",
            "priceDelta": 350
          },
          {
            "id": "ad_801939_1_3",
            "name": "Add on Cheese Crust",
            "priceDelta": 350
          }
        ]
      },
      {
        "id": "grp_ad_801939_2",
        "name": "Select Your Stuffed Crust (X Large)",
        "required": false,
        "options": [
          {
            "id": "ad_801939_2_none",
            "name": "Standard (No Extra Add-on)",
            "priceDelta": 0
          },
          {
            "id": "ad_801939_2_0",
            "name": "Add on Diamond Crust",
            "priceDelta": 450
          },
          {
            "id": "ad_801939_2_1",
            "name": "Add on Adana Kabab",
            "priceDelta": 450
          },
          {
            "id": "ad_801939_2_2",
            "name": "Add on Kabab Crust",
            "priceDelta": 450
          },
          {
            "id": "ad_801939_2_3",
            "name": "Add on Cheese Crust",
            "priceDelta": 450
          }
        ]
      }
    ]
  },
  {
    "id": 801943,
    "category": "Classic Pizzas",
    "name": "American Hot",
    "description": "A Meaty Feast Of Pepperoni With Our Hot Jalapeños, Mozzarella Cheese And Tomato Sauce.",
    "price": 599,
    "tag": "Classic Flavor",
    "available": true,
    "prepTimeMinutes": 18,
    "imageUrl": "https://assets.indolj.io/upload/1765400522-American Hot_2_11zon.jpg?q=10",
    "modifierGroups": [
      {
        "id": "grp_size_801943",
        "name": "Select Size / Portion",
        "required": true,
        "options": [
          {
            "id": "size_801943_0",
            "name": "Small (Rs. 599)",
            "priceDelta": 0
          },
          {
            "id": "size_801943_1",
            "name": "Medium (Rs. 1,349)",
            "priceDelta": 750
          },
          {
            "id": "size_801943_2",
            "name": "Large (Rs. 1,950)",
            "priceDelta": 1351
          },
          {
            "id": "size_801943_3",
            "name": "X-Large (Rs. 2,950)",
            "priceDelta": 2351
          },
          {
            "id": "size_801943_4",
            "name": "Mega (Rs. 3,850)",
            "priceDelta": 3251
          }
        ]
      },
      {
        "id": "grp_ad_801943_0",
        "name": "Select Your Stuffed Crust (Medium)",
        "required": false,
        "options": [
          {
            "id": "ad_801943_0_none",
            "name": "Standard (No Extra Add-on)",
            "priceDelta": 0
          },
          {
            "id": "ad_801943_0_0",
            "name": "Add on Diamond Crust",
            "priceDelta": 250
          },
          {
            "id": "ad_801943_0_1",
            "name": "Add on Adana Kabab",
            "priceDelta": 250
          },
          {
            "id": "ad_801943_0_2",
            "name": "Add on Kabab Crust",
            "priceDelta": 250
          },
          {
            "id": "ad_801943_0_3",
            "name": "Add on Cheese Crust",
            "priceDelta": 250
          }
        ]
      },
      {
        "id": "grp_ad_801943_1",
        "name": "Select Your Stuffed Crust (Large)",
        "required": false,
        "options": [
          {
            "id": "ad_801943_1_none",
            "name": "Standard (No Extra Add-on)",
            "priceDelta": 0
          },
          {
            "id": "ad_801943_1_0",
            "name": "Add on Diamond Crust",
            "priceDelta": 350
          },
          {
            "id": "ad_801943_1_1",
            "name": "Add on Adana Kabab",
            "priceDelta": 350
          },
          {
            "id": "ad_801943_1_2",
            "name": "Add on Kabab Crust",
            "priceDelta": 350
          },
          {
            "id": "ad_801943_1_3",
            "name": "Add on Cheese Crust",
            "priceDelta": 350
          }
        ]
      },
      {
        "id": "grp_ad_801943_2",
        "name": "Select Your Stuffed Crust (X Large)",
        "required": false,
        "options": [
          {
            "id": "ad_801943_2_none",
            "name": "Standard (No Extra Add-on)",
            "priceDelta": 0
          },
          {
            "id": "ad_801943_2_0",
            "name": "Add on Diamond Crust",
            "priceDelta": 450
          },
          {
            "id": "ad_801943_2_1",
            "name": "Add on Adana Kabab",
            "priceDelta": 450
          },
          {
            "id": "ad_801943_2_2",
            "name": "Add on Kabab Crust",
            "priceDelta": 450
          },
          {
            "id": "ad_801943_2_3",
            "name": "Add on Cheese Crust",
            "priceDelta": 450
          }
        ]
      }
    ]
  },
  {
    "id": 801947,
    "category": "Classic Pizzas",
    "name": "Pepperoni Lover",
    "description": "Classic Pizza Sauce Topped With Chicken Pepperoni And Lots Of Melted Mozzarella Cheese.",
    "price": 599,
    "tag": "Classic Flavor",
    "available": true,
    "prepTimeMinutes": 18,
    "imageUrl": "https://assets.indolj.io/upload/1765400545-Pepproni Lover_13_11zon.jpg?q=10",
    "modifierGroups": [
      {
        "id": "grp_size_801947",
        "name": "Select Size / Portion",
        "required": true,
        "options": [
          {
            "id": "size_801947_0",
            "name": "Small (Rs. 599)",
            "priceDelta": 0
          },
          {
            "id": "size_801947_1",
            "name": "Medium (Rs. 1,349)",
            "priceDelta": 750
          },
          {
            "id": "size_801947_2",
            "name": "Large (Rs. 1,950)",
            "priceDelta": 1351
          },
          {
            "id": "size_801947_3",
            "name": "X-Large (Rs. 2,950)",
            "priceDelta": 2351
          },
          {
            "id": "size_801947_4",
            "name": "Mega (Rs. 3,850)",
            "priceDelta": 3251
          }
        ]
      },
      {
        "id": "grp_ad_801947_0",
        "name": "Select Your Stuffed Crust (Medium)",
        "required": false,
        "options": [
          {
            "id": "ad_801947_0_none",
            "name": "Standard (No Extra Add-on)",
            "priceDelta": 0
          },
          {
            "id": "ad_801947_0_0",
            "name": "Add on Diamond Crust",
            "priceDelta": 250
          },
          {
            "id": "ad_801947_0_1",
            "name": "Add on Adana Kabab",
            "priceDelta": 250
          },
          {
            "id": "ad_801947_0_2",
            "name": "Add on Kabab Crust",
            "priceDelta": 250
          },
          {
            "id": "ad_801947_0_3",
            "name": "Add on Cheese Crust",
            "priceDelta": 250
          }
        ]
      },
      {
        "id": "grp_ad_801947_1",
        "name": "Select Your Stuffed Crust (Large)",
        "required": false,
        "options": [
          {
            "id": "ad_801947_1_none",
            "name": "Standard (No Extra Add-on)",
            "priceDelta": 0
          },
          {
            "id": "ad_801947_1_0",
            "name": "Add on Diamond Crust",
            "priceDelta": 350
          },
          {
            "id": "ad_801947_1_1",
            "name": "Add on Adana Kabab",
            "priceDelta": 350
          },
          {
            "id": "ad_801947_1_2",
            "name": "Add on Kabab Crust",
            "priceDelta": 350
          },
          {
            "id": "ad_801947_1_3",
            "name": "Add on Cheese Crust",
            "priceDelta": 350
          }
        ]
      },
      {
        "id": "grp_ad_801947_2",
        "name": "Select Your Stuffed Crust (X Large)",
        "required": false,
        "options": [
          {
            "id": "ad_801947_2_none",
            "name": "Standard (No Extra Add-on)",
            "priceDelta": 0
          },
          {
            "id": "ad_801947_2_0",
            "name": "Add on Diamond Crust",
            "priceDelta": 450
          },
          {
            "id": "ad_801947_2_1",
            "name": "Add on Adana Kabab",
            "priceDelta": 450
          },
          {
            "id": "ad_801947_2_2",
            "name": "Add on Kabab Crust",
            "priceDelta": 450
          },
          {
            "id": "ad_801947_2_3",
            "name": "Add on Cheese Crust",
            "priceDelta": 450
          }
        ]
      }
    ]
  },
  {
    "id": 801933,
    "category": "Classic Pizzas",
    "name": "Chilli Chicken",
    "description": "Fire Up Your Taste Buds With Spicy Chicken Chunks, Onion, Olives, Jalapeños And Hot Peri Sauce.",
    "price": 599,
    "tag": "Classic Flavor",
    "available": true,
    "prepTimeMinutes": 18,
    "imageUrl": "https://assets.indolj.io/upload/1765400416-ChilliChicken_8_11zon.jpg?q=10",
    "modifierGroups": [
      {
        "id": "grp_size_801933",
        "name": "Select Size / Portion",
        "required": true,
        "options": [
          {
            "id": "size_801933_0",
            "name": "Small (Rs. 599)",
            "priceDelta": 0
          },
          {
            "id": "size_801933_1",
            "name": "Medium (Rs. 1,349)",
            "priceDelta": 750
          },
          {
            "id": "size_801933_2",
            "name": "Large (Rs. 1,950)",
            "priceDelta": 1351
          },
          {
            "id": "size_801933_3",
            "name": "X-Large (Rs. 2,950)",
            "priceDelta": 2351
          },
          {
            "id": "size_801933_4",
            "name": "Mega (Rs. 3,850)",
            "priceDelta": 3251
          }
        ]
      },
      {
        "id": "grp_ad_801933_0",
        "name": "Select Your Stuffed Crust (Medium)",
        "required": false,
        "options": [
          {
            "id": "ad_801933_0_none",
            "name": "Standard (No Extra Add-on)",
            "priceDelta": 0
          },
          {
            "id": "ad_801933_0_0",
            "name": "Add on Diamond Crust",
            "priceDelta": 250
          },
          {
            "id": "ad_801933_0_1",
            "name": "Add on Adana Kabab",
            "priceDelta": 250
          },
          {
            "id": "ad_801933_0_2",
            "name": "Add on Kabab Crust",
            "priceDelta": 250
          },
          {
            "id": "ad_801933_0_3",
            "name": "Add on Cheese Crust",
            "priceDelta": 250
          }
        ]
      },
      {
        "id": "grp_ad_801933_1",
        "name": "Select Your Stuffed Crust (Large)",
        "required": false,
        "options": [
          {
            "id": "ad_801933_1_none",
            "name": "Standard (No Extra Add-on)",
            "priceDelta": 0
          },
          {
            "id": "ad_801933_1_0",
            "name": "Add on Diamond Crust",
            "priceDelta": 350
          },
          {
            "id": "ad_801933_1_1",
            "name": "Add on Adana Kabab",
            "priceDelta": 350
          },
          {
            "id": "ad_801933_1_2",
            "name": "Add on Kabab Crust",
            "priceDelta": 350
          },
          {
            "id": "ad_801933_1_3",
            "name": "Add on Cheese Crust",
            "priceDelta": 350
          }
        ]
      },
      {
        "id": "grp_ad_801933_2",
        "name": "Select Your Stuffed Crust (X Large)",
        "required": false,
        "options": [
          {
            "id": "ad_801933_2_none",
            "name": "Standard (No Extra Add-on)",
            "priceDelta": 0
          },
          {
            "id": "ad_801933_2_0",
            "name": "Add on Diamond Crust",
            "priceDelta": 450
          },
          {
            "id": "ad_801933_2_1",
            "name": "Add on Adana Kabab",
            "priceDelta": 450
          },
          {
            "id": "ad_801933_2_2",
            "name": "Add on Kabab Crust",
            "priceDelta": 450
          },
          {
            "id": "ad_801933_2_3",
            "name": "Add on Cheese Crust",
            "priceDelta": 450
          }
        ]
      }
    ]
  },
  {
    "id": 801946,
    "category": "Classic Pizzas",
    "name": "Veggie Lover",
    "description": "Pizza Sauce Topped With Onions, Capsicum, Mushrooms, Sweet Corn, And Lots Of Cheese.",
    "price": 599,
    "tag": "Classic Flavor",
    "available": true,
    "prepTimeMinutes": 18,
    "imageUrl": "https://assets.indolj.io/upload/1765400539-Veggie Lover_17_11zon.jpg?q=10",
    "modifierGroups": [
      {
        "id": "grp_size_801946",
        "name": "Select Size / Portion",
        "required": true,
        "options": [
          {
            "id": "size_801946_0",
            "name": "Small (Rs. 599)",
            "priceDelta": 0
          },
          {
            "id": "size_801946_1",
            "name": "Medium (Rs. 1,349)",
            "priceDelta": 750
          },
          {
            "id": "size_801946_2",
            "name": "Large (Rs. 1,950)",
            "priceDelta": 1351
          },
          {
            "id": "size_801946_3",
            "name": "X-Large (Rs. 2,950)",
            "priceDelta": 2351
          },
          {
            "id": "size_801946_4",
            "name": "Mega (Rs. 3,850)",
            "priceDelta": 3251
          }
        ]
      },
      {
        "id": "grp_ad_801946_0",
        "name": "Select Your Stuffed Crust (Medium)",
        "required": false,
        "options": [
          {
            "id": "ad_801946_0_none",
            "name": "Standard (No Extra Add-on)",
            "priceDelta": 0
          },
          {
            "id": "ad_801946_0_0",
            "name": "Add on Diamond Crust",
            "priceDelta": 250
          },
          {
            "id": "ad_801946_0_1",
            "name": "Add on Adana Kabab",
            "priceDelta": 250
          },
          {
            "id": "ad_801946_0_2",
            "name": "Add on Kabab Crust",
            "priceDelta": 250
          },
          {
            "id": "ad_801946_0_3",
            "name": "Add on Cheese Crust",
            "priceDelta": 250
          }
        ]
      },
      {
        "id": "grp_ad_801946_1",
        "name": "Select Your Stuffed Crust (Large)",
        "required": false,
        "options": [
          {
            "id": "ad_801946_1_none",
            "name": "Standard (No Extra Add-on)",
            "priceDelta": 0
          },
          {
            "id": "ad_801946_1_0",
            "name": "Add on Diamond Crust",
            "priceDelta": 350
          },
          {
            "id": "ad_801946_1_1",
            "name": "Add on Adana Kabab",
            "priceDelta": 350
          },
          {
            "id": "ad_801946_1_2",
            "name": "Add on Kabab Crust",
            "priceDelta": 350
          },
          {
            "id": "ad_801946_1_3",
            "name": "Add on Cheese Crust",
            "priceDelta": 350
          }
        ]
      },
      {
        "id": "grp_ad_801946_2",
        "name": "Select Your Stuffed Crust (X Large)",
        "required": false,
        "options": [
          {
            "id": "ad_801946_2_none",
            "name": "Standard (No Extra Add-on)",
            "priceDelta": 0
          },
          {
            "id": "ad_801946_2_0",
            "name": "Add on Diamond Crust",
            "priceDelta": 450
          },
          {
            "id": "ad_801946_2_1",
            "name": "Add on Adana Kabab",
            "priceDelta": 450
          },
          {
            "id": "ad_801946_2_2",
            "name": "Add on Kabab Crust",
            "priceDelta": 450
          },
          {
            "id": "ad_801946_2_3",
            "name": "Add on Cheese Crust",
            "priceDelta": 450
          }
        ]
      }
    ]
  },
  {
    "id": 801954,
    "category": "Burgers & Wraps",
    "name": "Thunder Fillet Burger",
    "description": "Crispy, Fried Chicken Fillet With Fresh Lettuce And Creamy Mayo, All Nestled In A Soft, Toasted Bun.",
    "price": 599,
    "tag": "Crispy Burger",
    "available": true,
    "prepTimeMinutes": 12,
    "imageUrl": "https://assets.indolj.io/upload/1765400660-Thunder fillet_36_11zon.jpg?q=10"
  },
  {
    "id": 801955,
    "category": "Burgers & Wraps",
    "name": "Chicken Patty Burger",
    "description": "A Tender, Perfectly Seasoned Chicken Patty, Layered With Crisp Lettuce, And Creamy Mayo, Served In A Soft, Toasted Bun.",
    "price": 449,
    "tag": "Crispy Burger",
    "available": true,
    "prepTimeMinutes": 12,
    "imageUrl": "https://assets.indolj.io/upload/1765400668-Chicken patty burger_5_11zon.jpg?q=10"
  },
  {
    "id": 801956,
    "category": "Burgers & Wraps",
    "name": "Thunder Supreme Burger",
    "description": "A Crispy, Juicy Double Fried Chicken Fillet Topped With Fresh Lettuce, Tomatoes, And Creamy Mayo, All Packed Between A Soft, Toasted Bun.",
    "price": 749,
    "tag": "Crispy Burger",
    "available": true,
    "prepTimeMinutes": 12,
    "imageUrl": "https://assets.indolj.io/upload/1765400674-Thunder Supreme_37_11zon.jpg?q=10"
  },
  {
    "id": 801923,
    "category": "Burgers & Wraps",
    "name": "Tornado Wrap",
    "description": "A crispy, golden-fried zinger fillet wrapped in a soft tortilla, loaded with fresh veggies and drizzled with our signature sauces.",
    "price": 649,
    "tag": "Tortilla Wrap",
    "available": true,
    "prepTimeMinutes": 12,
    "imageUrl": "https://assets.indolj.io/upload/1765400299-Tornado Wrap_38_11zon.jpg?q=10"
  },
  {
    "id": 801924,
    "category": "Burgers & Wraps",
    "name": "Firestorm Wrap",
    "description": "A crispy golden fried zinger fillet wrapped in a soft tortilla, fresh veggies, jalapeno and drizzled with our spicy sauce.",
    "price": 649,
    "tag": "Tortilla Wrap",
    "available": true,
    "prepTimeMinutes": 12,
    "imageUrl": "https://assets.indolj.io/upload/1765400308-Logo_29_11zon.png?q=10"
  },
  {
    "id": 813442,
    "category": "Appetizers",
    "name": "Strip it, Dip it, Love it",
    "description": "5pcs chicken Strips • Fries • Dip sauce • Regular Drink",
    "price": 699,
    "tag": "Starter",
    "available": true,
    "prepTimeMinutes": 12,
    "imageUrl": "https://assets.indolj.io/upload/1770018454-600x600_11zon.png?q=10",
    "modifierGroups": [
      {
        "id": "grp_ad_813442_3",
        "name": "Select Regular Your Drink",
        "required": true,
        "options": [
          {
            "id": "ad_813442_3_0",
            "name": "Pepsi Regular",
            "priceDelta": 0
          },
          {
            "id": "ad_813442_3_1",
            "name": "7up Regular",
            "priceDelta": 0
          }
        ]
      }
    ]
  },
  {
    "id": 801915,
    "category": "Appetizers",
    "name": "Oven Baked Cheesy Sticks",
    "description": "Freshly prepared Oven Baked Cheesy Sticks served hot from the Heat Box kitchen.",
    "price": 599,
    "tag": "Starter",
    "available": true,
    "prepTimeMinutes": 12,
    "imageUrl": "https://assets.indolj.io/upload/1765400177-Oven baked cheesy sticks_31_11zon.jpg?q=10"
  },
  {
    "id": 801916,
    "category": "Appetizers",
    "name": "Calzone Chunks",
    "description": "Full of Flavor in Every Bite.",
    "price": 1099,
    "tag": "Starter",
    "available": true,
    "prepTimeMinutes": 12,
    "imageUrl": "https://assets.indolj.io/upload/1765400197-Calzone Chunks_3_11zon.jpg?q=10"
  },
  {
    "id": 801917,
    "category": "Appetizers",
    "name": "Spin Rolls",
    "description": "4 Pcs",
    "price": 599,
    "tag": "Starter",
    "available": true,
    "prepTimeMinutes": 12,
    "imageUrl": "https://assets.indolj.io/upload/1780154870-Arabic-Spin-Rolls.jpg.jpeg?q=10",
    "modifierGroups": [
      {
        "id": "grp_ad_801917_0",
        "name": "Choose Your Flavor",
        "required": true,
        "options": [
          {
            "id": "ad_801917_0_0",
            "name": "Behari Spin Rolls",
            "priceDelta": 0
          },
          {
            "id": "ad_801917_0_1",
            "name": "Arabic Spin Rolls",
            "priceDelta": 0
          }
        ]
      }
    ]
  },
  {
    "id": 801918,
    "category": "Appetizers",
    "name": "Pizza Fries",
    "description": "Freshly prepared Pizza Fries served hot from the Heat Box kitchen.",
    "price": 899,
    "tag": "Starter",
    "available": true,
    "prepTimeMinutes": 12,
    "imageUrl": "https://assets.indolj.io/upload/1765400224-Pizza Fries_33_11zon.jpg?q=10"
  },
  {
    "id": 801919,
    "category": "Appetizers",
    "name": "Loaded Fries",
    "description": "Indulge in a tantalizing treat with our loaded fries. Crispy golden fries smothered in a medley of cheese, savory bacon, and creamy ranch dressing. Each bite is a burst of flavor that will leave you craving for more.",
    "price": 699,
    "tag": "Starter",
    "available": true,
    "prepTimeMinutes": 12,
    "imageUrl": "https://assets.indolj.io/upload/1780152336-fries.webp?q=10"
  },
  {
    "id": 801920,
    "category": "Appetizers",
    "name": "Hot Wings",
    "description": "Available in 6 Pcs, 12 Pcs sizes. Oven-baked fresh at Heat Box Pizza.",
    "price": 649,
    "tag": "Starter",
    "available": true,
    "prepTimeMinutes": 12,
    "imageUrl": "https://assets.indolj.io/upload/1765400259-Hot wings_27_11zon.jpg?q=10",
    "modifierGroups": [
      {
        "id": "grp_size_801920",
        "name": "Select Size / Portion",
        "required": true,
        "options": [
          {
            "id": "size_801920_0",
            "name": "6 Pcs (Rs. 649)",
            "priceDelta": 0
          },
          {
            "id": "size_801920_1",
            "name": "12 Pcs (Rs. 1,149)",
            "priceDelta": 500
          }
        ]
      }
    ]
  },
  {
    "id": 801921,
    "category": "Appetizers",
    "name": "One Oven Baked Wings",
    "description": "Available in 6 Pcs, 12 Pcs sizes. Oven-baked fresh at Heat Box Pizza.",
    "price": 549,
    "tag": "Starter",
    "available": true,
    "prepTimeMinutes": 12,
    "imageUrl": "https://assets.indolj.io/upload/1765400278-Oven Baked Wings_32_11zon.jpg?q=10",
    "modifierGroups": [
      {
        "id": "grp_size_801921",
        "name": "Select Size / Portion",
        "required": true,
        "options": [
          {
            "id": "size_801921_0",
            "name": "6 Pcs (Rs. 549)",
            "priceDelta": 0
          },
          {
            "id": "size_801921_1",
            "name": "12 Pcs (Rs. 849)",
            "priceDelta": 300
          }
        ]
      },
      {
        "id": "grp_ad_801921_0",
        "name": "Select Your Wings",
        "required": true,
        "options": [
          {
            "id": "ad_801921_0_0",
            "name": "Peri Peri Wings",
            "priceDelta": 0
          },
          {
            "id": "ad_801921_0_1",
            "name": "BBQ Wings",
            "priceDelta": 0
          },
          {
            "id": "ad_801921_0_2",
            "name": "Flaming Wings",
            "priceDelta": 0
          },
          {
            "id": "ad_801921_0_3",
            "name": "Hot Wings",
            "priceDelta": 0
          }
        ]
      },
      {
        "id": "grp_ad_801921_1",
        "name": "Choose Your Wings",
        "required": true,
        "options": [
          {
            "id": "ad_801921_1_0",
            "name": "Peri Peri Wings",
            "priceDelta": 0
          },
          {
            "id": "ad_801921_1_1",
            "name": "BBQ Wings",
            "priceDelta": 0
          },
          {
            "id": "ad_801921_1_2",
            "name": "Flaming Wings",
            "priceDelta": 0
          },
          {
            "id": "ad_801921_1_3",
            "name": "Hot Wings",
            "priceDelta": 0
          }
        ]
      }
    ]
  },
  {
    "id": 801925,
    "category": "Pasta & Platters",
    "name": "Fettuccine Alfredo",
    "description": "Alfredo Pasta Tossed In Creamy White Sauce With Mushrooms And Chicken Chunks.",
    "price": 1099,
    "tag": "Creamy Pasta",
    "available": true,
    "prepTimeMinutes": 12,
    "imageUrl": "https://assets.indolj.io/upload/1765400326-Alfredo Pasta_2_11zon.jpg?q=10"
  },
  {
    "id": 801926,
    "category": "Pasta & Platters",
    "name": "Crunchy Chicken",
    "description": "Yummiest Macaroni Pasta In White Sauce Topped With Crispy Chicken & Cheese.",
    "price": 1049,
    "tag": "Creamy Pasta",
    "available": true,
    "prepTimeMinutes": 12,
    "imageUrl": "https://assets.indolj.io/upload/1765400332-Crunchy Chicken pasta_6_11zon.jpg?q=10"
  },
  {
    "id": 801949,
    "category": "Pasta & Platters",
    "name": "Heat Box Classic Platter",
    "description": "4 Pcs Behari Rolls • 4 Pcs Arabic Rolls • Fries • Dip Sauce",
    "price": 1149,
    "tag": "Sharing Platter",
    "available": true,
    "prepTimeMinutes": 12,
    "imageUrl": "https://assets.indolj.io/upload/1765400609-heatbox classic Platter_24_11zon.jpg?q=10"
  },
  {
    "id": 801950,
    "category": "Pasta & Platters",
    "name": "Heat Box Special Platter",
    "description": "4 Pcs Behari Rolls • 6 Pcs Oven Baked Wings • Fries • Dip Sauce",
    "price": 1149,
    "tag": "Sharing Platter",
    "available": true,
    "prepTimeMinutes": 12,
    "imageUrl": "https://assets.indolj.io/upload/1765400615-HEatbox special platter_26_11zon.jpg?q=10"
  },
  {
    "id": 801951,
    "category": "Pasta & Platters",
    "name": "Mexican Sandwich",
    "description": "Freshly prepared Mexican Sandwich served hot from the Heat Box kitchen.",
    "price": 949,
    "tag": "Sharing Platter",
    "available": true,
    "prepTimeMinutes": 12,
    "imageUrl": "https://assets.indolj.io/upload/1765400632-MExican Sandwich_30_11zon.jpg?q=10"
  },
  {
    "id": 841079,
    "category": "Sides & Dips",
    "name": "Fried Chicken",
    "description": "1 Piece / 3 Pieces",
    "price": 249,
    "tag": "Crispy Side",
    "available": true,
    "prepTimeMinutes": 12,
    "imageUrl": "https://assets.indolj.io/upload/1780154244-CH-PIECE.webp?q=10",
    "modifierGroups": [
      {
        "id": "grp_size_841079",
        "name": "Select Size / Portion",
        "required": true,
        "options": [
          {
            "id": "size_841079_0",
            "name": "1 Pcs (Rs. 249)",
            "priceDelta": 0
          },
          {
            "id": "size_841079_1",
            "name": "3 Pcs (Rs. 599)",
            "priceDelta": 350
          }
        ]
      }
    ]
  },
  {
    "id": 809839,
    "category": "Sides & Dips",
    "name": "Masala Fries",
    "description": "Golden, crispy fries tossed in our signature fiery spice \u0003blend for a bold kick in every bite and served with a \u0003creamy dip to cool the heat.",
    "price": 399,
    "tag": "Crispy Side",
    "available": true,
    "prepTimeMinutes": 12,
    "imageUrl": "https://assets.indolj.io/upload/1767952857-600x600-Productimage.webp?q=10"
  },
  {
    "id": 801957,
    "category": "Sides & Dips",
    "name": "French Fries",
    "description": "Available in Regular, Large sizes. Oven-baked fresh at Heat Box Pizza.",
    "price": 249,
    "tag": "Crispy Side",
    "available": true,
    "prepTimeMinutes": 12,
    "imageUrl": "https://assets.indolj.io/upload/1765400687-Fries_23_11zon.jpg?q=10",
    "modifierGroups": [
      {
        "id": "grp_size_801957",
        "name": "Select Size / Portion",
        "required": true,
        "options": [
          {
            "id": "size_801957_0",
            "name": "Regular (Rs. 249)",
            "priceDelta": 0
          },
          {
            "id": "size_801957_1",
            "name": "Large (Rs. 349)",
            "priceDelta": 100
          }
        ]
      }
    ]
  },
  {
    "id": 801958,
    "category": "Sides & Dips",
    "name": "Chicken Nuggets",
    "description": "5 Pcs",
    "price": 399,
    "tag": "Crispy Side",
    "available": true,
    "prepTimeMinutes": 12,
    "imageUrl": "https://assets.indolj.io/upload/1765400763-Chicken nuggets.jpg?q=10"
  },
  {
    "id": 893515,
    "category": "Sides & Dips",
    "name": "Dip Sauce",
    "description": "Freshly prepared Dip Sauce served hot from the Heat Box kitchen.",
    "price": 100,
    "tag": "Signature Dip",
    "available": true,
    "prepTimeMinutes": 12,
    "imageUrl": "https://assets.indolj.io/upload/1789378012-1785562055-WhatsApp-Image-2026-07-31-at-10-20-11-PM.jpeg?q=10"
  },
  {
    "id": 893516,
    "category": "Sides & Dips",
    "name": "Special Sauce",
    "description": "Freshly prepared Special Sauce served hot from the Heat Box kitchen.",
    "price": 100,
    "tag": "Signature Dip",
    "available": true,
    "prepTimeMinutes": 12,
    "imageUrl": "https://assets.indolj.io/upload/1789378012-1785562055-WhatsApp-Image-2026-07-31-at-10-20-11-PM.jpeg?q=10"
  },
  {
    "id": 893517,
    "category": "Sides & Dips",
    "name": "Peri Peri Sauce",
    "description": "Freshly prepared Peri Peri Sauce served hot from the Heat Box kitchen.",
    "price": 100,
    "tag": "Signature Dip",
    "available": true,
    "prepTimeMinutes": 12,
    "imageUrl": "https://assets.indolj.io/upload/1789378012-1785562055-WhatsApp-Image-2026-07-31-at-10-20-11-PM.jpeg?q=10"
  },
  {
    "id": 893519,
    "category": "Sides & Dips",
    "name": "Pizza Sauce",
    "description": "Freshly prepared Pizza Sauce served hot from the Heat Box kitchen.",
    "price": 100,
    "tag": "Signature Dip",
    "available": true,
    "prepTimeMinutes": 12,
    "imageUrl": "https://assets.indolj.io/upload/1789378012-1785562055-WhatsApp-Image-2026-07-31-at-10-20-11-PM.jpeg?q=10"
  },
  {
    "id": 893520,
    "category": "Sides & Dips",
    "name": "B.B.Q Sauce",
    "description": "Freshly prepared B.B.Q Sauce served hot from the Heat Box kitchen.",
    "price": 100,
    "tag": "Signature Dip",
    "available": true,
    "prepTimeMinutes": 12,
    "imageUrl": "https://assets.indolj.io/upload/1789378012-1785562055-WhatsApp-Image-2026-07-31-at-10-20-11-PM.jpeg?q=10"
  },
  {
    "id": 893522,
    "category": "Sides & Dips",
    "name": "Smokey Sauce",
    "description": "Freshly prepared Smokey Sauce served hot from the Heat Box kitchen.",
    "price": 100,
    "tag": "Signature Dip",
    "available": true,
    "prepTimeMinutes": 12,
    "imageUrl": "https://assets.indolj.io/upload/1789378012-1785562055-WhatsApp-Image-2026-07-31-at-10-20-11-PM.jpeg?q=10"
  },
  {
    "id": 801973,
    "category": "Drinks & Desserts",
    "name": "Molten Lava Cake",
    "description": "With Ice Cream.",
    "price": 450,
    "tag": "Dessert",
    "available": true,
    "prepTimeMinutes": 12,
    "imageUrl": "https://assets.indolj.io/upload/1780155037-moltanlava.jpg.jpeg?q=10"
  },
  {
    "id": 801974,
    "category": "Drinks & Desserts",
    "name": "Soft Drink",
    "description": "Available in 345 ML, 1.5 Litre sizes. Oven-baked fresh at Heat Box Pizza.",
    "price": 129,
    "tag": "Beverage",
    "available": true,
    "prepTimeMinutes": 12,
    "imageUrl": "https://assets.indolj.io/upload/1765464493-1765434054-Soft-Drink.png?q=10",
    "modifierGroups": [
      {
        "id": "grp_size_801974",
        "name": "Select Size / Portion",
        "required": true,
        "options": [
          {
            "id": "size_801974_0",
            "name": "345 ML (Rs. 129)",
            "priceDelta": 0
          },
          {
            "id": "size_801974_1",
            "name": "1.5 Litre (Rs. 249)",
            "priceDelta": 120
          }
        ]
      },
      {
        "id": "grp_ad_801974_0",
        "name": "Select Your Drink 1.5 ltr",
        "required": true,
        "options": [
          {
            "id": "ad_801974_0_0",
            "name": "Pepsi(1.5)",
            "priceDelta": 0
          },
          {
            "id": "ad_801974_0_1",
            "name": "7up(1.5)",
            "priceDelta": 0
          }
        ]
      },
      {
        "id": "grp_ad_801974_1",
        "name": "Select Regular Your Drink",
        "required": true,
        "options": [
          {
            "id": "ad_801974_1_0",
            "name": "Pepsi Regular",
            "priceDelta": 0
          },
          {
            "id": "ad_801974_1_1",
            "name": "7up Regular",
            "priceDelta": 0
          }
        ]
      }
    ]
  },
  {
    "id": 801975,
    "category": "Drinks & Desserts",
    "name": "Mineral Water",
    "description": "Available in Small, Large sizes. Oven-baked fresh at Heat Box Pizza.",
    "price": 99,
    "tag": "Beverage",
    "available": true,
    "prepTimeMinutes": 12,
    "imageUrl": "https://assets.indolj.io/upload/1765400946-water_39_11zon.jpg?q=10",
    "modifierGroups": [
      {
        "id": "grp_size_801975",
        "name": "Select Size / Portion",
        "required": true,
        "options": [
          {
            "id": "size_801975_0",
            "name": "Small (Rs. 99)",
            "priceDelta": 0
          },
          {
            "id": "size_801975_1",
            "name": "Large (Rs. 149)",
            "priceDelta": 50
          }
        ]
      }
    ]
  }
];
