
import * as vscode from 'vscode';
import { GitManager } from './gitManager';

export async function pushCommand() {

    const workspace = vscode.workspace.workspaceFolders?.[0];

    if (!workspace) {
        vscode.window.showErrorMessage(
            'Сначала открой папку проекта!'
        );
        return;
    }

    const git = new GitManager(workspace.uri.fsPath);

    try {

        // Проверяем Git-репозиторий 1
        if (!await git.checkRepository()) {
            throw new Error('Папка не является Git-репозиторием.');
        }

        // Получаем удалённые репозитории
        const remotes = await git.getRemotes();

        if (remotes.length === 0) {
            throw new Error('Удалённые репозитории не найдены.');
        }

        // Выбираем remote
        const selectedRemote = await vscode.window.showQuickPick(
            remotes,
            {
                title: 'GitQuickPush',
                placeHolder: 'Выбери удалённый репозиторий'
            }
        );

        if (!selectedRemote) {
            return;
        }

        // Получаем ветки с удалённого сервера
        const remoteBranches = await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'Получение удалённых веток...',
                cancellable: false
            },
            async () => {
                return await git.getRemoteBranches(selectedRemote);
            }
        );

        // Получаем локальные ветки
        const localBranches = await git.getBranches();

        // Объединяем локальные и удалённые ветки
        const allBranches = [...new Set([
            ...remoteBranches,
            ...localBranches
        ])];

        if (allBranches.length === 0) {
            throw new Error('Ветки не найдены.');
        }

        // Получаем текущую ветку
        const currentBranch = await git.getCurrentBranch();

        // Формируем список для выбора
        const branchItems = allBranches.map(branch => ({
            label: branch,
            description: remoteBranches.includes(branch)
                ? 'Удалённая ветка'
                : 'Локальная ветка'
        }));

        // Выбираем ветку
        const selectedBranch = await vscode.window.showQuickPick(
            branchItems,
            {
                title: 'Выбор ветки назначения',
                placeHolder: `Текущая локальная ветка: ${currentBranch}`,
                matchOnDescription: true
            }
        );

        if (!selectedBranch) {
            return;
        }

        // Ввод сообщения коммита
        const commitMessage = await vscode.window.showInputBox({
            title: 'GitQuickPush',
            prompt: 'Введи сообщение коммита',
            placeHolder: 'Например: Added new feature',
            validateInput: value =>
                value.trim().length === 0
                    ? 'Сообщение не может быть пустым!'
                    : null
        });

        if (commitMessage === undefined) {
            return;
        }

        // Получаем изменённые файлы
        const changedFiles = await git.getChangedFiles();

        if (changedFiles.length === 0) {
            vscode.window.showInformationMessage(
                'Нет изменений для отправки.'
            );
            return;
        }

        // Подтверждение отправки
        const confirmation = await vscode.window.showWarningMessage(
            `Отправить изменения?\n\n` +
            `Файлов:\n${changedFiles.join('\n')}\n\n` +
            `Remote: ${selectedRemote}\n` +
            `Ветка назначения: ${selectedBranch.label}\n` +
            `Commit: ${commitMessage}`,
            { modal: true },
            'Отправить',
            'Отмена'
        );

        if (confirmation !== 'Отправить') {
            return;
        }

        // Выполняем Git-команды
        let currentStep = 'Подготовка';

        try {

            await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: 'GitQuickPush',
                    cancellable: false
                },
                async progress => {

                    currentStep = 'Добавление файлов';

                    progress.report({
                        message: 'git add -A'
                    });

                    await git.addChanges();

                    currentStep = 'Создание коммита';

                    progress.report({
                        message: 'git commit'
                    });

                    await git.commit(commitMessage.trim());

                    currentStep = 'Отправка изменений';

                    progress.report({
                        message: 'git push'
                    });

                    await git.push(
                        selectedRemote,
                        selectedBranch.label
                    );

                }
            );

            vscode.window.showInformationMessage(
                `Успешно отправлено в ${selectedRemote}/${selectedBranch.label}!`
            );

        } catch (error) {

            const errorMessage = error instanceof Error
                ? error.message
                : String(error);

            const fullError =
                `Ошибка: ${currentStep}\n\n${errorMessage}`;

            vscode.window.showErrorMessage(
                fullError,
                'Подробнее'
            ).then(action => {

                if (action === 'Подробнее') {
                    vscode.window.showErrorMessage(
                        fullError,
                        { modal: true }
                    );
                }

            });

        }

    } catch (error) {

        const message = error instanceof Error
            ? error.message
            : String(error);

        vscode.window.showErrorMessage(
            `GitQuickPush: ${message}`
        );

    }

}
