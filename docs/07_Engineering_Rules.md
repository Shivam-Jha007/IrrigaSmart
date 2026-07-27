> **Document Role**
>
> This document is part of the IrrigaSmart engineering specification.
> It is intended to be read alongside the other documents in the `/docs` directory.
> If implementation depends on information defined elsewhere, reference the appropriate document instead of making assumptions.

# 07_Engineering_Rules.md

# IrrigaSmart

## Engineering Rules & Development Standards

Version: 1.0

Status: Active

---

# Purpose

This document defines the engineering standards that every contributor and AI coding assistant must follow.

Its purpose is to maintain consistency, readability, scalability, and maintainability throughout the project.

These rules apply to all future development.

---

# Engineering Philosophy

The project should prioritize:

- Simplicity over cleverness.
- Readability over brevity.
- Maintainability over optimization.
- Explicit behavior over hidden behavior.
- Predictability over magic.

Every implementation decision should support long-term maintainability.

---

# General Principles

Always:

- Write self-explanatory code.
- Prefer composition over duplication.
- Keep functions focused on one responsibility.
- Avoid unnecessary abstractions.
- Build only what the current phase requires.

Never implement future features prematurely.

---

# Separation of Concerns

Business logic must never exist inside UI components.

React components should only:

- Display data.
- Handle user interaction.
- Trigger application services.

All calculations belong in dedicated services or the Decision Engine.

---

# Folder Responsibilities

Each folder has one responsibility.

Examples:

- components → reusable UI
- pages → screens
- services → business logic
- storage → IndexedDB
- hooks → reusable logic
- types → shared models
- utils → generic helpers

No folder should contain unrelated responsibilities.

---

# Component Guidelines

Components should:

- Be small.
- Have a single responsibility.
- Receive data through props.
- Avoid direct business calculations.

Large components should be divided into reusable child components.

---

# State Management

Use local state whenever possible.

Shared application state should only exist when multiple components genuinely require it.

Avoid unnecessary global state.

---

# TypeScript Rules

Never use:

- any
- unknown (unless required)

Always define explicit types for:

- API responses
- Decision Engine outputs
- Weather data
- Recommendations
- Farm entities

Type safety is mandatory.

---

# Error Handling

Every operation that can fail must return meaningful feedback.

Never silently ignore errors.

Every error should include:

- What happened.
- Why it happened (if known).
- Suggested next action.

---

# Offline Rules

Offline functionality is a first-class feature.

Never assume internet connectivity.

Whenever possible:

- Read from cache.
- Inform the user.
- Continue operating.

Offline behavior should be intentional, not accidental.

---

# API Rules

Frontend code must never:

- Build URLs manually.
- Parse raw responses throughout the application.

API communication should be centralized in dedicated service modules.

---

# Decision Engine Rules

The Decision Engine must:

- Be deterministic.
- Produce the same output for identical inputs.
- Remain independent of React.
- Remain independent of browser APIs.
- Be independently testable.

---

# Storage Rules

All local storage interactions must pass through the storage layer.

UI components must never communicate directly with IndexedDB.

---

# Naming Conventions

Use:

- PascalCase for components.
- camelCase for variables and functions.
- UPPER_CASE for constants.
- Descriptive names instead of abbreviations.

Avoid cryptic variable names.

---

# Function Design

Functions should:

- Perform one task.
- Return predictable outputs.
- Minimize side effects.
- Remain easy to test.

Prefer several small functions over one large function.

---

# Comments

Comments should explain:

- Why something exists.
- Why a decision was made.

Comments should not explain obvious code.

Good code should be self-documenting.

---

# Logging

Console logging should be used only during development.

Production code should not contain unnecessary logs.

---

# Dependencies

Before adding a dependency, verify:

- It solves a real problem.
- The browser cannot solve it natively.
- Existing project dependencies cannot already solve it.

Avoid dependency bloat.

---

# Code Review Checklist

Before considering work complete, verify:

- No duplicated logic.
- No unused code.
- No dead files.
- No hardcoded values where configuration is appropriate.
- TypeScript passes.
- Linting passes.
- The application builds successfully.

---

# AI Coding Assistant Rules

When generating code, the AI must:

- Follow the active development phase.
- Never implement deferred features.
- Never invent undocumented functionality.
- Follow all specifications exactly.
- Ask for clarification instead of making assumptions when requirements are ambiguous.

The AI should optimize for maintainability rather than speed of generation.

---

# Success Criteria

The engineering standards are successful if:

- The codebase remains consistent.
- New contributors can understand the project quickly.
- AI-generated code integrates without major refactoring.
- Features remain modular and easy to extend.

---

# Related Documents

- 01_System_Architecture.md
- 02_Decision_Engine.md
- 03_Data_Models.md
- 04_System_Interfaces.md
- 06_Development_Roadmap.md