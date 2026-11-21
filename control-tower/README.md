# ColdChainX Control Tower | AI Operations Agent Demo

An AI-powered cold-chain operations control tower web application built with **React 19**, **Vite 6**, and **TypeScript**, powered by **Google Gemini 1.5 Flash** (with resilient rule-based operational fallback).

---

## 🌟 Features Implemented (BRD Compliance)

- **FR-1: Fleet Dashboard**: Real-time fleet KPI overview (Active shipments, At-Risk exceptions, Thermal safe, Telemetry frequency) and clickable shipment list with dynamic temperature indicators and status badges.
- **FR-2: Comprehensive Shipment Details**: Detailed view of cargo product, packaging, pulp sensor readings, compressor status, route origin/destination, current geo-waypoint, carrier company, vehicle registration, and one-click driver phone contact.
- **FR-3: Exception Display & Thermal Gauge**: Real-time simulated temperature excursion (+5.6°C above safe maximum for 42 minutes) with visual dual-threshold temperature gauge.
- **FR-4: AI Operations Agent (Server-Side)**:
  - Concise operational summary of the exception.
  - Bulleted relevant shipment facts evaluated (no hallucinations).
  - **Exactly ONE** recommended next operational response.
  - Operational rationale and urgency level (`CRITICAL`, `HIGH`, `LOW`).
  - Strict advisory-only operational guardrails banner.
- **FR-5: Human Decision Controls**: Operator **Approve** and **Dismiss** controls requiring human confirmation before any action is logged.
- **FR-6: Timeline Action Record**: Upon operator approval, the approved recommendation is immediately recorded in the shipment event timeline with an `Action Approved by Operator` badge and timestamp.
- **FR-7: Reset Demo Control**: One-click demo reset button in the header that restores the initial simulated state.
- **🌓 Dark & Light Theme**: High-contrast, theme-switchable UI with custom CSS variables for presentation environments.
- **🔐 Server-Side API Security**: `GEMINI_API_KEY` is kept server-side in `.env` and loaded via Vite server middleware, never exposed to the client bundle.

---

## 🚀 How to Run

The dev server is currently running at:
- **Local:** `http://localhost:5173/`

To start manually at any time:

```bash
cd control-tower
npm run dev
```

To build for production:

```bash
npm run build
```

---

## 🔑 Gemini API Key Configuration

To connect live Google Gemini 1.5 Flash:
1. Get a free API key at [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Add your key to the `.env` file in the root directory:
   ```env
   GEMINI_API_KEY=AIzaSy...
   ```
3. The server automatically detects the key and switches the AI Engine status indicator to `Google Gemini 1.5 Flash`. If no key is set or offline, it gracefully falls back to the local ColdChainX Rule-Based Operations Intelligence Engine.
