const vscode = require('vscode');
const fs = require('fs');

function activate(context) {
    console.log('Congratulations, your SupraMove Extension is now active!');

    // Load the Supra index from the JSON file
    let supraIndex = {};
    try {
        supraIndex = JSON.parse(fs.readFileSync(context.asAbsolutePath('./supra-index.json'), 'utf8'));
        console.log("Supra index successfully loaded.");
    } catch (error) {
        vscode.window.showErrorMessage("Failed to load supra-index.json: " + error.message);
        supraIndex = {};
    }

    // IntelliSense for "::" triggers (supra_framework and std)
    const namespaceProvider = vscode.languages.registerCompletionItemProvider('move', {
        provideCompletionItems(document, position) {
            const linePrefix = document.lineAt(position).text.substring(0, position.character);

            console.log("Line Prefix:", linePrefix);  

            const cleanedPrefix = linePrefix.replace(/use\s+/g, '').trim();  
            if (cleanedPrefix.endsWith("::")) {
                const namespace = cleanedPrefix.split("::")[0].trim();
                console.log("Extracted Namespace:", namespace);

                const suggestions = supraIndex[namespace];
                if (!suggestions) {
                    console.error(`No items found for namespace: ${namespace}`);
                    vscode.window.showInformationMessage(`No items found for namespace: ${namespace}`);
                    return [];
                }

                console.log("Suggestions Found:", Object.keys(suggestions));
                return Object.keys(suggestions).map(item => {
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
    }, ':');
    context.subscriptions.push(namespaceProvider);

    // IntelliSense for struct attributes
    const structProvider = vscode.languages.registerCompletionItemProvider('move', {
        provideCompletionItems(document, position) {
            const linePrefix = document.lineAt(position).text.substring(0, position.character);

            if (linePrefix.trim().startsWith("struct")) {
                console.log("Struct detected, providing attribute suggestions.");
                const attributes = ["drop", "store", "key", "copy"];
                return attributes.map(attr => {
                    const completionItem = new vscode.CompletionItem(attr, vscode.CompletionItemKind.Keyword);
                    completionItem.documentation = new vscode.MarkdownString(
                        `**Attribute:** \`${attr}\`\n\nThese attributes control how the struct behaves during Move operations.`
                    );
                    return completionItem;
                });
            }
            return undefined;
        }
    }, ' ');
    context.subscriptions.push(structProvider);

    // IntelliSense for std modules (vector, table, etc.)
    const stdProvider = vscode.languages.registerCompletionItemProvider('move', {
        provideCompletionItems(document, position) {
            const linePrefix = document.lineAt(position).text.substring(0, position.character);
    
            console.log("Line Prefix:", linePrefix); 
 
            const cleanedPrefix = linePrefix.replace(/use\s+/g, '').trim();
            if (cleanedPrefix.endsWith("std::")) {
                console.log("Cleaned Prefix for Std:", cleanedPrefix);
                console.log("Std namespace detected, providing dropdown suggestions.");
                const stdSuggestions = supraIndex["std"];
                if (!stdSuggestions) {
                    console.error("No items found for 'std' namespace.");
                    vscode.window.showInformationMessage("No items found for 'std' namespace.");
                    return [];
                }
    
                console.log("Std Suggestions Found:", Object.keys(stdSuggestions));
                return Object.keys(stdSuggestions).map(item => {
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
    }, ':');
    context.subscriptions.push(stdProvider);    
}

function deactivate() {}

// Exports for the extension
module.exports = {
    activate,
    deactivate
};
