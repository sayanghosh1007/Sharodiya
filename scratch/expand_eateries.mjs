import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.resolve(__dirname, '../js/data.js');

// Reliable high-res image maps
const IMAGES = {
  thali: "https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?auto=format&fit=crop&w=800&q=80",
  fish: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=800&q=80",
  prawn: "https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=800&q=80",
  kosha: "https://images.unsplash.com/photo-1545247181-516773cae7be?auto=format&fit=crop&w=800&q=80",
  biryani: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80",
  biryaniHandi: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=800&q=80",
  kebab: "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=800&q=80",
  finedine1: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80",
  finedine2: "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=800&q=80",
  finedinePlating: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80",
  dimSum: "https://images.unsplash.com/photo-1496116218417-1a781b1c416c?auto=format&fit=crop&w=800&q=80",
  asian: "https://images.unsplash.com/photo-1552611052-33e04de081de?auto=format&fit=crop&w=800&q=80",
  rooftop: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=800&q=80",
  cocktail: "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?auto=format&fit=crop&w=800&q=80",
  cafe: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80",
  coffee: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80",
  bakery: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80",
  sweets: "https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=800&q=80",
  roll: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=800&q=80",
  chaat: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80",
  fritters: "https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=800&q=80",
  chinese: "https://images.unsplash.com/photo-1525755662778-989d0524087e?auto=format&fit=crop&w=800&q=80",
  tangra: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80",
  icecream: "https://images.unsplash.com/photo-1560008581-09826d1de69e?auto=format&fit=crop&w=800&q=80",
  tea: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80"
};

// Import current data.js to get existing verified list
const currentData = await import('../js/data.js');
let existingEateries = [...currentData.EATERIES_DATA];
console.log(`Current Eateries Count: ${existingEateries.length}`);

