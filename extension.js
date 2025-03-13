const vscode = require('vscode');
/**
 * @param {vscode.ExtensionContext} context
 */
const fs = require('fs');

function activate(context) {

	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "supramove-extn" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('supramove-extn.helloWorld', function () {
		// The code you place here will be executed every time your command is executed

		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from SupraMove Extn!') });

	// Load the Supra index from the JSON file
    const supraIndex = JSON.parse(fs.readFileSync(context.asAbsolutePath('./supra-index.json'), 'utf8'));

    // Register the Intellisense provider for Move files
    const provider = vscode.languages.registerCompletionItemProvider('move', {
        provideCompletionItems(document, position) {
            // Get the current namespace/module the user is typing
            const linePrefix = document.lineAt(position).text.substring(0, position.character);
            if (!linePrefix.endsWith("::")) return undefined;

            // Extract suggestions for the namespace/module
            const namespace = linePrefix.split("::")[0].trim();
            const suggestions = supraIndex[namespace] || {};
            

            // Map the suggestions to completion items
            return Object.keys(suggestions).map(fnName => {
                const item = new vscode.CompletionItem(fnName, vscode.CompletionItemKind.Function);
                item.detail = suggestions[fnName].description;
                item.insertText = `${fnName}(${suggestions[fnName].params.join(', ')})`;
                item.documentation = new vscode.MarkdownString(`**Description**: ${suggestions[fnName].description}\n\n**Example**:\n\`\`\`move\n${suggestions[fnName].example_usage}\n\`\`\``);
                return item;
            });
        }
    });

    // Add the provider to the context's subscriptions
    context.subscriptions.push(provider);
	context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};

