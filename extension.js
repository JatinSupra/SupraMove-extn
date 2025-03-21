const vscode = require('vscode');
const fs = require('fs');

function activate(context) {
    console.log('Congratulations, your SupraMove Extension is now active!');

    // Load the Supra index from the JSON file
    let supraIndex = {};
    try {
        supraIndex = JSON.parse(fs.readFileSync(context.asAbsolutePath('./supra-index.json'), 'utf8'));
    } catch (error) {
        console.error('Error loading supra-index.json:', error);
    }

    // Register IntelliSense provider for scope-based exploration
    const provider = vscode.languages.registerCompletionItemProvider('move', {
        provideCompletionItems(document, position) {
            const linePrefix = document.lineAt(position).text.substring(0, position.character);

            // Multi-import case (e.g., std::string::{Self, String})
            if (linePrefix.includes("{")) {
                const namespace = linePrefix.split("::{")[0].trim();
                const suggestions = supraIndex[namespace];
                if (!suggestions) return undefined;

                return Object.keys(suggestions).map(item => {
                    const completionItem = new vscode.CompletionItem(item, vscode.CompletionItemKind.EnumMember);
                    completionItem.insertText = `${item}`;
                    completionItem.documentation = suggestions[item].description || "No description available.";
                    return completionItem;
                });
            }

            // Scope operator case (e.g., supra_framework::)
            if (linePrefix.endsWith("::")) {
                const namespace = linePrefix.split("::")[0].trim();
                const suggestions = supraIndex[namespace];
                if (!suggestions) return undefined;

                return Object.keys(suggestions).map(item => {
                    const completionItem = new vscode.CompletionItem(item, vscode.CompletionItemKind.Module);
                    completionItem.documentation = suggestions[item].description || "No description available.";
                    return completionItem;
                });
            }

            return undefined; // Default case
        }
    });

    context.subscriptions.push(provider);

    // Register function parameter validation (Signature Help)
    const signatureProvider = vscode.languages.registerSignatureHelpProvider('move', {
        provideSignatureHelp(document, position) {
            const lineText = document.lineAt(position).text;
            const functionName = extractFunctionName(lineText); // Custom helper function to parse function name
            const namespace = extractNamespace(lineText); // Custom helper function to parse namespace

            if (namespace && functionName && supraIndex[namespace] && supraIndex[namespace][functionName]) {
                const functionData = supraIndex[namespace][functionName];
                const signature = new vscode.SignatureInformation(`${namespace}::${functionName}(${functionData.params.join(', ')})`);
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

function deactivate() {}

// Helper functions to extract namespace and function name (you can refine this further)
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

module.exports = {
    activate,
    deactivate
};