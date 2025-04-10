# SupraMove VS Code Extension

The **SupraMove VS Code Extension** is a tool specifically designed for developers working with the Supra Move framework. It enhances the coding experience by providing syntax highlighting and Intellisense, streamlining the development process and minimizing errors.

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
- Enter an account address to fetch **Resources,** **Modules,** and **Events**dynamically via the Supra REST API.
- View fetched **Resources** categorized in the tray with detailed information like module name, address, and type arguments.
- View fetched **Modules**, displaying their name and address.
- View fetched **Events**, from a dedicated Txn Hash.

### Usage
- Open any `.move` file in VS Code.
- Start coding with features like syntax highlighting and Intellisense automatically enabled.
- Click on Supra logo in white in your Activity Bar to use In-built Explorer.

## Contributing
Contributions are welcome! Whether it’s fixing a bug, enhancing functionality, or adding documentation, your input makes this tool better for everyone.