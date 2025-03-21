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
        supraIndex = {}; // Ensure the extension doesn't break
    }

    // Register IntelliSense provider for "::" trigger
    const provider = vscode.languages.registerCompletionItemProvider('move', {
        provideCompletionItems(document, position) {
            const linePrefix = document.lineAt(position).text.substring(0, position.character);
    
            console.log("Line Prefix:", linePrefix); // Debugging output for entered text
    
            // Handle cases where "use" is present and clean the prefix
            const cleanedPrefix = linePrefix.replace(/use\s+/g, '').trim(); // Remove the 'use' keyword
            console.log("Cleaned Prefix:", cleanedPrefix); // Debugging output for cleaned text
    
            // Extract the namespace if "::" is present
            if (cleanedPrefix.endsWith("::")) {
                const namespace = cleanedPrefix.split("::")[0].trim();
                console.log("Extracted Namespace:", namespace); // Debugging output
    
                const suggestions = supraIndex[namespace];
                if (!suggestions) {
                    console.error(`No items found for namespace: ${namespace}`);
                    vscode.window.showInformationMessage(`No items found for namespace: ${namespace}`);
                    return [];
                }
    
                console.log("Suggestions Found:", Object.keys(suggestions)); // Debugging output for suggestions
    
                return Object.keys(suggestions).map(item => {
                    const completionItem = new vscode.CompletionItem(item, vscode.CompletionItemKind.Module);
                    completionItem.documentation = new vscode.MarkdownString(
                        `**Description:** ${suggestions[item]?.description || "No description available."}`
                    );
                    completionItem.insertText = item; // Insert the selected item
                    return completionItem;
                });
            }
    
            return undefined; // Default case for other inputs
        }
    }, ':'); // ":" is the trigger character
        
    // Add the provider to the context's subscriptions
    context.subscriptions.push(provider);

    // Register function parameter validation (Signature Help)
    const signatureProvider = vscode.languages.registerSignatureHelpProvider('move', {
        provideSignatureHelp(document, position) {
            const lineText = document.lineAt(position).text;
            const functionName = extractFunctionName(lineText); // Custom helper function to parse function name
            const namespace = extractNamespace(lineText); // Custom helper function to parse namespace

            if (namespace && functionName && supraIndex[namespace] && supraIndex[namespace][functionName]) {
                const functionData = supraIndex[namespace][functionName];
                const signature = new vscode.SignatureInformation(
                    `${namespace}::${functionName}(${functionData.params.join(', ')})`
                );
                signature.documentation = functionData.description;
                return {
                    signatures: [signature],
                    activeSignature: 0,
                    activeParameter: 0
                };
            }
            return null;
        }
    }, '(', ',');
    context.subscriptions.push(signatureProvider);

    // Diagnostics for syntax validation
    const diagnostics = vscode.languages.createDiagnosticCollection("move");
    vscode.workspace.onDidSaveTextDocument((document) => {
        if (document.languageId !== "move") return;

        const errors = validateMoveDocument(document.getText()); // Custom validation logic
        const diagnosticList = errors.map(error => {
            return new vscode.Diagnostic(
                new vscode.Range(error.line, error.startCol, error.line, error.endCol),
                error.message,
                vscode.DiagnosticSeverity.Error
            );
        });

        diagnostics.set(document.uri, diagnosticList);
    });
}

// Helper functions to extract namespace and function name
function extractFunctionName(lineText) {
    const match = lineText.match(/::\s*(\w+)\s*\(/);
    return match ? match[1] : null;
}

function extractNamespace(lineText) {
    const match = lineText.match(/(\w+)::/);
    return match ? match[1] : null;
}

// Placeholder for Move validation logic
function validateMoveDocument(text) {
    // Example: Add custom validation for missing or miswritten functions
    // This is just a placeholder. You can implement syntax validation here.
    return [];
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
