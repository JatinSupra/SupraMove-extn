const vscode = require("vscode");
const fs = require("fs");

function activate(context) {
  console.log("SupraMove Beta Extension activated!");

  // ----------------------------
  // Load Supra Index for IntelliSense
  // ----------------------------
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

  // Provider for namespace autocompletion triggered by "::"
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
      }
    },
    ":"
  );
  context.subscriptions.push(namespaceProvider);

  // Provider for struct attribute autocompletion for Move structs.
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
      }
    },
    " "
  );
  context.subscriptions.push(structProvider);

  // Provider for std module autocompletion ("std::")
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
      }
    },
    ":"
  );
  context.subscriptions.push(stdProvider);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
};
