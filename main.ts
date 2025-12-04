import { App, Editor, MarkdownView, Notice, Plugin, TFile } from 'obsidian';

// 제거 대상 정규식 패턴
// 1. [cite_start]
// 2. [cite: 로 시작하고 ] 로 끝나는 모든 문자열
const CITE_REGEX = /\[cite_start\]|\[cite:[^\]]*\]/g;

export default class CiteRemoverPlugin extends Plugin {

	async onload() {
		// 명령 1: 현재 열린 파일에서 태그 제거
		this.addCommand({
			id: 'remove-cite-current-file',
			name: 'Remove cite tags from current file',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				const currentText = editor.getValue();
				
				// 정규식 매칭 여부 확인 (불필요한 변경 방지)
				if (!currentText.match(CITE_REGEX)) {
					new Notice('No cite tags found in this file.');
					return;
				}

				// 치환 수행
				const newText = currentText.replace(CITE_REGEX, '');
				editor.setValue(newText);
				new Notice('Cite tags removed from current file.');
			}
		});

		// 명령 2: Vault 전체 파일에서 태그 제거
		this.addCommand({
			id: 'remove-cite-all-files',
			name: 'Remove cite tags from ENTIRE Vault (with backup)',
			callback: async () => {
				// 확인 절차 (실수 방지용)
				if (!confirm('Are you sure you want to remove cite tags from ALL files in the vault? .bak files will be created.')) {
					return;
				}

				const files = this.app.vault.getMarkdownFiles();
				let processedCount = 0;
				let errorCount = 0;

				new Notice(`Processing ${files.length} files...`);

				for (const file of files) {
					try {
						await this.processFile(file);
						processedCount++;
					} catch (e) {
						console.error(`Failed to process ${file.path}`, e);
						errorCount++;
					}
				}

				new Notice(`Complete! Processed: ${processedCount}, Errors: ${errorCount}`);
			}
		});
	}

	// 파일 처리 로직 (읽기 -> 치환 -> 백업 -> 쓰기)
	async processFile(file: TFile) {
		const content = await this.app.vault.read(file);
		
		// 변경사항이 없으면 스킵
		if (!content.match(CITE_REGEX)) {
			return;
		}

		const newContent = content.replace(CITE_REGEX, '');

		// 간단한 백업 생성 (파일명.md.bak)
		// 이미 백업이 존재하면 덮어씌우지 않거나 오류가 날 수 있으므로 try-catch로 감싸거나 무시
		try {
			await this.app.vault.create(file.path + '.bak', content);
		} catch (error) {
			// 백업 파일 생성 실패(이미 존재함 등) 시 콘솔에만 로그 남기고 진행
			console.log(`Backup skipped for ${file.path}: file likely exists.`);
		}

		// 원본 파일 수정
		await this.app.vault.modify(file, newContent);
	}
}