import * as vscode from 'vscode';
import { pushCommand } from './pushCommand';

export function activate(context: vscode.ExtensionContext) {

    console.log('GitQuickPush: activate() вызвана!');

    const disposable = vscode.commands.registerCommand(
        'gitquickpush.push',
        async () => {
            console.log('GitQuickPush: команда push вызвана!');

            try {
                await pushCommand();
                console.log('GitQuickPush: команда завершена!');
            } catch (error) {
                console.error('GitQuickPush ERROR:', error);
                vscode.window.showErrorMessage(String(error));
            }
        }
    );

    const statusBarButton = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left,
        100
    );

    statusBarButton.text = '$(cloud-upload) GitQuickPush';
    statusBarButton.tooltip = 'Отправить изменения в Git';
    statusBarButton.command = 'gitquickpush.push';
    statusBarButton.show();

    context.subscriptions.push(disposable, statusBarButton);
}

export function deactivate() {}
