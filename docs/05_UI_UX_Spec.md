> **Document Role**
>
> This document is part of the IrrigaSmart engineering specification.
> It is intended to be read alongside the other documents in the `/docs` directory.
> If implementation depends on information defined elsewhere, reference the appropriate document instead of making assumptions.
# 05_UI_UX_Spec.md

# IrrigaSmart

## User Experience & Interface Specification

Version: 1.0

Status: Active

---

# Purpose

This document defines how users interact with IrrigaSmart.

The focus is not visual styling but creating a simple, intuitive, and trustworthy experience that helps farmers make irrigation decisions quickly.

Every screen should reduce cognitive effort and guide users toward informed decisions.

---

# Design Goals

The interface should be:

- Simple
- Calm
- Readable
- Fast
- Mobile-first
- Offline-friendly

The application should require minimal learning before first use.

---

# Primary User Journey

The primary workflow is:

```

Open App

↓

Today's Recommendation

↓

Read Explanation

↓

Decide Whether to Irrigate

↓

Close App

```

Everything else supports this journey.

---

# Secondary User Journey

Setting up a new farm.

```

Open App

↓

Create Farmer Profile

↓

Add Farm

↓

Select Crop

↓

Select Soil

↓

Choose Irrigation Method

↓

Save

↓

Receive Recommendation

```

The setup process should be completed within a few minutes.

---

# Navigation

The application should use simple bottom navigation.

Tabs include:

- Dashboard
- Farms
- Fertilizer
- Settings

Navigation should always remain visible.

Post-MVP amendment (V2.2): the **History tab was removed** — farmers did not use the record list. History records are still written on every recommendation and still feed the farm cards and the once-a-day recommendation guard; only the browsing screen is gone. The Fertilizer tab (soil-test-based dosing) was added in its place.

---

# Dashboard

Purpose

Answer today's irrigation question immediately.

Contents

- Greeting
- Farm Selector
- Today's Recommendation
- Weather Summary
- Explanation
- Confidence Level

The recommendation should be the most visually prominent element.

---

# Farmer Profile Screen

Purpose

Manage user information.

Capabilities

- View profile
- Edit profile
- Preferred language
- Phone number (future)

---

# Farm Management

Purpose

Create and manage farms.

Capabilities

- Add farm
- Edit farm
- Delete farm
- Change crop
- Update irrigation method

---

# History Screen

Removed in V2.2: the History tab and its browsing screen no longer exist (see Navigation). The underlying history records continue to be stored — they feed the dashboard's farm cards and prevent duplicate same-day recommendations — and the screen can be restored from them if record browsing is ever wanted again.

---

# Settings

Purpose

Allow users to personalize the application.

Options

- Language
- Measurement Units
- Offline Preferences
- Notification Preferences (future)

---

# Recommendation Card

The Recommendation Card is the most important component.

It should always display:

- Irrigation Status
- Recommended Time
- Estimated Water Amount
- Confidence Level
- Explanation

Users should never need to navigate elsewhere to understand today's recommendation.

---

# Weather Summary

The weather section should display only information relevant to irrigation.

Examples:

- Temperature
- Rainfall Forecast
- Humidity

Avoid displaying unnecessary meteorological data.

---

# Error Experience

The application should never leave users without guidance.

Instead of:

"Error"

Display:

"Unable to retrieve the latest weather. Using your most recent cached weather information."

Every error should explain:

- What happened
- What the application did
- What the user can do next

---

# Offline Experience

When offline:

- Continue showing cached recommendations.
- Continue displaying farm data.
- Clearly indicate offline status.
- Avoid blocking the user.

Offline should feel like a degraded experience, not a broken application.

---

# Accessibility

The interface should support:

- Large touch targets
- Readable typography
- High contrast
- Simple language
- Minimal technical terminology

---

# Design Philosophy

The interface should answer one question first:

"What should I do today?"

Everything else is secondary.

---

# Success Criteria

The UI is successful if a farmer can:

- Understand today's recommendation within one minute.
- Complete profile setup without assistance.
- Continue using the application without internet.
- Navigate every major feature intuitively.

---

# Related Documents

- 00_Product_Vision.md
- 01_System_Architecture.md
- 02_Decision_Engine.md
- 03_Data_Models.md
- 04_System_Interfaces.md