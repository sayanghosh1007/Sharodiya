# 🌸 Sharodiya (শারদীয়া) — Kolkata Durga Puja Companion & Parikrama Planner

> **The definitive smart companion, route planner, and cultural guide for Kolkata Durga Puja (UNESCO Intangible Cultural Heritage of Humanity).**

---

## 📖 What is Sharodiya?

**Sharodiya** is an all-in-one digital experience and intelligent parikrama navigation platform crafted specifically for Kolkata's grandest festival — **Durga Puja**. 

Every autumn, Kolkata transforms into the world's largest open-air art gallery with over 3,000 pandals and millions of revelers navigating crowded streets. Sharodiya solves the chaos of pandal hopping by seamlessly uniting **curated festival data, intelligent transit routing, day-specific itinerary planning, iconic culinary discovery, and real-time crowd insights** into an immersive, culturally rich web application.

---

## 🌟 Key Pillars & Features

### 🏛️ 1. 141 Verified Pandals Directory
- Comprehensive database covering **North Kolkata (43)**, **South Kolkata (58)**, **Central Kolkata (20)**, and **Salt Lake / East (20)**.
- Detailed profiles including puja themes, establishment year, awards, crowd status, wheelchair accessibility, and nearest metro stations.
- Instant search, zone filters, and tags (*Traditional*, *Modern Art*, *Grand Scale*, *Eco-Friendly*).

### 🍲 2. 250 Iconic Eateries & Street Food Guide
- Hand-curated directory of 250 authentic Kolkata culinary landmarks complete with genuine, Google-available photos.
- 5 distinct categories: **Kolkata Biryani**, **Kathi Rolls & Mughlai**, **Bengali Sweets & Mishti**, **Heritage & Street Food**, and **Tangra Chinese & Cafes**.
- Late-night festival operating hours (including 24/7 night pujas) and signature dish recommendations.

### 🗺️ 3. Master Interactive Leaflet Puja Map
- High-performance Leaflet.js GIS map with custom neon markers for pandals, food joints, and all **38 Kolkata Metro stations** (Blue and Green lines).
- Turn-by-turn route trail lines connecting planned stops with dynamic road paths and distance/duration calculations.
- Live user geolocation tracking and layer toggle controls.

### 📅 4. Day-Isolated Multi-Plan Parikrama Planner
- Create separate, dedicated itineraries for each day of the festival: **Maha Sasthi**, **Maha Saptami**, **Maha Ashtami**, **Maha Navami**, and **Bijoya Dashami**.
- **Complete Day Isolation**: Selecting a new day opens or creates a clean, dedicated plan without cross-day stop bleeding.
- Drag-and-drop stop reordering, time-slot management, total distance/time estimation, and one-click WhatsApp/clipboard sharing.

### 🤖 5. AI Personalized Itinerary Engine & Companion
- Smart wizard that crafts a bespoke pandal-hopping route based on:
  - **Squad Archetype**: *Friends Squad*, *Family with Kids/Elderly*, *Solo Explorer*, *Heritage Seeker*, or *Foodie Hoppers*.
  - **Time Window**: *Midnight to Dawn*, *Morning Pushpanjali*, *Afternoon*, or *Evening Prime*.
  - **Pace & Culinary Preferences**: *Fast-paced*, *Relaxed*, *Biryani-focused*, *Street Food*, etc.
- Interactive AI chat companion answering cultural questions, rituals, and transit tips.

### 👥 6. Squad Collaboration & Live Check-ins
- Create collaborative squad rooms with 6-digit shareable PINs.
- Real-time squad check-ins showing which friend is at which pandal on the live timeline.

### ⏱️ 7. Real-Time Crowdsource & Queue Tracker
- Community-driven wait time reporting (*Low < 15 min*, *Moderate 15–45 min*, *High 45–90 min*, *Extreme 90+ min*).
- Dynamic crowd badges and rush warnings to help users avoid extreme congestion.

### 🪔 8. 5-Day Ritual & Cultural Schedule
- Complete festival timetable detailing **Pushpanjali**, **Sandhi Puja (108 lotuses & lamps)**, **Kumari Puja**, **Dhunuchi Naach**, **Sindoor Khela**, and **Immersion (Bishorjon)**.

### 🥁 9. Immersive Bengali Sensory Aesthetics
- **Synthesized Dhak Audio Engine**: Authentic festival percussion beats synthesized via Web Audio API.
- **Kash Phool & Sindoor Animations**: Interactive particle canvas effects capturing the autumn spirit of Bengal.
- **Modern Glassmorphism UI**: High-contrast dark theme with glowing saffron and gold accents, and bilingual English & Bengali typography.

---

## 🛠️ Architecture & Tech Stack

```
Sharodiya/
├── data/                  # Curated JSON Datasets
│   ├── pandals.json       # 141 Verified Kolkata Pandals with coordinates & meta
│   ├── eateries.json      # 250 Curated Eateries with authentic photos
│   ├── metro.json         # 38 Metro stations along Blue & Green lines
│   ├── schedule.json      # 5-Day Puja ritual schedule
│   ├── archetypes.json    # Squad personas & recommendation weights
│   └── database.json      # Central database snapshot
├── js/
│   ├── data.js            # Frontend data bridge & constant exports
│   └── app.js             # Core SPA Controller & Reactive State Manager
├── server/
│   ├── server.py          # Native Python 3 Full-Stack Backend & REST API
│   ├── server.js          # Node.js / Express fallback server
│   ├── ai_engine.py       # Recommendation heuristics & AI companion
│   └── routing_engine.py  # Path calculation & transit distance metrics
├── index.html             # Single-Page Application Shell (Tailwind CSS)
└── package.json           # Project metadata & launch scripts
```

### Technology Highlights
- **Frontend**: Vanilla ES6+ JavaScript (zero build step overhead), Tailwind CSS, Leaflet.js, Web Audio API, Canvas 2D.
- **Backend**: Native Python 3 REST Server / Node.js Express server.
- **APIs**: RESTful endpoints for `/api/pandals`, `/api/eateries`, `/api/metro`, `/api/plans`, `/api/schedule`, `/api/squad`, and `/api/ai/companion`.

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+ (or Node.js 18+)

### Running the App
1. Clone the repository and navigate into the folder:
   ```bash
   cd Sharodiya
   ```
2. Start the Python server:
   ```bash
   python server/server.py
   ```
3. Open your browser and visit:
   ```
   http://localhost:3000
   ```

---

## 👥 Target Users
- **Kolkata Residents & Revelers**: Efficiently plan night hopping and avoid peak traffic.
- **Tourists & Non-Residents**: Navigate unfamiliar streets with verified pandal locations and metro links.
- **Food Enthusiasts**: Discover iconic food stops within walking distance of famous pandals.
- **Families & Seniors**: Filter for wheelchair-accessible pandals with shorter queues and daytime schedules.

---

## 📜 License
Developed with ❤️ for the global Bengali community and Durga Puja enthusiasts worldwide.