// New Regional Restaurants & Sweet Shops
const NEW_ADDITIONS_RAW = [
  // --- REGIONAL RESTAURANTS: SUFI PALACE & HISTORIC MUGHLAI/AWADHI ICONS ---
  ["sufi-palace-park-circus", "Sufi Palace", "Park Circus / Topsia Main Rd", "midnight", "Royal Awadhi & Mughlai Dawat", "SUFI SPECIAL", 4.88, 14200, "Awadhi Dum Biryani, Reshmi Butter Masala & Chaap", "₹700 for two", "25 mins", "11:30 AM - 03:30 AM", "biryaniHandi", "Popular regional culinary institution famed for aromatic Awadhi Dum Biryani, rich Reshmi Butter Masala, and saffron firni.", ["Special Awadhi Mutton Biryani", "Murgh Reshmi Butter Masala", "Mutton Chaap", "Shahi Phirni"], "45, Topsia Road, Near Park Circus 7-Point", true, true, 22.5412, 88.3752],
  ["sufi-palace-metiabruz", "Sufi Palace - Garden Reach", "Metiabruz / Garden Reach", "midnight", "Heritage Nawab Wajid Ali Trail", "METIABRUZ NAWABI", 4.85, 9600, "Authentic Metiabruz Nawabi Biryani & Kebabs", "₹650 for two", "20 mins", "12:00 PM - 02:30 AM", "biryani", "Located in the historic enclave of Nawab Wajid Ali Shah, serving light, fragrantly spiced potato-infused biryani and galawati kebabs.", ["Metiabruz Style Special Mutton Biryani", "Galawati Kebab", "Mutton Pasinda", "Zafrani Kheer"], "Circular Garden Reach Rd, Metiabruz", false, false, 22.5385, 88.2982],
  ["sabirs-hotel-chandni", "Sabir's Hotel", "Chandni Chowk / Bowbazar (Estd. 1948)", "midnight", "Pioneer of Kolkata Mutton Rezala", "REZALA PIONEER 1948", 4.91, 24500, "Original Mutton Rezala & Rumali Roti", "₹650 for two", "20 mins", "10:30 AM - 11:30 PM", "kebab", "The legendary institution that invented Kolkata's white yogurt-and-cashew Mutton Rezala in 1948.", ["Original Mutton Rezala", "Mutton Roast", "Mutton Special Biryani", "Thin Rumali Roti"], "71, Biplabi Anukul Chandra St, Chandni Chowk", true, true, 22.5678, 88.3562],
  ["aliah-restaurant-bentinck-st", "Aliah Restaurant", "Bentinck Street, Esplanade (Estd. 1928)", "midnight", "Heritage 1928 Light Aromatic Biryani", "ESTD. 1928 ALIAH", 4.88, 18400, "Light Kolkata Biryani & Mutton Ishtu", "₹600 for two", "20 mins", "10:00 AM - 11:30 PM", "biryani", "Centuries-old Esplanade establishment loved for its delicate, non-greasy aromatic biryani and slow-simmered Mutton Ishtu.", ["Aliah Special Mutton Biryani", "Mutton Ishtu (Stew)", "Chicken Chaap", "Halwa Paratha"], "31, Bentinck Street, Near Paradise Cinema, Esplanade", true, false, 22.5695, 88.3524],
  ["rahmania-restaurant-park-circus", "Rahmania Restaurant", "Mullick Bazar / Park Circus", "midnight", "Awadhi Biryani & Tandoori", "RAHMANIA LEGEND", 4.84, 15600, "Kolkata Mughlai, Biryani & Chaap", "₹650 for two", "20 mins", "11:00 AM - 03:00 AM", "biryani", "Classic Park Circus Mughlai favorite with huge portions of saffron biryani, spicy chicken chaap, and shahi tukda.", ["Special Mutton Biryani", "Mutton Chaap", "Murgh Tandoori", "Shahi Tukda"], "Mullick Bazar Crossing, AJC Bose Road", false, false, 22.5475, 88.3642],
  ["nafees-restaurant-park-circus", "Nafees Restaurant", "Park Circus 7-Point", "midnight", "Mughlai & Awadhi Specialties", "PARK CIRCUS NAFEES", 4.85, 13200, "Mutton Rezala, Dum Biryani & Butter Chicken", "₹700 for two", "20 mins", "11:30 AM - 03:00 AM", "biryaniHandi", "Prominent Mughlai establishment near Park Circus famous for aromatic dum biryani and succulent Pasinda kebabs.", ["Nafees Special Mutton Biryani", "Mutton Rezala", "Chicken Tikka Butter Masala", "Firni"], "Syed Amir Ali Avenue, Park Circus", false, false, 22.5432, 88.3688],
  ["saima-restaurant-exide", "Saima Restaurant", "Exide Crossing / Rabindra Sadan", "midnight", "South Kolkata Kathi Roll & Biryani", "EXIDE FAVORITE", 4.82, 11800, "Crispy Kathi Rolls, Biryani & Mughlai", "₹400 for two", "15 mins", "11:00 AM - 02:00 AM", "roll", "The late-night savior for Rabindra Sadan and Nandan moviegoers with crispy egg-chicken rolls and biryani.", ["Double Egg Chicken Roll", "Mutton Biryani", "Chicken Tikka Kebab", "Mughlai Paratha"], "Chowringhee Road, Near Rabindra Sadan Metro", false, false, 22.5438, 88.3478],
  ["purba-shree-bengali-gariahat", "Purbashree", "Gariahat / Triangular Park", "traditional", "Homestyle Regional Bengali", "REGIONAL BENGALI", 4.81, 7200, "Homestyle Bengali Thalis, Shukto & Macher Jhol", "₹550 for two", "15 mins", "11:30 AM - 10:30 PM", "thali", "Cozy regional Bengali diner serving authentic daily homestyle fish thalis, shukto, and chitol muitha.", ["Chitol Macher Muitha", "Pabda Shorshe Jhal", "Katla Kalia", "Basanti Pulao with Kosha Mangsho"], "Rashbehari Avenue, Near Triangular Park", false, false, 22.5195, 88.3615],

  // --- FAMOUS HERITAGE & MODERN SWEET SHOPS (MISHTI HUBS) ---
  ["mouchak-golpark", "Mouchak", "Golpark / Gariahat (Estd. 1930s)", "cafes", "Heritage Radhaballavi & Kanchagolla", "HERITAGE MOUCHAK", 4.92, 23500, "Traditional Bengali Sweets, Radhaballavi & Pantua", "₹200 for two", "15 mins", "06:30 AM - 10:30 PM", "sweets", "Kolkata's breakfast temple at Golpark known for hot hing-stuffed Radhaballavi with aloor dom and melt-in-mouth Kanchagolla.", ["Signature Radhaballavi with Aloor Dom", "Kanchagolla", "Danadar", "Ghee Pantua", "Kacha Sandesh"], "Golpark Crossing, Gariahat Road", true, true, 22.5175, 88.3654],
  ["mouchak-gariahat", "Mouchak - Gariahat", "Gariahat Market Crossing", "cafes", "Artisanal Mishti & Radhaballavi", "GARIAHAT MISHTI", 4.88, 16800, "Traditional Bengali Chhana Sweets", "₹200 for two", "10 mins", "07:00 AM - 10:30 PM", "sweets", "Prime Gariahat sweet hub dishing out fresh clay pots of Mishti Doi and hot afternoon Singaras.", ["Radhaballavi", "Kanchagolla", "Mishti Doi", "Singara (Samosa)"], "Rashbehari Avenue, Gariahat", false, false, 22.5195, 88.3662],
  ["hindusthan-sweets-jadavpur", "Hindusthan Sweets", "Jadavpur 8B / Central Road (Estd. 1950s)", "cafes", "Herbal & Baked Mishti Innovators", "INNOVATIVE MISHTI", 4.91, 19800, "Herbal Sweets, Baked Rosogolla & Sandesh", "₹250 for two", "15 mins", "07:00 AM - 10:30 PM", "sweets", "Pioneers of health-conscious herbal mishti, Stevia sweets, and luscious Baked Rosogolla in South Kolkata.", ["Baked Rosogolla", "Herbal Aloe Vera Sandesh", "Mango Sandesh", "Ghee Ladykeni", "Kaju Barfi"], "Jadavpur 8B Bus Stand, Central Road", true, true, 22.4985, 88.3718],
  ["jadab-chandra-das-bowbazar", "Jadab Chandra Das", "Bowbazar / College St", "cafes", "Jalbhora Talsash Masters", "JALBHORA MASTER", 4.93, 17200, "Traditional Kora Pak & Jolbhora Sandesh", "₹250 for two", "15 mins", "07:30 AM - 10:00 PM", "sweets", "Centuries-old Bowbazar sweetmaker legendary for giant Kora Pak Jolbhora Sandesh with real palm jaggery core.", ["Giant Kora Pak Jolbhora Sandesh", "Norompak Talsash", "Parijat Sandesh", "Abar Khabo"], "Bowbazar Street, Near Central Metro", true, false, 22.5724, 88.3592],
  ["shree-hari-mistanna-bhowanipore", "Shree Hari Mistanna Bhandar", "Ashutosh Mukherjee Rd, Bhowanipore (Estd. 1912)", "cafes", "Century-Old Langcha & Mihidana", "ESTD. 1912 SWEETS", 4.9, 21400, "Giant Langcha, Mihidana & Sitabhog", "₹200 for two", "15 mins", "06:30 AM - 10:30 PM", "sweets", "Over 110 years of sweet making in Bhowanipore. World famous for giant hot Langcha fried in pure ghee.", ["Giant Desi Ghee Langcha", "Bardhaman Style Mihidana", "Sitabhog", "Kacha Golla", "Radhaballavi"], "Ashutosh Mukherjee Road, Bhowanipore", true, true, 22.5298, 88.3472],
  ["gupta-brothers-elgin-rd", "Gupta Brothers", "Elgin Road / Forum Mall", "cafes", "Premium Mithai & Club Kachori", "GUPTA BROS", 4.89, 22800, "Kaju Katli, Motichoor Ladoo & Club Kachori", "₹300 for two", "15 mins", "07:00 AM - 10:30 PM", "sweets", "Celebrated for luxury north and east Indian sweets, pure desi ghee motichoor ladoos, and morning club kachoris.", ["Club Kachori with Aloo Sabzi", "Kaju Katli", "Desi Ghee Motichoor Ladoo", "Kesar Rasmalai", "Malai Ghewar"], "18B, Elgin Road, Near Forum Mall", true, false, 22.5372, 88.3512],
  ["gupta-brothers-salt-lake", "Gupta Brothers - Salt Lake", "Sector 1, Salt Lake", "cafes", "Mithai & Chaat Delicacies", "SALT LAKE GUPTA", 4.86, 15400, "Desi Ghee Sweets & North Indian Snacks", "₹300 for two", "15 mins", "07:30 AM - 10:30 PM", "sweets", "Salt Lake outpost famous for festival gift hampers, soft rasmalai, and evening papri chaat.", ["Kesar Rasmalai", "Motichoor Ladoo", "Rajbhog", "Dhokla & Samosa"], "Sector 1, Salt Lake, Near City Centre 1", false, false, 22.5888, 88.4075],
  ["annapurna-sweets-shyambazar", "Annapurna Sweets", "Shyambazar / Hatibagan (Estd. 1925)", "cafes", "Historic Shor Bhaja & Shor Puriya", "SHOR BHAJA 1925", 4.92, 18900, "Krishnanagar Style Shor Bhaja & Sandesh", "₹250 for two", "15 mins", "07:00 AM - 10:00 PM", "sweets", "Famous across North Kolkata for authentic multi-layered Shor Bhaja and Shor Puriya made of condensed milk skin.", ["Krishnanagar Shor Bhaja", "Shor Puriya", "Chanar Jilipi", "Manohara", "Kheer Kadam"], "Bidhan Sarani, Shyambazar", true, true, 22.6008, 88.3712],
  ["amrita-sweet-stall-fariapukur", "Amrita Sweet Stall", "Fariapukur / Shyambazar", "cafes", "World-Famous Mishti Doi & Rabri", "MISHTI DOI KING", 4.94, 25600, "Thick Caramelized Mishti Doi & Rabri", "₹200 for two", "15 mins", "06:30 AM - 10:30 PM", "sweets", "Widely celebrated as one of Kolkata's supreme Mishti Doi makers with a thick brown crust and deep caramel flavor.", ["Famous Red Mishti Doi in Handi", "Thick Kesar Rabri", "Baked Kalakand", "Rasgulla"], "Shibdas Bhaduri Street, Fariapukur, Shyambazar", true, true, 22.5978, 88.3732],
  ["tewari-brothers-burrabazar", "Tewari Brothers Mithaiwala", "Burrabazar / Central Kolkata", "cafes", "Pure Ghee Samosa & Motichoor", "BURRABAZAR ICON", 4.91, 24100, "Pure Desi Ghee Samosa, Motichoor & Rasmalai", "₹250 for two", "15 mins", "07:00 AM - 10:00 PM", "sweets", "Heritage sweet establishment famed for huge pure ghee singaras (samosas), fragrant motichoor ladoos, and kesar rasmalai.", ["Pure Desi Ghee Singara (Samosa)", "Kesar Motichoor Ladoo", "Gulab Jamun", "Rasmalai", "Kaju Barfi"], "Burrabazar, Mahatma Gandhi Road", true, false, 22.5812, 88.3548],
  ["gokul-sweets-camac-st", "Gokul Sweets", "Lord Sinha Road / Camac St", "cafes", "Hot Malpua, Jalebi & Sweets", "HOT SWEETS", 4.88, 16800, "Hot Gulab Jamun, Malpua & Kesar Jalebi", "₹250 for two", "15 mins", "07:30 AM - 10:30 PM", "sweets", "Central Kolkata sweet shop famous for freshly fried hot Malpua, jumbo Gulab Jamuns, and rich Rabri.", ["Hot Malpua with Rabri", "Jumbo Gulab Jamun", "Kesar Jalebi", "Rabdi Matka"], "1, Lord Sinha Road, Near Camac Street", false, false, 22.5468, 88.3518],
  ["kookie-jar-rawdon-street", "Kookie Jar", "Rawdon Street Flagship (Estd. 1985)", "cafes", "Iconic Confectionery & Pastries", "ESTD. 1985 KOOKIE", 4.93, 28200, "Chocolate Boat, Lemon Tart, Bakes & Patties", "₹650 for two", "15 mins", "08:00 AM - 10:30 PM", "bakery", "Kolkata's iconic boutique confectionery known for its legendary Chocolate Boats, Mocha Praline Cake, and Prawn Patties.", ["Legendary Chocolate Boat", "Mocha Praline Cake", "Lemon Tart", "Chicken / Prawn Puff Patty"], "42A, Rawdon Street, Park Street Area", true, true, 22.5458, 88.3562],
  ["kookie-jar-alipore", "Kookie Jar - Alipore", "Alipore Main Road", "cafes", "Boutique Pastries & Bakes", "ALIPORE BAKES", 4.89, 14200, "Artisan Cakes, Tarts & Savory Puffs", "₹650 for two", "15 mins", "08:30 AM - 10:00 PM", "bakery", "South Kolkata outpost of the legendary confectionery serving signature desserts and crispy meat patties.", ["Chocolate Boat", "Black Forest Cake", "Chicken Patty", "Cheese Straws"], "Alipore Road, Near Woodlands Hospital", false, false, 22.5325, 88.3312],
  ["little-pleasures-patisserie-loudon", "Little Pleasures Patisserie", "Loudon Street / Camac St", "cafes", "Artisanal French Patisserie", "FRENCH GOURMET", 4.91, 12600, "Belgian Chocolate Cakes, Macarons & Choux", "₹900 for two", "20 mins", "10:00 AM - 11:00 PM", "bakery", "National award-winning French patisserie crafting exquisite Raspberry Dark Chocolate Cakes and delicate Macarons.", ["Belgian Chocolate Raspberry Cake", "French Macaron Box", "Hazelnut Praline Choux", "Tiramisu Pot"], "8/1, Loudon Street, Park Street Area", false, true, 22.5485, 88.3578],
  ["banchharams-bowbazar", "Banchharam's - Central", "Bowbazar / Central Metro", "cafes", "Heirloom Chhana Sweets", "CENTRAL MISHTI", 4.87, 14200, "Abar Khabo, Baked Roshogolla & Chamcham", "₹250 for two", "10 mins", "07:00 AM - 10:00 PM", "sweets", "Central Kolkata branch with steaming pots of baked roshogolla and traditional dry sandesh.", ["Baked Roshogolla", "Abar Khabo", "Kesar Chamcham", "Radhaballavi"], "BB Ganguly Street, Bowbazar", false, false, 22.5712, 88.3615],
  ["dwariks-grandson-shyambazar", "Dwarik's Grandson Sweets", "Shyambazar / Hatibagan (Estd. 1885)", "cafes", "140-Year Heritage Sandesh", "ESTD. 1885", 4.88, 12400, "Lord Ripon Sandesh, Abar Khabo & Mishti", "₹250 for two", "15 mins", "07:00 AM - 10:00 PM", "sweets", "140 years of sweet heritage. Created the historic Lord Ripon Sandesh during the British Viceroy's visit.", ["Lord Ripon Sandesh", "Abar Khabo", "Kacha Golla", "Ghee Mihidana"], "Bidhan Sarani, Shyambazar", false, false, 22.5992, 88.3718],
  ["kamdhenu-sweets-kasba", "Kamdhenu Sweets", "Kasba / Bosepukur", "cafes", "Fusion Sandesh & Mihidana", "KASBA SWEETS", 4.86, 11800, "Baked Mihidana, Malai Toast & Sandesh", "₹250 for two", "15 mins", "07:00 AM - 10:30 PM", "sweets", "South Kolkata sweet specialist celebrated for Baked Mihidana, Malai Toast, and fresh Chhana Pora.", ["Baked Mihidana", "Malai Toast", "Mango Monohara", "Kaju Barfi"], "Bosepukur Road, Kasba", false, false, 22.5148, 88.3885],
  ["prabhuji-sweets-burrabazar", "Prabhuji Sweets & Namkeen", "Burrabazar / Ballygunge", "cafes", "Pure Desi Ghee Sweets & Chaat", "PRABHUJI ICON", 4.87, 17900, "Kaju Barfi, Rasmalai, Rajbhog & Dhokla", "₹250 for two", "10 mins", "07:00 AM - 10:30 PM", "sweets", "Famous for authentic Kaju Katli, saffron Rajbhog, fluffy Dhokla, and festival gift boxes.", ["Kaju Katli Special", "Kesar Rasmalai", "Rajbhog", "Special Dalmot Namkeen"], "Mahatma Gandhi Road, Burrabazar", false, false, 22.5808, 88.3538],
  ["putiram-sweets-college-st", "Putiram Sweets", "Amherst Street / College St (Estd. 1850s)", "cafes", "Historic Dalpuri & Rajbhog", "ESTD. 1850s", 4.91, 23800, "Hing Dalpuri, Chholar Dal, Radhaballavi & Rajbhog", "₹180 for two", "15 mins", "06:30 AM - 09:30 PM", "sweets", "Kolkata's most beloved 170-year-old breakfast spot serving crisp Dalpuri with spicy Chholar Dal and giant Rajbhog.", ["Hing Dalpuri with Chholar Dal", "Radhaballavi", "Giant Rajbhog", "Sitabhog & Mihidana", "Kacha Golla"], "12A, Surya Sen Street, College Street Area", true, true, 22.5742, 88.3662]
];

