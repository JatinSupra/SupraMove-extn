# Change Log
All notable changes to this project will be documented in this file.

## [2.0.0]

## Features

### 1. Syntax Highlighting
- Comprehensive syntax support for Move language fundamentals.
- Special highlighting for Supra Move-specific syntax, such as `supra_framework` namespaces.
- ***Note:** Yet to have all Supra Framework function def.

### 2. Intellisense
- Auto-complete and suggestions for Supra Move namespaces, functions, and parameters.
- Provides dropdown suggestions for namespaces like `supra_framework::`, `std::`, and others.
- Auto-complete for modules, functions, and attributes from:
   - supra_framework
   - std (e.g., vector, table, borrow_mut)

### 3. In-built Explorer
- Enter an account address to fetch **Resources** and **Modules** and **Events** dynamically via the Supra REST API.
- View fetched **Resources** categorized in the tray with detailed information like module name, address, and type arguments.
- View fetched **Modules**, displaying their name and address.
- View fetched **Events**, from a dedicated Txn Hash.
