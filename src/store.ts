import { writable } from 'svelte/store';

export class GenerationHistory {
	head: number;
	result_ids: string[];

	constructor() {
		this.head = -1;
		this.result_ids = [];
	}

	remove_future(): GenerationHistory {
		this.result_ids = this.result_ids.slice(0, this.head + 1);
		return this;
	}

	push(id: string): GenerationHistory {
		this.remove_future();
		this.result_ids.push(id);
		this.head = this.result_ids.length - 1;
		return this;
	}

	undo(): GenerationHistory {
		if (this.head >= 0) {
			this.head -= 1;
		}
		return this;
	}

	redo(): GenerationHistory {
		if (this.head < this.result_ids.length - 1) {
			this.head += 1;
		}
		return this;
	}

	past_and_present_ids(): string[] {
		return this.result_ids.slice(0, this.head + 1);
	}

	future_ids(): string[] {
		return this.result_ids.slice(this.head + 1);
	}

	all_ids(): string[] {
		return this.result_ids;
	}

	canUndo(): boolean {
		return this.head >= 0;
	}

	canRedo(): boolean {
		return this.head < this.result_ids.length - 1;
	}
}

export const generation_history = writable<GenerationHistory>(new GenerationHistory());