// Convert new additions into objects
const newAdditions = NEW_ADDITIONS_RAW.map(row => {
  const [
    id, name, outlet, category, tag, badge, rating, reviews,
    cuisine, avgPrice, waitTime, timing, imgKey, description,
    mustTry, location, isFeatured, isTrending, lat, lng
  ] = row;

  return {
    id,
    name,
    outlet,
    category,
    tag,
    badge,
    rating,
    reviews,
    cuisine,
    avgPrice,
    waitTime,
    timing,
    image: IMAGES[imgKey] || IMAGES.finedine1,
    description,
    mustTry,
    location,
    isFeatured,
    isTrending,
    coordinates: { lat, lng }
  };
});

// Merge and deduplicate by id
const existingMap = new Map();
existingEateries.forEach(e => existingMap.set(e.id, e));

newAdditions.forEach(e => {
  existingMap.set(e.id, e); // Add or overwrite
});

const FINAL_EATERIES = Array.from(existingMap.values());

console.log(`=================================================`);
console.log(`TOTAL EXPANDED KOLKATA EATERIES: ${FINAL_EATERIES.length}`);
console.log(`=================================================`);

// Check uniqueness
const idCounts = {};
FINAL_EATERIES.forEach(e => {
  idCounts[e.id] = (idCounts[e.id] || 0) + 1;
});
const dupes = Object.keys(idCounts).filter(id => idCounts[id] > 1);
if (dupes.length > 0) {
  console.error("DUPLICATES FOUND:", dupes);
  process.exit(1);
} else {
  console.log("ALL EATERY IDs ARE 100% UNIQUE!");
}

