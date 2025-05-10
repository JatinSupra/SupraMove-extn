const vscode = require("vscode");
const fs = require("fs");
const axios = require("axios");
const zlib = require("zlib");

function activate(context) {
  console.log("SupraMove Extension activated!");
  let supraIndex = {};
  try {
    supraIndex = JSON.parse(fs.readFileSync(context.asAbsolutePath("./supra-index.json"), "utf8"));
    console.log("Supra index successfully loaded.");
  } catch (error) {
    vscode.window.showErrorMessage("Failed to load supra-index.json: " + error.message);
    supraIndex = {};
  }

  // Provides IntelliSense suggestions when typing namespace (triggered by "::").
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
  // Provides autocomplete for Move struct attributes.
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
  // Provides IntelliSense for standard modules (e.g. std::vector, std::string).
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

  // Tree item class for the explorer.
  class ResourceTreeItem extends vscode.TreeItem {
    constructor(label, collapsibleState, description, command, tooltip, iconPath, contextValue) {
      super(label, collapsibleState);
      this.description = description;
      this.command = command;
      this.tooltip = tooltip;
      this.iconPath = iconPath;
      this.contextValue = contextValue;
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
      // Expand resource node to show its key/value pairs.
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

      // Root nodes: Address input, categories, and Txn Hash input.
      if (!element) {
        const addressInputNode = new ResourceTreeItem(
          `Enter Address`,
          vscode.TreeItemCollapsibleState.None,
          "Address to fetch Resources/Modules from",
          { command: "resourceExplorer.enterAddress", title: "Enter Address" },
          "Click to input the account address and fetch resources/modules.",
          new vscode.ThemeIcon("debug-continue"),
          "enterAddress"
        );
        const dividerNode = new ResourceTreeItem(
          "",
          vscode.TreeItemCollapsibleState.None,
          "---------------",
          null,
          "Separator between sections",
          null,
          "divider"
        );
        const txnInputNode = new ResourceTreeItem(
          `Enter Txn Hash`,
          vscode.TreeItemCollapsibleState.None,
          "Enter the Txn Hash for fetching Events",
          { command: "resourceExplorer.enterTxnHash", title: "Enter Transaction Hash" },
          "Click to enter a transaction hash to explore events.",
          new vscode.ThemeIcon("debug-continue"),
          "enterTxnHash"
        );
        const categories = [
          new ResourceTreeItem("RESOURCES", vscode.TreeItemCollapsibleState.Expanded),
          new ResourceTreeItem("MODULES", vscode.TreeItemCollapsibleState.Expanded),
          new ResourceTreeItem("EVENTS", vscode.TreeItemCollapsibleState.Expanded)
        ];
        return [addressInputNode, categories[0], categories[1], dividerNode, txnInputNode, categories[2]];
      }
        if (element.label === "RESOURCES") {
        return this.resources.map(([resourceType, details]) => {
          let node = new ResourceTreeItem(
            `${details.module}::${details.name}`,
            vscode.TreeItemCollapsibleState.Collapsed,
            `Address: ${details.address}`,
            null,
            "Click to view resource details",
            new vscode.ThemeIcon("folder"),
            "resource"
          );
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
            "Click to open module code",
            new vscode.ThemeIcon("file-code"),
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

  // API & Data Fetching Functions
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
async function fetchEventsByTxnHash(txnHash) {
    const { default: fetch } = await import("node-fetch");
    const response = await fetch(`https://rpc-testnet.supra.com/rpc/v1/transactions/${txnHash}`);
    const data = await response.json();
    // @ts-ignore
    return data.output?.Move?.events || [];
  }
  // Addin this new fetch and decompress module source code from the package registry.
  async function fetchModuleSource(address, moduleName) {
    try {
      const url = `https://rpc-testnet.supra.com/rpc/v1/accounts/${address}/resources/0x1::code::PackageRegistry`;
      const response = await axios.get(url);
      const packages = response.data.result[0].packages;
      for (let pkg of packages) {
        for (let mod of pkg.modules) {
          if (mod.name === moduleName) {
            if (mod.source === "0x") {
              return "No source text published.";
            }
            // need to remove the leading '0x' convert from hex, decompress and convert to string.
            const buffer = Buffer.from(mod.source.substring(2), "hex");
            const sourceText = zlib.gunzipSync(buffer).toString();
            return sourceText;
          }
        }
      }
      return "Module source not found.";
    } catch (err) {
      return `Error fetching module source: ${err.message}`;
    }
  }
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
          vscode.window.showErrorMessage("Error fetching resources/modules: " + error.message);
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
  // this logic fetches the module's source code and opens it in a new editor tab.
  context.subscriptions.push(
    vscode.commands.registerCommand("resourceExplorer.openModule", async (moduleType, details) => {
      const moduleName = details.name;
      const address = details.address;
      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Fetching source code for module: ${moduleName}`,
          cancellable: false,
        },
        async () => {
          const source = await fetchModuleSource(address, moduleName);
          const doc = await vscode.workspace.openTextDocument({
            content: source,
            language: "move",
          });
          vscode.window.showTextDocument(doc, { preview: false });
        }
      );
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
