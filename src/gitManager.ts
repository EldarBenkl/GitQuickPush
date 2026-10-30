
import { spawn } from 'child_process';

export class GitManager {

    private workspacePath: string;

    constructor(workspacePath: string) {
        this.workspacePath = workspacePath;
    }

    private executeGit(args: string[]): Promise<string> {

        return new Promise((resolve, reject) => {

            const process = spawn('git', args, {
                cwd: this.workspacePath,
                shell: false
            });

            let output = '';
            let errorOutput = '';

            process.stdout.on('data', data => {
                output += data.toString();
            });

            process.stderr.on('data', data => {
                errorOutput += data.toString();
            });

            process.on('error', error => {
                reject(new Error(`Не удалось запустить Git: ${error.message}`));
            });

            process.on('close', code => {

                if (code === 0) {
                    resolve(output.trim());
                } else {
                    reject(new Error(
                        errorOutput.trim() ||
                        output.trim() ||
                        `Git завершился с кодом ${code}`
                    ));
                }

            });

        });
    }

    async checkRepository(): Promise<boolean> {
        try {
            await this.executeGit(['rev-parse', '--is-inside-work-tree']);
            return true;
        } catch {
            return false;
        }
    }

    // Получаем удалённые репозитории
    async getRemotes(): Promise<string[]> {

        const result = await this.executeGit(['remote']);

        return result
            ? result.split(/\r?\n/).filter(Boolean)
            : [];
    }

    // Получаем локальные ветки
    async getBranches(): Promise<string[]> {

        const result = await this.executeGit([
            'for-each-ref',
            '--format=%(refname:short)',
            'refs/heads/'
        ]);

        return result
            ? result.split(/\r?\n/).filter(Boolean)
            : [];
    }

    // Получаем текущую ветку
    async getCurrentBranch(): Promise<string> {

        return await this.executeGit([
            'branch',
            '--show-current'
        ]);
    }

    // Получаем изменённые файлы
    async getChangedFiles(): Promise<string[]> {

        const result = await this.executeGit([
            'status',
            '--short',
            '--untracked-files=all'
        ]);

        return result
            ? result.split(/\r?\n/).filter(Boolean)
            : [];
    }

    // Добавляем изменения
    async addChanges(): Promise<void> {
        await this.executeGit(['add', '-A']);
    }

    // Создаём коммит
    async commit(message: string): Promise<void> {

        await this.executeGit([
            'commit',
            '-m',
            message
        ]);
    }

    // Отправляем изменения
    async push(remote: string, branch: string): Promise<void> {

        await this.executeGit([
            'push',
            remote,
            `HEAD:refs/heads/${branch}`
        ]);
    }

    
    // Получение веток непосредственно с удалённого репозитория
    async getRemoteBranches(remote: string): Promise<string[]> {

        const result = await this.executeGit([
            'ls-remote',
            '--heads',
            remote
        ]);

        if (!result) {
            return [];
        }

        return result
            .split(/\r?\n/)
            .map(line => {
                const parts = line.split('\t');
                return parts[1]?.replace('refs/heads/', '');
            })
            .filter((branch): branch is string => Boolean(branch));
    }


}
