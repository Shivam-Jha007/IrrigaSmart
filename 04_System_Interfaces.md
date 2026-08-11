# 04_System_Interfaces.md

# IrrigaSmart

## System Interface Specification

Version: 1.0

Status: Active

---

# Purpose

This document defines how the different modules of IrrigaSmart communicate with one another.

It specifies the boundaries between the frontend, backend, browser storage, external services, and the decision engine.

The goal is to ensure that each module communicates through stable interfaces rather than direct dependencies.

---

# Design Principles

Every interface should be:

- Predictable
- Stateless where possible
- Versionable
- Easy to test
- Independent of implementation

Changing an implementation should not require changing the interface.

---

# System Communication Overview

```
Frontend
      │
      ▼
Backend API
      │
      ▼
Weather Provider

Frontend
      │
      ▼
IndexedDB

Frontend
      │
      ▼
Decision Engine

Decision Engine
      │
      ▼
Knowledge Base
```

Each connection has a clearly defined responsibility.

---

# Interface 1

Frontend ↔ Backend

Purpose

Exchange application data.

Responsibilities

- Retrieve weather
- Future synchronization
- Future authentication
- Shared datasets

Communication Method

HTTP REST API

Response Format

JSON

---

# Interface 2

Frontend ↔ IndexedDB

Purpose

Persist offline information.

Examples

- Farmer Profile
- Farm Information
- Cached Weather
- Recommendation History
- Application Settings

The UI never accesses IndexedDB directly.

Communication always occurs through the Storage Service.

---

# Interface 3

Frontend ↔ Decision Engine

Purpose

Generate irrigation recommendations.

Input

Validated farm profile

Weather information

Knowledge data

Output

Recommendation object

The Decision Engine never renders UI.

It only returns structured data.

---

# Interface 4

Decision Engine ↔ Knowledge Base

Purpose

Retrieve agricultural reference information.

Examples

- Crop information
- Soil characteristics
- Irrigation efficiency
- Growth stage information

The knowledge base is read-only during MVP.

---

# Interface 5

Backend ↔ Weather Provider

Purpose

Retrieve weather information.

Responsibilities

- Current weather
- Forecast
- Timestamp

Weather providers may change without affecting the frontend.

---

# REST API Overview

The backend exposes the following resources.

---

## Farm

Operations

- Create Farm
- Read Farm
- Update Farm
- Delete Farm

---

## Recommendation

Operations

- Generate Recommendation
- Retrieve Recommendation History

---

## Weather

Operations

- Current Weather
- Forecast Weather

---

## Settings

Operations

- Retrieve Settings
- Update Settings

---

# Request Principles

Every request should:

- Validate input
- Return structured responses
- Include timestamps where appropriate
- Never expose internal implementation details

---

# Response Principles

Every successful response should contain:

- Status
- Data
- Timestamp

Every failed response should contain:

- Status
- Error Code
- Human-readable Message

---

# Error Categories

Possible categories include:

- Validation Error
- Network Error
- Weather Service Error
- Unsupported Crop
- Internal Server Error

Errors should always be actionable.

---

# Versioning Strategy

Future API changes should preserve backward compatibility whenever possible.

Breaking changes should result in a new API version.

---

# Future Interfaces

The architecture should support future integrations including:

- SMS Gateway
- IoT Sensors
- Satellite Data
- Computer Vision Services
- AI Advisory Models

These integrations should connect through dedicated services rather than modifying existing interfaces.

---

# Out of Scope

This document does not define:

- Database schema
- API payload examples
- Authentication
- Authorization
- Internal algorithms

These are covered in separate documents.

---

# Success Criteria

The interface design is considered successful if:

- Modules remain loosely coupled.
- External services can be replaced independently.
- Offline functionality remains isolated.
- The frontend never depends on backend implementation details.
- Future integrations require minimal architectural changes.

---

# Related Documents

- 00_Product_Vision.md
- 01_System_Architecture.md
- 02_Decision_Engine.md
- 03_Data_Models.md
- 07_Engineering_Rules.md