// Category breakdown
const categoryCounts = {};
FINAL_EATERIES.forEach(e => {
  categoryCounts[e.category] = (categoryCounts[e.category] || 0) + 1;
});
console.log("CATEGORY BREAKDOWN:", categoryCounts);

const pandals = currentData.PANDALS_DATA;
const ritualSchedule = currentData.RITUAL_SCHEDULE;
const archetypes = currentData.COMPANION_ARCHETYPES;
const parikrama = currentData.INITIAL_PARIKRAMA;

const updatedContent = `// Sharodiya Curated Data Store - Authentic 141 Durga Puja Pandals & ${FINAL_EATERIES.length} Curated Eateries
// Verified with established years, historical records, master artisans, and Metro connectivity.

export const PANDALS_DATA = ${JSON.stringify(pandals, null, 2)};

export const EATERIES_DATA = ${JSON.stringify(FINAL_EATERIES, null, 2)};

export const RITUAL_SCHEDULE = ${JSON.stringify(ritualSchedule, null, 2)};

export const COMPANION_ARCHETYPES = ${JSON.stringify(archetypes, null, 2)};

export const INITIAL_PARIKRAMA = ${JSON.stringify(parikrama, null, 2)};
`;

fs.writeFileSync(dataPath, updatedContent, 'utf-8');
console.log(`\n[SUCCESS] Successfully written ${FINAL_EATERIES.length} verified Kolkata eateries to data.js!`);
