/* tslint:disable */
/* eslint-disable */

export function add_commit_to_session(handle: bigint, commit_json: string): void;

export function create_empty_profile(): string;

export function end_session(handle: bigint): string;

export function export_heatmap_svg(profile_json: string, weeks: number): string;

export function export_json(profile_json: string, options_json: string): string;

export function export_markdown(profile_json: string, options_json: string): string;

export function generate_badge_svg(profile_json: string): string;

export function generate_badge_url(profile_json: string): string;

export function generate_heatmap(profile_json: string, weeks: number): string;

export function generate_hourly_distribution(profile_json: string): string;

export function generate_language_breakdown(profile_json: string): string;

export function get_active_session_stats(handle: bigint): string;

export function get_commit_correlations(profile_json: string): string;

export function get_current_streak(profile_json: string): number;

export function get_daily_aggregates(profile_json: string, days: number): string;

export function get_longest_streak(profile_json: string): number;

export function get_profile_stats(profile_json: string): string;

export function greet(): string;

export function init_session(): bigint;

export function mark_idle(handle: bigint): void;

export function record_file_edit(handle: bigint, file_path: string, language: string): void;

export function record_keystroke(handle: bigint): void;

export function resume_from_idle(handle: bigint): void;

export function save_session_to_profile(profile_json: string, session_json: string): string;

export function serialize_session(handle: bigint): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly add_commit_to_session: (a: bigint, b: number, c: number) => void;
  readonly create_empty_profile: () => [number, number];
  readonly end_session: (a: bigint) => [number, number];
  readonly export_heatmap_svg: (a: number, b: number, c: number) => [number, number];
  readonly export_json: (a: number, b: number, c: number, d: number) => [number, number];
  readonly export_markdown: (a: number, b: number, c: number, d: number) => [number, number];
  readonly generate_badge_svg: (a: number, b: number) => [number, number];
  readonly generate_badge_url: (a: number, b: number) => [number, number];
  readonly generate_heatmap: (a: number, b: number, c: number) => [number, number];
  readonly generate_hourly_distribution: (a: number, b: number) => [number, number];
  readonly generate_language_breakdown: (a: number, b: number) => [number, number];
  readonly get_active_session_stats: (a: bigint) => [number, number];
  readonly get_commit_correlations: (a: number, b: number) => [number, number];
  readonly get_current_streak: (a: number, b: number) => number;
  readonly get_daily_aggregates: (a: number, b: number, c: number) => [number, number];
  readonly get_longest_streak: (a: number, b: number) => number;
  readonly get_profile_stats: (a: number, b: number) => [number, number];
  readonly greet: () => [number, number];
  readonly init_session: () => bigint;
  readonly mark_idle: (a: bigint) => void;
  readonly record_file_edit: (a: bigint, b: number, c: number, d: number, e: number) => void;
  readonly record_keystroke: (a: bigint) => void;
  readonly resume_from_idle: (a: bigint) => void;
  readonly save_session_to_profile: (a: number, b: number, c: number, d: number) => [number, number];
  readonly serialize_session: (a: bigint) => [number, number];
  readonly __wbindgen_exn_store: (a: number) => void;
  readonly __externref_table_alloc: () => number;
  readonly __wbindgen_externrefs: WebAssembly.Table;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
