const vscode = require("vscode");
const fs = require("fs");

function activate(context) {
  console.log("SupraMove Extension activated!");

  // This will load the Supra index for IntelliSense to show modules and their descriptions.
  let supraIndex = {};
  try {
    supraIndex = JSON.parse(fs.readFileSync(context.asAbsolutePath("./supra-index.json"), "utf8"));
    console.log("Supra index successfully loaded.");
  } catch (error) {
    vscode.window.showErrorMessage("Failed to load supra-index.json: " + error.message);
    supraIndex = {};
  }

  // ----------------------------
  // IntelliSense Providers
  // ----------------------------

  // IntelliSense for "::" triggers to show modules and their descriptions in an autocomplete dropdown for the developers.
  const namespaceProvider = vscode.languages.registerCompletionItemProvider(
    "move",
    {
      provideCompletionItems(document, position) {
        const linePrefix = document.lineAt(position).text.substring(0, position.character);
        const cleanedPrefix = linePrefix.replace(/use\s+/g, "").trim();
        if (cleanedPrefix.endsWith("::")) {
          const namespace = cleanedPrefix.split("::")[0].trim();
          const suggestions = supraIndex[namespace];
          if (!suggestions) {
            vscode.window.showInformationMessage(`No items found for namespace: ${namespace}`);
            return [];
          }
          return Object.keys(suggestions).map((item) => {
            const completionItem = new vscode.CompletionItem(item, vscode.CompletionItemKind.Module);
            const itemData = suggestions[item];
            completionItem.documentation = new vscode.MarkdownString(
              `**Description:** ${itemData?.description || "No description available."}\n\n` +
              `**Example:** \`${itemData?.example_usage || "No example available."}\`\n` +
              (itemData?.reference ? `[More Info](${itemData.reference})` : "")
            );
            completionItem.insertText = item;
            return completionItem;
          });
        }
        return undefined;
      },
    },
    ":"
  );
  context.subscriptions.push(namespaceProvider);

  // IntelliSense for struct attributes that you use to define key, store, drop, and copy in Move language in an autocomplete dropdown as well.
  const structProvider = vscode.languages.registerCompletionItemProvider(
    "move",
    {
      provideCompletionItems(document, position) {
        const linePrefix = document.lineAt(position).text.substring(0, position.character);
        if (linePrefix.trim().startsWith("struct")) {
          const attributes = ["drop", "store", "key", "copy"];
          return attributes.map((attr) => {
            const completionItem = new vscode.CompletionItem(attr, vscode.CompletionItemKind.Keyword);
            completionItem.documentation = new vscode.MarkdownString(
              `**Attribute:** \`${attr}\`\n\nThese attributes control how the struct behaves during Move operations.`
            );
            return completionItem;
          });
        }
        return undefined;
      },
    },
    " "
  );
  context.subscriptions.push(structProvider);

 // IntelliSense for std modules that we will in an dropdown as well for suggestions as vector, string, etc. in move.
  const stdProvider = vscode.languages.registerCompletionItemProvider(
    "move",
    {
      provideCompletionItems(document, position) {
        const linePrefix = document.lineAt(position).text.substring(0, position.character);
        const cleanedPrefix = linePrefix.replace(/use\s+/g, "").trim();
        if (cleanedPrefix.endsWith("std::")) {
          const stdSuggestions = supraIndex["std"];
          if (!stdSuggestions) {
            vscode.window.showInformationMessage("No items found for 'std' namespace.");
            return [];
          }
          return Object.keys(stdSuggestions).map((item) => {
            const completionItem = new vscode.CompletionItem(item, vscode.CompletionItemKind.Module);
            const itemData = stdSuggestions[item];
            completionItem.documentation = new vscode.MarkdownString(
              `**Description:** ${itemData?.description || "No description available."}\n\n` +
              `**Example:** \`${itemData?.example_usage || "No example available."}\`\n`
            );
            completionItem.insertText = item;
            return completionItem;
          });
        }
        return undefined;
      },
    },
    ":"
  );
  context.subscriptions.push(stdProvider);

  // ----------------------------
  // Tree View (Resource Explorer)
  // ----------------------------

  // This below code gets TeeViewContainers approach for our Resource, Module, and Event Classes for our extension's tray view.
  class ResourceTreeItem extends vscode.TreeItem {
    constructor(label, collapsibleState, description, command, tooltip, iconPath, contextValue) {
      super(label, collapsibleState);
      this.description = description;
      this.command = command;
      this.tooltip = tooltip;
      this.iconPath = iconPath;
      this.contextValue = contextValue;
      // We'll use this property to hold the full resource object for later expansion.
      this.details = null;
    }
  }

  class ResourceTreeDataProvider {
    constructor() {
      this._onDidChangeTreeData = new vscode.EventEmitter();
      this.onDidChangeTreeData = this._onDidChangeTreeData.event;
      this.resources = [];
      this.modules = [];
      this.events = [];
      this.address = "";
      this.txnHash = "";
    }

    refresh(address, resources, modules, events) {
      this.address = address;
      this.resources = resources;
      this.modules = modules;
      this.events = events;
      this._onDidChangeTreeData.fire();
    }

    getTreeItem(element) {
      return element;
    }

    async getChildren(element) {
      // If the element is a resource node that was expanded,
      // return its key/value pairs as child nodes.
      if (element && element.contextValue === "resource" && element.details) {
        const details = element.details;
        const children = [];
        for (const key in details) {
          children.push(
            new ResourceTreeItem(
              key,
              vscode.TreeItemCollapsibleState.None,
              JSON.stringify(details[key], null, 2),
              null,
              `Value: ${JSON.stringify(details[key])}`,
              undefined,
              "resourceDetail"
            )
          );
        }
        return children;
      }

      // If no element is provided, return root nodes.
      if (!element) {
        const inputNode = new ResourceTreeItem(
          `Enter Address`,
          vscode.TreeItemCollapsibleState.None,
          "Address to fetch Resources/Modules from",
          {
            command: "resourceExplorer.enterAddress",
            title: "Enter Address",
          },
          "Click to input the account address and fetch resources/modules.",
          new vscode.ThemeIcon("debug-continue"),
          "enterAddress"
        );
        const dividerNode = new ResourceTreeItem(
          ``,
          vscode.TreeItemCollapsibleState.None,
          "---------------",
          null,
          "Separator between Modules/Resources and Transaction Hash Events.",
          null,
          "divider"
        );
        const txnInputNode = new ResourceTreeItem(
          `Enter Txn Hash`,
          vscode.TreeItemCollapsibleState.None,
          "Enter the Txn Hash for fetching Events",
          {
            command: "resourceExplorer.enterTxnHash",
            title: "Enter Transaction Hash",
          },
          "Enter the transaction hash below to explore emitted events.",
          new vscode.ThemeIcon("debug-continue"),
          "enterTxnHash"
        );
        // Define the top-level categories.
        const categories = [
          new ResourceTreeItem("RESOURCES", vscode.TreeItemCollapsibleState.Expanded),
          new ResourceTreeItem("MODULES", vscode.TreeItemCollapsibleState.Expanded),
          new ResourceTreeItem("EVENTS", vscode.TreeItemCollapsibleState.Expanded),
        ];
        return [inputNode, ...categories.slice(0, 2), dividerNode, txnInputNode, categories[2]];
      }

      // Return child nodes for MODULES and EVENTS as before.
      if (element.label === "RESOURCES") {
        // For RESOURCES, create nodes that are expandable.
        return this.resources.map(([resourceType, details]) => {
          let node = new ResourceTreeItem(
            `${details.module}::${details.name}`,
            vscode.TreeItemCollapsibleState.Collapsed, // allow expansion to show details
            `Address: ${details.address}\nType Args: ${details.type_args.map((arg) => JSON.stringify(arg)).join(", ")}`,
            null,
            "Click to view resource details",
            new vscode.ThemeIcon("symbol-property"),
            "resource"
          );
          // Store the full details object for later expansion.
          node.details = details;
          return node;
        });
      }

      if (element.label === "MODULES") {
        return this.modules.map(([moduleType, details]) =>
          new ResourceTreeItem(
            `${details.name}`,
            vscode.TreeItemCollapsibleState.None,
            `Address: ${details.address}`,
            {
              command: "resourceExplorer.openModule",
              title: "Open Module",
              arguments: [moduleType, details],
            },
            "Click to open module details",
            new vscode.ThemeIcon("symbol-class"),
            "module"
          )
        );
      }

      if (element.label === "EVENTS") {
        return this.events.map((event) =>
          new ResourceTreeItem(
            `${event.type}`,
            vscode.TreeItemCollapsibleState.None,
            `Data: ${JSON.stringify(event.data, null, 2)}`,
            {
              command: "resourceExplorer.openEvent",
              title: "View Event",
              arguments: [event],
            },
            "Click to view event details",
            new vscode.ThemeIcon("symbol-event"),
            "event"
          )
        );
      }

      return [];
    }
  }

  const resourceProvider = new ResourceTreeDataProvider();
  vscode.window.createTreeView("resourceExplorer", { treeDataProvider: resourceProvider });

  // ----------------------------
  // API & Data Fetching Functions
  // ----------------------------

  
  // Fetch Modules & Resources by Address using the Supra REST API for fetching modules, you can learn about it from our documentation.
  async function fetchResourcesByAddress(address) {
    const { default: fetch } = await import("node-fetch");
    const response = await fetch(`https://rpc-testnet.supra.com/rpc/v1/accounts/${address}/resources`);
    const data = await response.json();
    return data["Resources"]?.resource || [];
  }

  async function fetchModulesByAddress(address) {
    const { default: fetch } = await import("node-fetch");
    const response = await fetch(`https://rpc-testnet.supra.com/rpc/v1/accounts/${address}/modules`);
    const data = await response.json();
    return data["Modules"]?.modules || [];
  }

  // Fetch Events by Transaction Hash using the get transaction hash API that we have in our extension and then removing events row extracted from the output.
  async function fetchEventsByTxnHash(txnHash) {
    const { default: fetch } = await import("node-fetch");
    const response = await fetch(`https://rpc-testnet.supra.com/rpc/v1/transactions/${txnHash}`);
    const data = await response.json();
    return data.output?.Move?.events || [];
  }

  // ----------------------------
  // Command Registrations
  // ----------------------------

  context.subscriptions.push(
    vscode.commands.registerCommand("resourceExplorer.enterAddress", async () => {
      const address = await vscode.window.showInputBox({ prompt: "Enter an address" });
      if (address) {
        try {
          const [resources, modules] = await Promise.all([
            fetchResourcesByAddress(address),
            fetchModulesByAddress(address),
          ]);
          resourceProvider.refresh(address, resources, modules, resourceProvider.events);
        } catch (error) {
          vscode.window.showErrorMessage("Error fetching resources or modules: " + error.message);
        }
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("resourceExplorer.enterTxnHash", async () => {
      const txnHash = await vscode.window.showInputBox({ prompt: "Enter a transaction hash" });
      if (txnHash) {
        try {
          const events = await fetchEventsByTxnHash(txnHash);
          resourceProvider.refresh(resourceProvider.address, resourceProvider.resources, resourceProvider.modules, events);
        } catch (error) {
          vscode.window.showErrorMessage("Error fetching events: " + error.message);
        }
      }
    })
  );

  // The new behavior: instead of opening an alert for a resource, its node is expandable.
  context.subscriptions.push(
    vscode.commands.registerCommand("resourceExplorer.openModule", (moduleType, details) => {
      vscode.window.showInformationMessage(`Module: ${moduleType}\nDetails: ${JSON.stringify(details, null, 2)}`);
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("resourceExplorer.openEvent", (event) => {
      vscode.window.showInformationMessage(`Event: ${event.type}\nDetails: ${JSON.stringify(event.data, null, 2)}`);
    })
  );
}

function deactivate() {}
module.exports = { activate, deactivate };
